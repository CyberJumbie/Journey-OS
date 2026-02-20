/**
 * Course Service — business logic + DualWrite orchestration.
 * [STORY-F-1] Supabase first, Neo4j second, neo4j_id tracked.
 */

import type { Driver } from "neo4j-driver";
import type {
  CourseDTO,
  CreateCourseRequest,
  UpdateCourseRequest,
  CourseListQuery,
  CourseListResponse,
} from "@journey-os/types";
import { VALID_COURSE_TYPES, VALID_COURSE_STATUSES } from "@journey-os/types";
import {
  CourseNotFoundError,
  DuplicateCourseCodeError,
  InvalidCourseTypeError,
  InvalidCourseStatusError,
} from "../../errors";
import type { CourseRepository } from "../../repositories/course.repository";
import { CourseModel } from "../../models/course.model";

export class CourseService {
  readonly #repository: CourseRepository;
  readonly #neo4jDriver: Driver | null;

  constructor(repository: CourseRepository, neo4jDriver: Driver | null = null) {
    this.#repository = repository;
    this.#neo4jDriver = neo4jDriver;
  }

  async create(request: CreateCourseRequest): Promise<CourseDTO> {
    if (
      request.course_type &&
      !VALID_COURSE_TYPES.includes(request.course_type)
    ) {
      throw new InvalidCourseTypeError(request.course_type);
    }

    const exists = await this.#repository.existsByCode(request.code);
    if (exists) {
      throw new DuplicateCourseCodeError(request.code);
    }

    const course = await this.#repository.create(request);

    await this.#tryNeo4jCreate(course);

    return course;
  }

  async findById(id: string): Promise<CourseDTO> {
    const row = await this.#repository.findById(id);
    if (!row) {
      throw new CourseNotFoundError(id);
    }
    const model = CourseModel.fromRow(
      row as unknown as Record<string, unknown>,
    );
    return model.toDTO();
  }

  async findByCode(code: string): Promise<CourseDTO> {
    const row = await this.#repository.findByCode(code);
    if (!row) {
      throw new CourseNotFoundError(code);
    }
    const model = CourseModel.fromRow(
      row as unknown as Record<string, unknown>,
    );
    return model.toDTO();
  }

  async list(query: CourseListQuery): Promise<CourseListResponse> {
    return this.#repository.list(query);
  }

  async update(id: string, request: UpdateCourseRequest): Promise<CourseDTO> {
    if (
      request.course_type &&
      !VALID_COURSE_TYPES.includes(request.course_type)
    ) {
      throw new InvalidCourseTypeError(request.course_type);
    }

    if (request.status && !VALID_COURSE_STATUSES.includes(request.status)) {
      throw new InvalidCourseStatusError(request.status);
    }

    const updated = await this.#repository.update(id, request);

    await this.#tryNeo4jUpdate(updated);

    return updated;
  }

  async archive(id: string): Promise<void> {
    const existing = await this.#repository.findById(id);
    if (!existing) {
      throw new CourseNotFoundError(id);
    }

    await this.#repository.archive(id);

    await this.#tryNeo4jArchive(id);
  }

  async #tryNeo4jCreate(course: CourseDTO): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      const result = await session.run(
        `CREATE (c:Course {
           id: $id,
           code: $code,
           name: $name,
           description: $description,
           status: $status
         })
         RETURN elementId(c) AS nodeId`,
        {
          id: course.id,
          code: course.code,
          name: course.name,
          description: course.description ?? "",
          status: course.status,
        },
      );

      const nodeId = result.records[0]?.get("nodeId") as string | undefined;
      await this.#updateNeo4jId(course.id, nodeId ?? null);
    } catch (error: unknown) {
      console.warn(
        `[CourseService] Neo4j DualWrite failed for Course ${course.id}:`,
        error,
      );
      await this.#updateNeo4jId(course.id, null);
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jUpdate(course: CourseDTO): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(
        `MATCH (c:Course {id: $id})
         SET c.name = $name, c.description = $description,
             c.status = $status`,
        {
          id: course.id,
          name: course.name,
          description: course.description ?? "",
          status: course.status,
        },
      );
    } catch (error: unknown) {
      console.warn(
        `[CourseService] Neo4j DualWrite update failed for Course ${course.id}:`,
        error,
      );
    } finally {
      await session.close();
    }
  }

  async #tryNeo4jArchive(id: string): Promise<void> {
    if (!this.#neo4jDriver) return;

    const session = this.#neo4jDriver.session();
    try {
      await session.run(
        `MATCH (c:Course {id: $id}) SET c.status = 'archived'`,
        { id },
      );
    } catch (error: unknown) {
      console.warn(
        `[CourseService] Neo4j DualWrite archive failed for Course ${id}:`,
        error,
      );
    } finally {
      await session.close();
    }
  }

  async #updateNeo4jId(id: string, neo4jId: string | null): Promise<void> {
    try {
      await this.#repository.updateNeo4jId(id, neo4jId);
    } catch {
      console.warn(
        `[CourseService] Failed to update neo4j_id for Course ${id}`,
      );
    }
  }
}
