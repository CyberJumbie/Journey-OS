'use client';

import { C, mono } from '@/lib/design-tokens';

interface SectionMarkerProps {
  color: string;
  label: string;
}

export function SectionMarker({ color, label }: SectionMarkerProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 6, height: 6, borderRadius: 1, background: color }} />
      <span style={{
        fontFamily: mono, fontSize: 10,
        color: color === C.green || color === C.greenDark ? C.greenDark : C.textMuted,
        letterSpacing: "0.1em", textTransform: "uppercase",
      }}>
        {label}
      </span>
    </div>
  );
}
