import { CourseRepository } from '../repositories/course.repository';

/**
 * Response shape for each course in the list endpoint.
 * Combines Supabase course data with Neo4j subconcept counts.
 */
export interface CourseListItem {
  id: string;
  code: string;
  title: string;
  term: string;
  subconcept_count: number;
  item_count: number;
}

/**
 * CourseService — business logic for course operations.
 * Calls CourseRepository for all data access.
 */
export class CourseService {
  private readonly courseRepository: CourseRepository;

  constructor() {
    this.courseRepository = new CourseRepository();
  }

  /**
   * Get all courses for an institution, enriched with counts from Neo4j + Supabase.
   */
  async getCourses(institutionId: string): Promise<CourseListItem[]> {
    const courses = await this.courseRepository.findByInstitution(institutionId);

    // Enrich each course with subconcept + item counts in parallel
    const enriched = await Promise.all(
      courses.map(async (course): Promise<CourseListItem> => {
        const [subconceptCount, itemCount] = await Promise.all([
          this.courseRepository.getSubconceptCount(course.id).catch(() => 0),
          this.courseRepository.getItemCount(course.id).catch(() => 0),
        ]);

        return {
          id: course.id,
          code: course.code,
          title: course.title,
          term: course.academic_year ?? '',
          subconcept_count: subconceptCount,
          item_count: itemCount,
        };
      }),
    );

    return enriched;
  }
}
