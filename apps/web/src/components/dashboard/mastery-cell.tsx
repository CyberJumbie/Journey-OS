"use client";

interface MasteryCellProps {
  value: number;
  label: string;
}

export function MasteryCell({ value, label }: MasteryCellProps) {
  const intensity = Math.min(1, Math.max(0, value));
  const bg =
    intensity > 0.7
      ? "var(--color-green)"
      : intensity > 0.4
        ? "var(--color-blue-mid)"
        : intensity > 0.15
          ? "var(--color-blue-pale)"
          : "var(--color-border-light)";
  const textColor =
    intensity > 0.4 ? "var(--color-white)" : "var(--color-text-muted)";

  return (
    <div
      title={`${label}: ${Math.round(intensity * 100)}%`}
      className="font-mono"
      style={{
        width: "100%",
        aspectRatio: "1",
        borderRadius: 4,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 9,
        color: textColor,
        fontWeight: 500,
        transition: "all 0.2s",
        cursor: "default",
      }}
    >
      {Math.round(intensity * 100)}
    </div>
  );
}
