"use client";

interface QuickAction {
  label: string;
  icon: string;
  color: string;
}

interface QuickActionsProps {
  actions: QuickAction[];
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <div className="rounded-xl border border-border-light bg-white p-4 md:p-5 md:px-6">
      <div className="mb-3.5 flex items-center gap-2">
        <div className="h-[5px] w-[5px] rounded-sm bg-blue-mid" />
        <span
          className="font-mono uppercase text-text-muted"
          style={{ fontSize: 9, letterSpacing: "0.08em" }}
        >
          Quick Actions
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {actions.map((a, i) => (
          <button
            key={i}
            className="cursor-pointer rounded-lg bg-parchment text-left transition-all"
            style={{
              border: "1px solid var(--border-light)",
              padding: "14px 12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--blue-mid)";
              e.currentTarget.style.boxShadow = "var(--shadow-subtle)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-light)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span
              className="mb-1.5 block font-serif"
              style={{ fontSize: 16, color: a.color }}
            >
              {a.icon}
            </span>
            <span className="font-sans text-[13px] font-semibold text-text-primary">
              {a.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
