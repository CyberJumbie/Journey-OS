"use client";

const C = {
  green: "#69a338",
  blueMid: "#2b71b9",
  bluePale: "#a3d9ff",
  borderLight: "#edeae4",
  white: "#ffffff",
  textMuted: "#718096",
};

interface MasteryCellProps {
  value: number;
  label: string;
}

export function MasteryCell({ value, label }: MasteryCellProps) {
  const intensity = Math.min(1, Math.max(0, value));
  const bg =
    intensity > 0.7
      ? C.green
      : intensity > 0.4
        ? C.blueMid
        : intensity > 0.15
          ? C.bluePale
          : C.borderLight;
  const textColor = intensity > 0.4 ? C.white : C.textMuted;

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
