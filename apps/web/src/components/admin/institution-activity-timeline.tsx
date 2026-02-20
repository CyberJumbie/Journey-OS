"use client";

import type { ActivityTimelineEntry } from "@journey-os/types";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export interface InstitutionActivityTimelineProps {
  events: readonly ActivityTimelineEntry[];
}

export function InstitutionActivityTimeline({
  events,
}: InstitutionActivityTimelineProps) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-serif text-sm font-semibold text-text-primary">
        Recent Activity
      </h3>
      {events.length === 0 ? (
        <p className="text-sm text-text-muted">No activity recorded yet.</p>
      ) : (
        <div className="relative ml-3 border-l-2 border-border-light pl-6">
          {events.map((event) => (
            <div key={event.id} className="relative mb-4 last:mb-0">
              <div className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-green bg-white" />
              <div>
                <p className="text-sm text-text-secondary">
                  {event.description}
                </p>
                <p className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-text-muted">
                  {event.actor_name}
                  {event.actor_email ? ` (${event.actor_email})` : ""} —{" "}
                  {formatRelativeTime(event.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
