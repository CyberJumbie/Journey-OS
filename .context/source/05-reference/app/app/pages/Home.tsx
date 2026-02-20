import { useEffect, useState, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — HOME PAGE (PLACEHOLDER)
// Template D: Full-Width Flow, minimal centered content
// Surface: cream background, centered logo + text
// ═══════════════════════════════════════════════════════════════

const C = {
  navyDeep: "#002c76",
  green: "#69a338",
  greenDark: "#5d7203",
  cream: "#f5f3ef",
  textSecondary: "#4a5568",
};

const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, system-ui, sans-serif";
const serif = "'Lora', Georgia, serif";
const mono = "'DM Mono', Menlo, monospace";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: C.cream,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      <div style={{
        maxWidth: 448,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 24,
        textAlign: "center",
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(16px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: C.navyDeep }}>
            Journey
          </span>
          <span style={{
            fontFamily: mono,
            fontSize: 9,
            color: C.greenDark,
            letterSpacing: "0.1em",
            border: `1.2px solid ${C.greenDark}`,
            padding: "1px 6px",
            borderRadius: 3,
            fontWeight: 500,
          }}>
            OS
          </span>
        </div>

        {/* Heading */}
        <h1 style={{
          fontFamily: serif,
          fontSize: 34,
          fontWeight: 700,
          color: C.navyDeep,
          lineHeight: 1.25,
          letterSpacing: "-0.015em",
          margin: 0,
        }}>
          Journey OS
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: sans,
          fontSize: 16,
          fontWeight: 400,
          color: C.textSecondary,
          lineHeight: 1.75,
          margin: 0,
        }}>
          Platform launching soon
        </p>
      </div>
    </div>
  );
}
