/**
 * Course View Service — enriched read-only views for list and detail pages.
 * [STORY-F-13] Composes CourseRepository + HierarchyService for rich responses.
 */

import type {
  CourseListQuery,
  CourseListViewResponse,
  CourseDetailView,
  CourseStatus,
} from "@journey-os/types";
import { CourseNotFoundError } from "../../errors";
import type { CourseRepository } from "../../repositories/course.repository";
import type { HierarchyService } from "./hierarchy.service";

export class CourseViewService {
  readonly #repository: CourseRepository;
  readonly #hierarchyService: HierarchyService;

  constructor(
    repository: CourseRepository,
    hierarchyService: HierarchyService,
  ) {
    this.#repository = repository;
    this.#hierarchyService = hierarchyService;
  }

  async listView(query: CourseListQuery): Promise<CourseListViewResponse> {
    return this.#repository.listEnriched(query);
  }

  async getDetailView(id: string): Promise<CourseDetailView> {
    const [enriched, hierarchy] = await Promise.all([
      this.#repository.findByIdEnriched(id),
      this.#hierarchyService.getCourseHierarchy(id),
    ]);

    if (!enriched) {
      throw new CourseNotFoundError(id);
    }

    const { course, program_name, director } = enriched;

    return {
      id: course.id as string,
      code: course.code as string,
      name: course.name as string,
      description: (course.description as string) ?? null,
      department: (course.department as string) ?? null,
      program_id: (course.program_id as string) ?? null,
      program_name,
      course_director: director,
      status: (course.status as CourseStatus) ?? "active",
      academic_year: (course.academic_year as string) ?? null,
      semester: (course.semester as string) ?? null,
      credit_hours: (course.credit_hours as number) ?? null,
      course_type: (course.course_type as string) ?? null,
      hierarchy: hierarchy.sections,
      slo_count: 0,
      neo4j_id: (course.neo4j_id as string) ?? null,
      created_at: course.created_at as string,
      updated_at: course.updated_at as string,
    };
  }
}
