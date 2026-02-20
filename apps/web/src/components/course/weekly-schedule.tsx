"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  WeeklySchedule as WeeklyScheduleData,
  ScheduleSession,
  DayOfWeek,
} from "@journey-os/types";
import { WeekSelector } from "@web/components/course/week-selector";
import { SessionCard } from "@web/components/course/session-card";

interface WeeklyScheduleProps {
  readonly courseId: string;
}

const DAY_ORDER: readonly DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: WeeklyScheduleData };

/**
 * WeeklySchedule — displays course sessions in a weekly calendar grid.
 * Uses key={courseId} from parent to reset week state on course change (React 19 pattern).
 */
export function WeeklySchedule({ courseId }: WeeklyScheduleProps) {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [state, setState] = useState<FetchState>({ status: "loading" });

  const fetchSchedule = useCallback(
    async (week: number) => {
      setState({ status: "loading" });
      try {
        const res = await fetch(
          `/api/v1/courses/${encodeURIComponent(courseId)}/schedule?week=${week}`,
        );
        const json = (await res.json()) as {
          data?: WeeklyScheduleData;
          error?: { code: string; message: string };
        };
        if (!res.ok || json.error) {
          setState({
            status: "error",
            message: json.error?.message ?? "Failed to load schedule",
          });
          return;
        }
        if (json.data) {
          setState({ status: "success", data: json.data });
        }
      } catch {
        setState({ status: "error", message: "Network error" });
      }
    },
    [courseId],
  );

  useEffect(() => {
    fetchSchedule(currentWeek);
  }, [currentWeek, fetchSchedule]);

  const handleWeekChange = (week: number) => {
    setCurrentWeek(week);
  };

  // Loading skeleton
  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {DAY_ORDER.map((day) => (
            <div key={day} className="space-y-2">
              <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-24 animate-pulse rounded bg-gray-100" />
              <div className="h-24 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error with retry
  if (state.status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 py-8">
        <p className="text-sm text-red-600">{state.message}</p>
        <button
          type="button"
          onClick={() => fetchSchedule(currentWeek)}
          className="rounded-md bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { data } = state;
  const grouped = groupByDay(data.sessions);

  // Empty state
  const isEmpty = data.sessions.length === 0;

  return (
    <div className="space-y-4">
      <WeekSelector
        currentWeek={data.week_number}
        totalWeeks={data.total_weeks}
        onWeekChange={handleWeekChange}
      />

      {isEmpty ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 py-12">
          <p className="text-sm text-gray-500">
            No sessions scheduled for this week.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {DAY_ORDER.map((day) => (
            <div key={day}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {DAY_LABELS[day]}
              </h3>
              <div className="space-y-2">
                {(grouped.get(day) ?? []).map((session) => (
                  <SessionCard
                    key={session.id}
                    title={session.title}
                    startTime={session.start_time}
                    endTime={session.end_time}
                    sectionName={session.section_name}
                    materialCount={session.material_count}
                    materialStatus={session.material_status}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDay(
  sessions: ReadonlyArray<ScheduleSession>,
): Map<DayOfWeek, ScheduleSession[]> {
  const map = new Map<DayOfWeek, ScheduleSession[]>();
  for (const session of sessions) {
    const existing = map.get(session.day_of_week) ?? [];
    existing.push(session);
    map.set(session.day_of_week, existing);
  }
  return map;
}
