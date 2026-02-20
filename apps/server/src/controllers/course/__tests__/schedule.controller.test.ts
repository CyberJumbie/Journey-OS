import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request } from "express";
import { ScheduleController } from "../schedule.controller";
import { ScheduleService } from "../../../services/course/schedule.service";
import { CourseNotFoundError } from "../../../errors";
import type { WeeklySchedule } from "@journey-os/types";

const VALID_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const MOCK_SCHEDULE: WeeklySchedule = {
  course_id: VALID_UUID,
  week_number: 1,
  total_weeks: 4,
  sessions: [
    {
      id: "sess-1",
      title: "Anatomy Lecture",
      day_of_week: "monday",
      start_time: "09:00",
      end_time: "10:30",
      week_number: 1,
      section_name: "Section A",
      material_count: 0,
      material_status: "empty",
    },
  ],
};

function createMockRes(): {
  statusCode: number;
  body: unknown;
  status: (code: number) => unknown;
  json: (data: unknown) => unknown;
} {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: unknown) {
      res.body = data;
      return res;
    },
  };
  return res;
}

function createMockReq(
  overrides: Partial<{
    params: Record<string, string>;
    query: Record<string, string>;
  }> = {},
): unknown {
  return {
    params: overrides.params ?? { id: VALID_UUID },
    query: overrides.query ?? {},
  } as unknown as Partial<Request>;
}

describe("ScheduleController", () => {
  let controller: ScheduleController;
  let mockGetWeeklySchedule: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockGetWeeklySchedule = vi.fn().mockResolvedValue(MOCK_SCHEDULE);
    const mockService = {
      getWeeklySchedule: mockGetWeeklySchedule,
    } as unknown as ScheduleService;
    controller = new ScheduleController(mockService);
  });

  it("returns 200 with WeeklySchedule for valid request", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await controller.getSchedule(req as Request, res as never);

    expect(res.statusCode).toBe(200);
    const body = res.body as { data: WeeklySchedule; error: null };
    expect(body.data).toEqual(MOCK_SCHEDULE);
    expect(body.error).toBeNull();
  });

  it("defaults week to 1 when param omitted", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await controller.getSchedule(req as Request, res as never);

    expect(mockGetWeeklySchedule).toHaveBeenCalledWith(VALID_UUID, 1);
  });

  it("returns 400 for non-numeric week param", async () => {
    const req = createMockReq({ query: { week: "abc" } });
    const res = createMockRes();

    await controller.getSchedule(req as Request, res as never);

    expect(res.statusCode).toBe(400);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for week < 1", async () => {
    const req = createMockReq({ query: { week: "0" } });
    const res = createMockRes();

    await controller.getSchedule(req as Request, res as never);

    expect(res.statusCode).toBe(400);
    const body = res.body as { error: { message: string } };
    expect(body.error.message).toBe("Week must be a positive integer");
  });

  it("returns 400 for non-UUID course_id", async () => {
    const req = createMockReq({ params: { id: "not-a-uuid" } });
    const res = createMockRes();

    await controller.getSchedule(req as Request, res as never);

    expect(res.statusCode).toBe(400);
    const body = res.body as { error: { message: string } };
    expect(body.error.message).toBe("Course ID must be a valid UUID");
  });

  it("returns 404 when CourseNotFoundError thrown", async () => {
    mockGetWeeklySchedule.mockRejectedValue(
      new CourseNotFoundError(VALID_UUID),
    );
    const req = createMockReq();
    const res = createMockRes();

    await controller.getSchedule(req as Request, res as never);

    expect(res.statusCode).toBe(404);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe("COURSE_NOT_FOUND");
  });

  it("returns 500 for unexpected errors", async () => {
    mockGetWeeklySchedule.mockRejectedValue(new TypeError("boom"));
    const req = createMockReq();
    const res = createMockRes();

    await controller.getSchedule(req as Request, res as never);

    expect(res.statusCode).toBe(500);
    const body = res.body as { error: { code: string } };
    expect(body.error.code).toBe("INTERNAL_ERROR");
  });

  it("response body matches ApiResponse<WeeklySchedule> shape", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await controller.getSchedule(req as Request, res as never);

    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("error");
  });

  it("narrows req.params.id with typeof check", async () => {
    // Pass id as an array (Express strict mode possibility)
    const req = {
      params: { id: ["array-value"] },
      query: {},
    } as unknown as Request;
    const res = createMockRes();

    await controller.getSchedule(req, res as never);

    expect(res.statusCode).toBe(400);
    expect(mockGetWeeklySchedule).not.toHaveBeenCalled();
  });
});
