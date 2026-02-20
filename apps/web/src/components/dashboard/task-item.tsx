"use client";

interface Task {
  title: string;
  due: string;
  priority: "high" | "medium" | "low";
  course: string;
}

interface TaskListProps {
  tasks: Task[];
}

export function TaskList({ tasks }: TaskListProps) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-4 md:p-5 md:px-6">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-[5px] w-[5px] rounded-sm bg-navy-deep" />
          <span
            className="font-mono uppercase text-text-muted"
            style={{ fontSize: 9, letterSpacing: "0.08em" }}
          >
            Upcoming Tasks
          </span>
        </div>
        <span className="font-mono text-[10px] text-text-muted">
          {tasks.length}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {tasks.map((t, i) => (
          <div
            key={i}
            className="cursor-pointer rounded-lg bg-parchment transition-colors"
            style={{
              padding: "10px 12px",
              border: `1px solid ${i === 0 ? "var(--border)" : "transparent"}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--blue-mid)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor =
                i === 0 ? "var(--border)" : "transparent";
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <span
                className="font-sans font-medium text-text-primary"
                style={{ fontSize: 13, lineHeight: 1.4 }}
              >
                {t.title}
              </span>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  flexShrink: 0,
                  marginTop: 6,
                  background:
                    t.priority === "high"
                      ? "var(--danger)"
                      : t.priority === "medium"
                        ? "var(--warning)"
                        : "var(--border-light)",
                }}
              />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="font-mono uppercase text-text-muted"
                style={{ fontSize: 9, letterSpacing: "0.04em" }}
              >
                {t.course}
              </span>
              <span
                className="font-sans"
                style={{
                  fontSize: 11,
                  color:
                    t.due === "Today" ? "var(--danger)" : "var(--text-muted)",
                  fontWeight: t.due === "Today" ? 600 : 400,
                }}
              >
                {t.due}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
