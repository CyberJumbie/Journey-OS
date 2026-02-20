import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ScheduleService } from "../schedule.service";
import { CourseNotFoundError } from "../../../errors";

/**
 * ScheduleService uses 3 sequential .from() calls:
 *  Call 1: courses — verify course exists (.single())
 *  Call 2: sessions — get max week_number (.maybeSingle())
 *  Call 3: sessions — get sessions for week (returns array)
 *
 * We use a call counter to return the right chain per call.
 */

interface MockOptions {
  courseExists?: boolean;
  maxWeekNumber?: number | null;
  sessions?: Record<string, unknown>[];
  sessionsError?: boolean;
}

function createMockSupabase(opts: MockOptions = {}): SupabaseClient {
  const {
    courseExists = true,
    maxWeekNumber = 3,
    sessions = [],
    sessionsError = false,
  } = opts;

  // Call 1: course check — .from("courses").select("id").eq("id", ...).single()
  const courseChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi
          .fn()
          .mockResolvedValue(
            courseExists
              ? { data: { id: "course-1" }, error: null }
              : {
                  data: null,
                  error: { message: "Not found", code: "PGRST116" },
                },
          ),
      }),
    }),
  };

  // Call 2: max week — .from("sessions").select(...).eq(...).order(...).limit(...).maybeSingle()
  const maxWeekChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            maybeSingle: vi
              .fn()
              .mockResolvedValue(
                maxWeekNumber !== null
                  ? {
                      data: {
                        week_number: maxWeekNumber,
                        section: { course_id: "course-1" },
                      },
                      error: null,
                    }
                  : { data: null, error: null },
              ),
          }),
        }),
      }),
    }),
  };

  // Call 3: sessions — .from("sessions").select(...).eq(...).eq(...)
  const sessionsChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi
          .fn()
          .mockResolvedValue(
            sessionsError
              ? { data: null, error: { message: "Query failed" } }
              : { data: sessions, error: null },
          ),
      }),
    }),
  };

  let callCount = 0;
  const chains = [courseChain, maxWeekChain, sessionsChain];

  return {
    from: vi.fn(() => {
      const chain = chains[callCount]!;
      callCount++;
      return chain;
    }),
  } as unknown as SupabaseClient;
}

const SAMPLE_SESSION = {
  id: "sess-1",
  title: "Anatomy Lecture",
  day_of_week: "monday",
  start_time: "09:00:00",
  end_time: "10:30:00",
  week_number: 1,
  section: { title: "Section A", course_id: "course-1" },
};

describe("ScheduleService", () => {
  let service: ScheduleService;

  describe("getWeeklySchedule", () => {
    it("returns WeeklySchedule for valid course and week", async () => {
      const mock = createMockSupabase({
        sessions: [SAMPLE_SESSION],
        maxWeekNumber: 4,
      });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 1);

      expect(result.course_id).toBe("course-1");
      expect(result.week_number).toBe(1);
      expect(result.total_weeks).toBe(4);
      expect(result.sessions).toHaveLength(1);
    });

    it("joins through sections to filter by course_id", async () => {
      const mock = createMockSupabase({ sessions: [SAMPLE_SESSION] });
      service = new ScheduleService(mock);

      await service.getWeeklySchedule("course-1", 1);

      // Call 2 (max week) and Call 3 (sessions) both use .from("sessions")
      const fromCalls = (mock.from as ReturnType<typeof vi.fn>).mock.calls;
      expect(fromCalls[1]![0]).toBe("sessions");
      expect(fromCalls[2]![0]).toBe("sessions");
    });

    it("calculates total_weeks from max week_number", async () => {
      const mock = createMockSupabase({ maxWeekNumber: 12 });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 1);

      expect(result.total_weeks).toBe(12);
    });

    it("returns empty sessions when no sessions for week", async () => {
      const mock = createMockSupabase({ sessions: [], maxWeekNumber: 4 });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 5);

      expect(result.sessions).toHaveLength(0);
      expect(result.total_weeks).toBe(4);
    });

    it("returns total_weeks=0 when no sessions exist at all", async () => {
      const mock = createMockSupabase({ maxWeekNumber: null });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 1);

      expect(result.total_weeks).toBe(0);
    });

    it("throws CourseNotFoundError for invalid course", async () => {
      const mock = createMockSupabase({ courseExists: false });
      service = new ScheduleService(mock);

      await expect(
        service.getWeeklySchedule("nonexistent-id", 1),
      ).rejects.toThrow(CourseNotFoundError);
    });

    it("handles Supabase sessions query error gracefully", async () => {
      const mock = createMockSupabase({ sessionsError: true });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 1);

      expect(result.sessions).toHaveLength(0);
    });

    it("sets material_status to 'empty' (stub)", async () => {
      const mock = createMockSupabase({ sessions: [SAMPLE_SESSION] });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 1);

      expect(result.sessions[0]!.material_status).toBe("empty");
      expect(result.sessions[0]!.material_count).toBe(0);
    });

    it("maps day_of_week correctly as string DayOfWeek", async () => {
      const tuesdaySession = { ...SAMPLE_SESSION, day_of_week: "tuesday" };
      const mock = createMockSupabase({ sessions: [tuesdaySession] });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 1);

      expect(result.sessions[0]!.day_of_week).toBe("tuesday");
    });

    it("formats start_time/end_time from time without timezone (HH:MM:SS → HH:mm)", async () => {
      const mock = createMockSupabase({ sessions: [SAMPLE_SESSION] });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 1);

      expect(result.sessions[0]!.start_time).toBe("09:00");
      expect(result.sessions[0]!.end_time).toBe("10:30");
    });

    it("gets section title as section_name", async () => {
      const mock = createMockSupabase({ sessions: [SAMPLE_SESSION] });
      service = new ScheduleService(mock);

      const result = await service.getWeeklySchedule("course-1", 1);

      expect(result.sessions[0]!.section_name).toBe("Section A");
    });
  });
});
