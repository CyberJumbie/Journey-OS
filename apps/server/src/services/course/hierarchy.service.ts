/**
 * Hierarchy Service — business logic + DualWrite orchestration.
 * [STORY-F-11] Programs, Sections, Sessions with Neo4j relationships.
 */

import type { Driver } from "neo4j-driver";
import type {
  Program,
  Section,
  Session,
  CreateProgramRequest,
  CreateSectionRequest,
  CreateSessionRequest,
  CourseHierarchy,
  SectionWithSessions,
} from "@journey-os/types";
import { VALID_DAYS_OF_WEEK } from "@journey-os/types";
import {
  HierarchyNotFoundError,
  HierarchyValidationError,
  DuplicateProgramCodeError,
} from "../../errors";
import type { ProgramRepository } from "../../repositories/program.repository";
import type { SectionRepository } from "../../repositories/section.repository";
import type { SessionRepository } from "../../repositories/session.repository";
import type { CourseRepository } from "../../repositories/course.repository";

export class HierarchyService {
  readonly #programRepo: ProgramRepository;
  readonly #sectionRepo: SectionRepository;
  readonly #sessionRepo: SessionRepository;
  readonly #courseRepo: CourseRepository;
  readonly #neo4jDriver: Driver | null;

  constructor(
    programRepo: ProgramRepository,
    sectionRepo: SectionRepository,
    sessionRepo: SessionRepository,
    courseRepo: CourseRepository,
    neo4jDriver: Driver | null = null,
  ) {
    this.#programRepo = programRepo;
    this.#sectionRepo = sectionRepo;
    this.#sessionRepo = sessionRepo;
    this.#courseRepo = courseRepo;
    this.#neo4jDriver = neo4jDriver;
  }

  async createProgram(request: CreateProgramRequest): Promise<Program> {
    if (!request.institution_id || !request.name || !request.code) {
      throw new HierarchyValidationError(
        "Missing required fields: institution_id, name, code",
      );
    }

    const exists = await this.#programRepo.existsByCode(
      request.institution_id,
      request.code,
    );
    if (exists) {
      throw new DuplicateProgramCodeError(request.code);
    }

    const program = await this.#programRepo.create(request);

    await this.#tryNeo4jCreateProgram(program);

    return program;
  }

  async createSection(
    courseId: string,
    request: Omit<CreateSectionRequest, "course_id">,
  ): Promise<Section> {
    if (!request.title) {
      throw new HierarchyValidationError("Missing required field: title");
    }

    const course = await this.#courseRepo.findById(courseId);
    if (!course) {
      throw new HierarchyNotFoundError(`Course not found: ${courseId}`);
    }

    let position = request.position;
    if (position === undefined) {
      const maxPos = await this.#sectionRepo.getMaxPosition(courseId);
      position = maxPos + 1;
    }

    const section = await this.#sectionRepo.create({
      course_id: courseId,
      title: request.title,
      description: request.description,
      position,
    });

    await this.#tryNeo4jCreateSection(section, courseId);

    return section;
  }

  async createSession(
    sectionId: string,
    request: Omit<CreateSessionRequest, "section_id">,
  ): Promise<Session> {
    if (
      !request.title ||
      !request.day_of_week ||
      !request.start_time ||
      !request.end_time ||
      request.week_number === undefined
    ) {
      throw new HierarchyValidationError(
        "Missing required fields: title, week_number, day_of_week, start_time, end_time",
      );
    }

    if (
      !VALID_DAYS_OF_WEEK.includes(
        request.day_of_week as (typeof VALID_DAYS_OF_WEEK)[number],
      )
    ) {
      throw new HierarchyValidationError(
        `Invalid day_of_week: ${request.day_of_week}`,
      );
    }

    if (request.end_time <= request.start_time) {
      throw new HierarchyValidationError("end_time must be after start_time");
    }

    const section = await this.#sectionRepo.findById(sectionId);
    if (!section) {
      throw new HierarchyNotFoundError(`Section not found: ${sectionId}`);
    }

    const session = await this.#sessionRepo.create({
      section_id: sectionId,
      title: request.title,
      description: request.description,
      week_number: request.week_number,
      day_of_week: request.day_of_week,
      start_time: request.start_time,
      end_time: request.end_time,
    });

    await this.#tryNeo4jCreateSession(session, sectionId);

    return session;
  }

  async getCourseHierarchy(courseId: string): Promise<CourseHierarchy> {
    const course = await this.#courseRepo.findById(courseId);
    if (!course) {
      throw new HierarchyNotFoundError(`Course not found: ${courseId}`);
    }

    const sections = await this.#sectionRepo.findByCourseId(courseId);

    const sectionsWithSessions: SectionWithSessions[] = await Promise.all(
      sections.map(async (section) => {
        const sessions = await this.#sessionRepo.findBySectionId(section.id);
        return {
          id: section.id,
          title: section.title,
          description: section.description,
          position: section.position,
          sessions,
        };
      }),
    );

    return {
      course_id: course.id,
      course_name: course.name,
      course_code: course.code,
      sections: sectionsWithSessions,
    };
  }

  async reorderSections(
    courseId: string,
    sectionIds: string[],
  ): Promise<number> {
    const course = await this.#courseRepo.findById(courseId);
    if (!course) {
      throw new HierarchyNotFoundError(`Course not found: ${courseId}`);
    }

    const existingSections = await this.#sectionRepo.findByCourseId(courseId);
    const existingIds = new Set(existingSections.map((s) => s.id));

    for (const id of sectionIds) {
      if (!existingIds.has(id)) {
        throw new HierarchyValidationError(
          `Section ${id} does not belong to course ${courseId}`,
        );
      }
    }

    return this.#sectionRepo.reorderSections(courseId, sectionIds);
  }

  async #tryNeo4jCreateProgram(program: Program): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(
        `CREATE (p:Program {
           id: $id,
           institution_id: $institution_id,
           name: $name,
           code: $code
         })`,
        {
          id: program.id,
          institution_id: program.institution_id,
          name: program.name,
          code: program.code,
        },
      );
      await this.#programRepo.updateSyncStatus(program.id, "synced");
    } catch (error: unknown) {
      console.warn(
        `[HierarchyService] Neo4j DualWrite failed for Program ${program.id}:`,
        error,
      );
      await this.#programRepo.updateSyncStatus(program.id, "failed");
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jCreateSection(
    section: Section,
    courseId: string,
  ): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(
        `CREATE (s:Section {
           id: $id,
           course_id: $course_id,
           title: $title,
           position: $position
         })
         WITH s
         MATCH (c:Course {id: $course_id})
         CREATE (c)-[:HAS_SECTION]->(s)`,
        {
          id: section.id,
          course_id: courseId,
          title: section.title,
          position: section.position,
        },
      );
      await this.#sectionRepo.updateSyncStatus(section.id, "synced");
    } catch (error: unknown) {
      console.warn(
        `[HierarchyService] Neo4j DualWrite failed for Section ${section.id}:`,
        error,
      );
      await this.#sectionRepo.updateSyncStatus(section.id, "failed");
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jCreateSession(
    createdSession: Session,
    sectionId: string,
  ): Promise<void> {
    if (!this.#neo4jDriver) return;

    const neo4jSession = this.#neo4jDriver.session();
    try {
      await neo4jSession.run(
        `CREATE (sess:Session {
           id: $id,
           section_id: $section_id,
           title: $title,
           week_number: $week_number,
           day_of_week: $day_of_week,
           start_time: $start_time,
           end_time: $end_time
         })
         WITH sess
         MATCH (s:Section {id: $section_id})
         CREATE (s)-[:HAS_SESSION]->(sess)`,
        {
          id: createdSession.id,
          section_id: sectionId,
          title: createdSession.title,
          week_number: createdSession.week_number,
          day_of_week: createdSession.day_of_week,
          start_time: createdSession.start_time,
          end_time: createdSession.end_time,
        },
      );
      await this.#sessionRepo.updateSyncStatus(createdSession.id, "synced");
    } catch (error: unknown) {
      console.warn(
        `[HierarchyService] Neo4j DualWrite failed for Session ${createdSession.id}:`,
        error,
      );
      await this.#sessionRepo.updateSyncStatus(createdSession.id, "failed");
    } finally {
      await neo4jSession.close();
    }
  }
}
