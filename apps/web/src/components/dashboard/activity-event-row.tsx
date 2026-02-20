"use client";

import type { ActivityEvent } from "@journey-os/types";
import { ActivityIcon } from "./activity-icon";
import { RelativeTime } from "./relative-time";

interface ActivityEventRowProps {
  readonly event: ActivityEvent;
}

export function ActivityEventRow({ event }: ActivityEventRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 px-4 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors">
      <div className="mt-0.5 flex-shrink-0">
        <ActivityIcon eventType={event.event_type} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary leading-snug">
          {event.metadata.description}
        </p>
        {event.metadata.course_name ? (
          <span className="inline-block mt-1 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider font-medium rounded-full bg-secondary text-secondary-foreground">
            {event.metadata.course_name}
          </span>
        ) : null}
      </div>
      <div className="flex-shrink-0">
        <RelativeTime dateString={event.created_at} />
      </div>
    </div>
  );
}
