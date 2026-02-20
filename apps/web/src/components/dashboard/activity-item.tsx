"use client";

interface Activity {
  type: "generated" | "review" | "alert" | "student";
  text: string;
  time: string;
  icon: string;
}

interface ActivityFeedProps {
  activities: Activity[];
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-4 md:p-5 md:px-6">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-[5px] w-[5px] rounded-sm bg-green-dark" />
          <span
            className="font-mono uppercase text-text-muted"
            style={{ fontSize: 9, letterSpacing: "0.08em" }}
          >
            Recent Activity
          </span>
        </div>
        <button className="border-none bg-transparent font-sans text-xs font-semibold text-blue-mid">
          View all →
        </button>
      </div>

      <div className="flex flex-col">
        {activities.map((a, i) => (
          <div
            key={i}
            className="flex gap-2.5"
            style={{
              padding: "10px 0",
              borderTop: i > 0 ? "1px solid var(--border-light)" : "none",
            }}
          >
            <div
              className="flex shrink-0 items-center justify-center rounded-md font-serif"
              style={{
                width: 28,
                height: 28,
                fontSize: 12,
                background:
                  a.type === "alert"
                    ? "rgba(250,157,51,0.063)" /* token: --warning */
                    : a.type === "student"
                      ? "rgba(43,113,185,0.063)" /* token: --blue-mid */
                      : "rgba(0,44,118,0.031)" /* token: --navy-deep */,
                color:
                  a.type === "alert"
                    ? "var(--warning)"
                    : a.type === "student"
                      ? "var(--color-blue-mid)"
                      : "var(--color-navy-deep)",
              }}
            >
              {a.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="font-sans text-text-secondary"
                style={{ fontSize: 13, lineHeight: 1.45, marginBottom: 2 }}
              >
                {a.text}
              </p>
              <span
                className="font-mono uppercase text-text-muted"
                style={{ fontSize: 9, letterSpacing: "0.04em" }}
              >
                {a.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
