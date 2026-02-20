"use client";

const C = {
  parchment: "#faf9f6",
  blueMid: "#2b71b9",
  borderLight: "#edeae4",
  textPrimary: "#1b232a",
  textMuted: "#718096",
};

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
        <div
          className="h-[5px] w-[5px] rounded-sm"
          style={{ background: C.blueMid }}
        />
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
            className="cursor-pointer rounded-lg text-left transition-all"
            style={{
              background: C.parchment,
              border: `1px solid ${C.borderLight}`,
              padding: "14px 12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = C.blueMid;
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,44,118,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = C.borderLight;
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
