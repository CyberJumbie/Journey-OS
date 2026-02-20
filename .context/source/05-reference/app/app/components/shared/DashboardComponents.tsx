// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — SHARED DASHBOARD COMPONENTS
// Design System: Reusable organisms for all dashboard screens
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";

// ─── TOKENS ─────────────────────────────────────────────────────
export const C = {
  navyDeep: "#002c76", navy: "#003265", blue: "#004ebc",
  blueMid: "#2b71b9", blueLight: "#00a8e1", bluePale: "#a3d9ff",
  greenDark: "#5d7203", green: "#69a338", lime: "#d8d812",
  ink: "#1b232a", warmGray: "#d7d3c8", cream: "#f5f3ef",
  parchment: "#faf9f6", white: "#ffffff",
  textPrimary: "#1b232a", textSecondary: "#4a5568", textMuted: "#718096",
  border: "#e2dfd8", borderLight: "#edeae4",
  error: "#c9282d", warning: "#fa9d33",
};

export const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, sans-serif";
export const serif = "'Lora', Georgia, serif";
export const mono = "'DM Mono', Menlo, monospace";

// ─── WOVEN FIELD ────────────────────────────────────────────────
export function WovenField({ color = C.navyDeep, opacity = 0.02, density = 12 }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    const draw = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = c.offsetWidth * dpr; c.height = c.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = c.offsetWidth, ch = c.offsetHeight, sp = cw / density;
      ctx.clearRect(0, 0, cw * 2, ch * 2);
      for (let y = 0; y < ch; y += sp) {
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x < cw; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.015 + y * 0.01) * 1.5);
        ctx.strokeStyle = color; ctx.globalAlpha = opacity; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let x = 0; x < cw; x += sp * 2) {
        ctx.beginPath(); ctx.moveTo(x, 0);
        for (let y = 0; y < ch; y += 4) ctx.lineTo(x + Math.sin(y * 0.012) * 1.5, y);
        ctx.globalAlpha = opacity * 0.6; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    draw(); window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [color, opacity, density]);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

// ─── ASCENDING SQUARES ──────────────────────────────────────────
export function AscSquares({ colors, size = 10, gap = 3 }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap }}>
      {colors.map((c, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: Math.max(1.5, size * 0.14), background: c, transform: `translateY(${(colors.length - 1 - i) * -(size * 0.2)}px)` }} />
      ))}
    </div>
  );
}

// ─── MINI SPARKLINE ─────────────────────────────────────────────
export function Sparkline({ data, color = C.blueMid, width = 80, height = 28 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(pts.split(" ").pop().split(",")[0])} cy={parseFloat(pts.split(" ").pop().split(",")[1])} r="2.5" fill={color} />
    </svg>
  );
}

// ─── PROGRESS BAR ───────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = C.green, height = 6 }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ width: "100%", height, background: C.borderLight, borderRadius: height }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: height, transition: "width 0.6s ease" }} />
    </div>
  );
}

// ─── MASTERY HEATMAP CELL ───────────────────────────────────────
export function MasteryCell({ value, label }) {
  const intensity = Math.min(1, Math.max(0, value));
  const bg = intensity > 0.7 ? C.green : intensity > 0.4 ? C.blueMid : intensity > 0.15 ? C.bluePale : C.borderLight;
  const textColor = intensity > 0.4 ? C.white : C.textMuted;
  return (
    <div title={`${label}: ${Math.round(intensity * 100)}%`} style={{
      width: "100%", aspectRatio: "1", borderRadius: 4,
      background: bg, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 9, fontFamily: mono, color: textColor, fontWeight: 500,
      transition: "all 0.2s", cursor: "default",
    }}>
      {Math.round(intensity * 100)}
    </div>
  );
}
