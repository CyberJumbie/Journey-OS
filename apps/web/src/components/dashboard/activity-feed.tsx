"use client";

import type { ActivityEventType } from "@journey-os/types";
import { useActivityFeed } from "@web/hooks/use-activity-feed";
import { ActivityEventRow } from "./activity-event-row";

const ALL_EVENT_TYPES: readonly {
  value: ActivityEventType;
  label: string;
}[] = [
  { value: "question_generated", label: "Generated" },
  { value: "question_reviewed", label: "Reviewed" },
  { value: "question_approved", label: "Approved" },
  { value: "question_rejected", label: "Rejected" },
  { value: "coverage_gap_detected", label: "Coverage Gap" },
  { value: "bulk_generation_complete", label: "Bulk Complete" },
];

interface ActivityFeedProps {
  readonly userId: string;
}

export function ActivityFeed({ userId }: ActivityFeedProps) {
  const {
    events,
    status,
    error,
    hasMore,
    sentinelRef,
    eventTypes,
    setEventTypes,
  } = useActivityFeed(userId);

  const toggleEventType = (type: ActivityEventType) => {
    setEventTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold font-serif text-text-primary">
          Recent Activity
        </h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {ALL_EVENT_TYPES.map((et) => (
            <label
              key={et.value}
              className="flex items-center gap-1.5 text-xs cursor-pointer"
            >
              <input
                type="checkbox"
                checked={eventTypes.includes(et.value)}
                onChange={() => toggleEventType(et.value)}
                className="rounded border-border"
              />
              <span className="text-text-muted">{et.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="divide-y divide-border">
        {status === "loading" ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`skeleton-${String(i)}`}
                className="flex items-start gap-3 py-3 px-4 animate-pulse"
              >
                <div className="w-5 h-5 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="h-3 bg-muted rounded w-12" />
              </div>
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div className="py-8 text-center">
            <p className="text-sm text-destructive">
              {error ?? "Failed to load activity feed"}
            </p>
          </div>
        ) : null}

        {(status === "data" || status === "loading_more") &&
        events.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-muted">No recent activity</p>
          </div>
        ) : null}

        {(status === "data" || status === "loading_more") &&
        events.length > 0 ? (
          <>
            {events.map((event) => (
              <ActivityEventRow key={event.id} event={event} />
            ))}
          </>
        ) : null}

        {status === "loading_more" ? (
          <div className="py-3 text-center">
            <p className="text-xs text-text-muted">Loading more...</p>
          </div>
        ) : null}

        {status === "data" && !hasMore && events.length > 0 ? (
          <div className="py-3 text-center">
            <p className="text-xs text-text-muted">All activity loaded</p>
          </div>
        ) : null}
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}
