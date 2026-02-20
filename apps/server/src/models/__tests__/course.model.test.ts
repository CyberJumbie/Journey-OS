import { describe, it, expect } from "vitest";
import { CourseModel } from "../course.model";
import { CourseNotFoundError } from "../../errors";
import type { CourseDTO } from "@journey-os/types";

const MOCK_COURSE: CourseDTO = {
  id: "course-uuid-1",
  code: "MED-101",
  name: "Introduction to Anatomy",
  description: "Fundamental anatomy course",
  department: "Basic Sciences",
  course_director_id: "faculty-uuid-1",
  academic_year: "2026-2027",
  semester: "Fall",
  credit_hours: 4,
  course_type: "lecture",
  neo4j_id: null,
  status: "draft",
  created_at: "2026-02-20T10:00:00Z",
  updated_at: "2026-02-20T10:00:00Z",
};

describe("CourseModel", () => {
  it("constructs with all fields accessible via getters", () => {
    const model = new CourseModel(MOCK_COURSE);

    expect(model.id).toBe("course-uuid-1");
    expect(model.code).toBe("MED-101");
    expect(model.name).toBe("Introduction to Anatomy");
    expect(model.description).toBe("Fundamental anatomy course");
    expect(model.department).toBe("Basic Sciences");
    expect(model.courseDirectorId).toBe("faculty-uuid-1");
    expect(model.academicYear).toBe("2026-2027");
    expect(model.semester).toBe("Fall");
    expect(model.creditHours).toBe(4);
    expect(model.courseType).toBe("lecture");
    expect(model.neo4jId).toBeNull();
    expect(model.status).toBe("draft");
  });

  it("creates model from row via fromRow()", () => {
    const row: Record<string, unknown> = {
      id: "course-uuid-1",
      code: "MED-101",
      name: "Introduction to Anatomy",
      description: "Fundamental anatomy course",
      department: "Basic Sciences",
      course_director_id: "faculty-uuid-1",
      academic_year: "2026-2027",
      semester: "Fall",
      credit_hours: 4,
      course_type: "lecture",
      neo4j_id: null,
      status: "draft",
      created_at: "2026-02-20T10:00:00Z",
      updated_at: "2026-02-20T10:00:00Z",
    };

    const model = CourseModel.fromRow(row);

    expect(model.id).toBe("course-uuid-1");
    expect(model.code).toBe("MED-101");
    expect(model.courseType).toBe("lecture");
  });

  it("throws CourseNotFoundError from fromRow() when row is null/empty", () => {
    expect(() => CourseModel.fromRow({})).toThrow(CourseNotFoundError);
    expect(() =>
      CourseModel.fromRow(null as unknown as Record<string, unknown>),
    ).toThrow(CourseNotFoundError);
  });

  it("returns correct DTO via toDTO()", () => {
    const model = new CourseModel(MOCK_COURSE);
    const dto = model.toDTO();

    expect(dto.id).toBe("course-uuid-1");
    expect(dto.code).toBe("MED-101");
    expect(dto.name).toBe("Introduction to Anatomy");
    expect(dto.course_type).toBe("lecture");
    expect(dto.status).toBe("draft");
    expect(dto.neo4j_id).toBeNull();
  });

  it("returns Neo4j properties with optional fields included", () => {
    const model = new CourseModel(MOCK_COURSE);
    const props = model.toNeo4jProperties();

    expect(props.id).toBe("course-uuid-1");
    expect(props.code).toBe("MED-101");
    expect(props.name).toBe("Introduction to Anatomy");
    expect(props.status).toBe("draft");
    expect(props.description).toBe("Fundamental anatomy course");
    expect(props.department).toBe("Basic Sciences");
    expect(props.course_type).toBe("lecture");
    expect(props.credit_hours).toBe(4);
    expect(props.semester).toBe("Fall");
  });
});
