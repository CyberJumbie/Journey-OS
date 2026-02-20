import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — LOGIN PAGE
// Split Panel Template: white brand panel + cream form panel
// Surface layering: white left, cream right, white form card
// ═══════════════════════════════════════════════════════════════

const C = {
  navyDeep: "#002c76", navy: "#003265", blue: "#004ebc",
  blueMid: "#2b71b9", blueLight: "#00a8e1", bluePale: "#a3d9ff",
  greenDark: "#5d7203", green: "#69a338",
  ink: "#1b232a", warmGray: "#d7d3c8", cream: "#f5f3ef",
  parchment: "#faf9f6", white: "#ffffff",
  textPrimary: "#1b232a", textSecondary: "#4a5568", textMuted: "#718096",
  border: "#e2dfd8", borderLight: "#edeae4",
  error: "#c9282d",
};

const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, sans-serif";
const serif = "'Lora', Georgia, serif";
const mono = "'DM Mono', Menlo, monospace";

// ─── HOOKS ──────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const check = () => setBp(window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

// ─── WOVEN FIELD ────────────────────────────────────────────────
function WovenField({ color = C.navyDeep, opacity = 0.02, density = 14 }) {
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
function AscSquares({ colors, size = 10, gap = 3 }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap }}>
      {colors.map((c, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: Math.max(1.5, size * 0.14), background: c, transform: `translateY(${(colors.length - 1 - i) * -(size * 0.2)}px)` }} />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function LoginPage() {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [activeRole, setActiveRole] = useState("faculty");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const pillars = [
    { label: "Curriculum", sub: "Knowledge Graph", bg: C.navyDeep },
    { label: "Assessment", sub: "AI-Generated", bg: C.blue },
    { label: "Measurement", sub: "Student Mastery", bg: C.green },
    { label: "Compliance", sub: "Accreditation", bg: C.blueMid },
  ];

  const roles = [
    { key: "faculty", label: "Faculty" },
    { key: "admin", label: "Admin" },
    { key: "advisor", label: "Advisor" },
    { key: "student", label: "Student" },
  ];

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${d}s, transform 0.5s ease ${d}s`,
  });

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const routes = { faculty: "/dashboard", student: "/student-dashboard", admin: "/admin", advisor: "/dashboard" };
      navigate(routes[activeRole] || "/dashboard");
    }, 800);
  }

  return (
    <div style={{ fontFamily: sans, minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", background: C.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* ═══════════════ LEFT: BRAND PANEL (white) ═══════════════ */}
      <div style={{
        flex: isMobile ? "none" : isTablet ? "0 0 340px" : "0 0 480px",
        position: "relative", overflow: "hidden", background: C.white,
        borderRight: isMobile ? "none" : `1px solid ${C.borderLight}`,
        borderBottom: isMobile ? `1px solid ${C.borderLight}` : "none",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        minHeight: isMobile ? "auto" : "100vh",
        padding: isMobile ? "32px 24px 28px" : isTablet ? "40px 32px" : "48px 44px",
      }}>
        <WovenField color={C.navyDeep} opacity={0.02} density={14} />

        {/* Top section */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{ ...fadeIn(0.1), display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 20 : 32 }}>
            <span style={{ fontFamily: serif, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.navyDeep }}>Journey</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.greenDark, letterSpacing: "0.1em", border: `1.5px solid ${C.greenDark}`, padding: "2px 7px", borderRadius: 3 }}>OS</span>
          </div>

          {/* Ascending squares */}
          <div style={fadeIn(0.16)}>
            <AscSquares colors={[C.navyDeep, C.blue, C.blueMid, C.green]} size={isMobile ? 10 : 14} gap={4} />
          </div>

          {/* Headline */}
          <h1 style={{
            ...fadeIn(0.22),
            fontFamily: serif, fontWeight: 700,
            fontSize: isMobile ? 26 : isTablet ? 28 : 36,
            lineHeight: 1.2, letterSpacing: "-0.015em",
            color: C.navyDeep, marginTop: isMobile ? 16 : 24,
            marginBottom: isMobile ? 12 : 16, maxWidth: 360,
          }}>
            Every thread of your curriculum, woven together.
          </h1>

          {/* Subtitle */}
          <p style={{
            ...fadeIn(0.28),
            fontSize: isMobile ? 14 : 15, color: C.textSecondary,
            lineHeight: 1.75, maxWidth: 340,
            marginBottom: isMobile ? 0 : 32,
          }}>
            AI-powered assessment generation, curriculum mapping, and student mastery tracking — all connected in one knowledge graph.
          </p>
        </div>

        {/* Bottom: Pillar grid (desktop only) */}
        {!isMobile && (
          <div style={{ ...fadeIn(0.34), position: "relative", zIndex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {pillars.map((p, i) => (
                <div key={i} style={{
                  padding: 12, borderRadius: 8, border: `1px solid ${C.borderLight}`,
                  background: `${p.bg}08`,
                }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: p.bg, marginBottom: 8 }} />
                  <div style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>
                    {p.label}
                  </div>
                  <div style={{ fontFamily: sans, fontSize: 11, color: C.textSecondary, marginTop: 2 }}>
                    {p.sub}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: mono, fontSize: 8, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center" }}>
              MOREHOUSE SCHOOL OF MEDICINE
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ RIGHT: FORM PANEL (cream) ═══════════════ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: isMobile ? "24px 20px" : isTablet ? "32px 24px" : "48px 32px",
      }}>
        <div style={{ width: "100%", maxWidth: 400, ...fadeIn(0.38) }}>
          {/* White card on cream bg */}
          <div style={{
            background: C.white, borderRadius: 12, padding: isMobile ? "28px 24px" : "32px 32px",
            border: `1px solid ${C.borderLight}`,
            boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
          }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontFamily: serif, fontSize: isMobile ? 24 : 28, fontWeight: 700, color: C.navyDeep, lineHeight: 1.2, marginBottom: 8 }}>
                Sign In
              </h2>
              <p style={{ fontSize: 14, color: C.textSecondary }}>
                Choose your role and enter your credentials
              </p>
            </div>

            {/* Role tabs */}
            <div style={{
              display: "flex", gap: 2, background: C.parchment, border: `1px solid ${C.borderLight}`,
              borderRadius: 8, padding: 4, marginBottom: 24,
            }}>
              {roles.map(r => (
                <button key={r.key} onClick={() => setActiveRole(r.key)} style={{
                  flex: 1, padding: "10px 8px", borderRadius: 6, border: "none",
                  background: activeRole === r.key ? C.white : "transparent",
                  color: activeRole === r.key ? C.navyDeep : C.textMuted,
                  fontFamily: sans, fontSize: 13, fontWeight: activeRole === r.key ? 600 : 400,
                  cursor: "pointer", transition: "all 0.15s",
                  boxShadow: activeRole === r.key ? "0 1px 3px rgba(0,44,118,0.04)" : "none",
                }}>
                  {r.label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Email */}
              <div>
                <label htmlFor="email" style={{
                  display: "block", fontFamily: mono, fontSize: 10, color: C.textMuted,
                  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6,
                }}>
                  Email
                </label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@msm.edu"
                  style={{
                    width: "100%", padding: "12px 14px", borderRadius: 8,
                    border: `1px solid ${C.border}`, background: C.parchment,
                    fontFamily: sans, fontSize: 15, color: C.ink,
                    outline: "none", transition: "all 0.2s",
                  }}
                  onFocus={e => { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)"; }}
                  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{
                  display: "block", fontFamily: mono, fontSize: 10, color: C.textMuted,
                  letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6,
                }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      width: "100%", padding: "12px 42px 12px 14px", borderRadius: 8,
                      border: `1px solid ${C.border}`, background: C.parchment,
                      fontFamily: sans, fontSize: 15, color: C.ink,
                      outline: "none", transition: "all 0.2s",
                    }}
                    onFocus={e => { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)"; }}
                    onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    color: C.textMuted, transition: "color 0.15s",
                  }}>
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 14, color: C.textSecondary }}>Remember me</span>
                </label>
                <a href="/forgot-password" style={{ fontSize: 14, color: C.blueMid, fontWeight: 600, textDecoration: "none", transition: "color 0.15s" }}
                  onMouseEnter={e => e.target.style.color = C.navyDeep}
                  onMouseLeave={e => e.target.style.color = C.blueMid}
                >
                  Forgot password?
                </a>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: "10px 12px", borderRadius: 6,
                  background: "#fef2ee", border: "1px solid #f8d7d2",
                }}>
                  <p style={{ fontSize: 13, color: C.error, margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} style={{
                width: "100%", padding: "13px 24px", borderRadius: 6,
                border: "none", background: C.navyDeep, color: C.white,
                fontFamily: sans, fontSize: 15, fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                opacity: loading ? 0.7 : 1,
              }}
                onMouseEnter={e => !loading && (e.target.style.background = C.blue)}
                onMouseLeave={e => e.target.style.background = C.navyDeep}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Sign up link */}
            <div style={{
              marginTop: 24, paddingTop: 24, borderTop: `1px solid ${C.borderLight}`,
              textAlign: "center",
            }}>
              <p style={{ fontSize: 14, color: C.textSecondary, margin: 0 }}>
                Don't have an account?{" "}
                <a href="/role-selection" style={{
                  color: C.blueMid, fontWeight: 600, textDecoration: "none", transition: "color 0.15s",
                }}
                  onMouseEnter={e => e.target.style.color = C.navyDeep}
                  onMouseLeave={e => e.target.style.color = C.blueMid}
                >
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
