/**
 * Course domain model.
 * [STORY-F-1] OOP class with #private fields and public getters.
 */

import type { CourseDTO, CourseStatus, CourseType } from "@journey-os/types";
import { CourseNotFoundError } from "../errors";

export class CourseModel {
  readonly #id: string;
  readonly #code: string;
  readonly #name: string;
  readonly #description: string | null;
  readonly #department: string | null;
  readonly #courseDirectorId: string | null;
  readonly #academicYear: string | null;
  readonly #semester: string | null;
  readonly #creditHours: number | null;
  readonly #courseType: CourseType | null;
  readonly #neo4jId: string | null;
  readonly #status: CourseStatus;
  readonly #createdAt: string;
  readonly #updatedAt: string;

  constructor(data: CourseDTO) {
    this.#id = data.id;
    this.#code = data.code;
    this.#name = data.name;
    this.#description = data.description;
    this.#department = data.department;
    this.#courseDirectorId = data.course_director_id;
    this.#academicYear = data.academic_year;
    this.#semester = data.semester;
    this.#creditHours = data.credit_hours;
    this.#courseType = data.course_type;
    this.#neo4jId = data.neo4j_id;
    this.#status = data.status;
    this.#createdAt = data.created_at;
    this.#updatedAt = data.updated_at;
  }

  get id(): string {
    return this.#id;
  }
  get code(): string {
    return this.#code;
  }
  get name(): string {
    return this.#name;
  }
  get description(): string | null {
    return this.#description;
  }
  get department(): string | null {
    return this.#department;
  }
  get courseDirectorId(): string | null {
    return this.#courseDirectorId;
  }
  get academicYear(): string | null {
    return this.#academicYear;
  }
  get semester(): string | null {
    return this.#semester;
  }
  get creditHours(): number | null {
    return this.#creditHours;
  }
  get courseType(): CourseType | null {
    return this.#courseType;
  }
  get neo4jId(): string | null {
    return this.#neo4jId;
  }
  get status(): CourseStatus {
    return this.#status;
  }
  get createdAt(): string {
    return this.#createdAt;
  }
  get updatedAt(): string {
    return this.#updatedAt;
  }

  static fromRow(row: Record<string, unknown>): CourseModel {
    if (!row || !row.id) {
      throw new CourseNotFoundError("unknown");
    }

    return new CourseModel({
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      department: (row.department as string) ?? null,
      course_director_id: (row.course_director_id as string) ?? null,
      academic_year: (row.academic_year as string) ?? null,
      semester: (row.semester as string) ?? null,
      credit_hours: (row.credit_hours as number) ?? null,
      course_type: (row.course_type as CourseType) ?? null,
      neo4j_id: (row.neo4j_id as string) ?? null,
      status: (row.status as CourseStatus) ?? "draft",
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    });
  }

  toDTO(): CourseDTO {
    return {
      id: this.#id,
      code: this.#code,
      name: this.#name,
      description: this.#description,
      department: this.#department,
      course_director_id: this.#courseDirectorId,
      academic_year: this.#academicYear,
      semester: this.#semester,
      credit_hours: this.#creditHours,
      course_type: this.#courseType,
      neo4j_id: this.#neo4jId,
      status: this.#status,
      created_at: this.#createdAt,
      updated_at: this.#updatedAt,
    };
  }

  toNeo4jProperties(): Record<string, unknown> {
    const props: Record<string, unknown> = {
      id: this.#id,
      code: this.#code,
      name: this.#name,
      status: this.#status,
    };
    if (this.#description) {
      props.description = this.#description;
    }
    if (this.#department) {
      props.department = this.#department;
    }
    if (this.#courseType) {
      props.course_type = this.#courseType;
    }
    if (this.#creditHours !== null) {
      props.credit_hours = this.#creditHours;
    }
    if (this.#semester) {
      props.semester = this.#semester;
    }
    return props;
  }
}
