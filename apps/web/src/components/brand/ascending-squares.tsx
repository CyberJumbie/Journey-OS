"use client";

interface AscendingSquaresProps {
  colors: string[];
  size?: number;
  gap?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AscendingSquares({
  colors,
  size = 14,
  gap = 4,
  className,
  style,
}: AscendingSquaresProps) {
  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "flex-end", gap, ...style }}
    >
      {colors.map((c, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: Math.max(2, size * 0.14),
            background: c,
            transform: `translateY(${(colors.length - 1 - i) * -(size * 0.2)}px)`,
          }}
        />
      ))}
    </div>
  );
}
