import { useState, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — LOGIN PAGE
// MSM Brand: Education Pillar (Evergreens) + True Blues
// Split layout: brand panel left, form right
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

// ─── Woven thread background ────────────────────────────────────
function WovenField({ color = C.navyDeep, opacity = 0.03, density = 16 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };
    function draw() {
      const cw = canvas.offsetWidth, ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw * 2, ch * 2);
      const spacing = cw / density;
      for (let y = 0; y < ch; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < cw; x += 4)
          ctx.lineTo(x, y + Math.sin(x * 0.015 + y * 0.01) * 1.5);
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      for (let x = 0; x < cw; x += spacing * 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < ch; y += 4)
          ctx.lineTo(x + Math.sin(y * 0.012 + x * 0.008) * 1.5, y);
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity * 0.7;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [color, opacity, density]);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

// ─── Ascending squares ──────────────────────────────────────────
function AscendingSquares({ colors, size = 14, gap = 4, style = {} }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap, ...style }}>
      {colors.map((c, i) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: Math.max(2, size * 0.14),
          background: c, transform: `translateY(${(colors.length - 1 - i) * -(size * 0.2)}px)`,
        }} />
      ))}
    </div>
  );
}

// ─── Responsive hook ────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState("desktop");
  useEffect(() => {
    const check = () => setBp(window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop");
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return bp;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function LoginPage() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [activeRole, setActiveRole] = useState("faculty");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, system-ui, sans-serif";
  const serif = "'Lora', 'Georgia', serif";
  const mono = "'DM Mono', 'Menlo', monospace";

  const canSubmit = email.length > 0 && password.length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 1500);
  }

  // ─── Brand panel content blocks ───────────────────────────────
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

  // Animation helpers
  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div style={{ fontFamily: sans, minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", background: C.cream }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* ═══════════════ LEFT: BRAND PANEL ═══════════════ */}
      <div style={{
        flex: isMobile ? "none" : isTablet ? "0 0 340px" : "0 0 480px",
        position: "relative", overflow: "hidden",
        background: C.white,
        borderRight: isMobile ? "none" : `1px solid ${C.borderLight}`,
        borderBottom: isMobile ? `1px solid ${C.borderLight}` : "none",
        display: "flex", flexDirection: "column", justifyContent: "space-between",
        minHeight: isMobile ? "auto" : "100vh",
        padding: isMobile ? "32px 24px 28px" : isTablet ? "40px 32px" : "48px 44px",
      }}>
        <WovenField color={C.navyDeep} opacity={0.02} density={14} />

        {/* Top: Logo + tagline */}
        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div style={{ ...fadeIn(0.1), display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 24 : 48 }}>
            <span style={{ fontFamily: serif, fontSize: isMobile ? 20 : 24, fontWeight: 700, color: C.navyDeep }}>Journey</span>
            <span style={{ fontFamily: mono, fontSize: 9, color: C.greenDark, letterSpacing: "0.1em", border: `1.5px solid ${C.greenDark}`, padding: "2px 7px", borderRadius: 3 }}>OS</span>
          </div>

          {/* Ascending squares */}
          <div style={fadeIn(0.18)}>
            <AscendingSquares colors={[C.navyDeep, C.blue, C.blueMid, C.green]} size={isMobile ? 10 : 14} gap={4} style={{ marginBottom: isMobile ? 16 : 24 }} />
          </div>

          {/* H1 */}
          <div style={fadeIn(0.24)}>
            <h1 style={{
              fontFamily: serif, fontWeight: 700,
              fontSize: isMobile ? 26 : isTablet ? 28 : 36,
              lineHeight: 1.2, letterSpacing: "-0.015em",
              color: C.navyDeep, marginBottom: isMobile ? 12 : 20,
              maxWidth: 360,
            }}>
              Every thread of your curriculum, woven together.
            </h1>
          </div>

          {/* Subtitle */}
          <div style={fadeIn(0.3)}>
            <p style={{
              fontSize: isMobile ? 14 : 15, color: C.textSecondary,
              lineHeight: 1.75, maxWidth: 340,
              marginBottom: isMobile ? 0 : 32,
            }}>
              AI-powered assessment generation, curriculum mapping, and student mastery tracking — all connected in one knowledge graph.
            </p>
          </div>
        </div>

        {/* Bottom: Pillar grid — hidden on mobile */}
        {!isMobile && (
          <div style={{ position: "relative", zIndex: 1, ...fadeIn(0.4) }}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 6, maxWidth: isTablet ? 240 : 280,
            }}>
              {pillars.map((p, i) => (
                <div key={i} style={{
                  background: p.bg, borderRadius: 8,
                  padding: isTablet ? "14px 12px" : "16px 14px",
                  position: "relative", overflow: "hidden",
                }}>
                  {/* Weave texture */}
                  <div style={{
                    position: "absolute", inset: 0, opacity: 0.06,
                    backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 5px),
                      repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 5px)`,
                  }} />
                  <span style={{ fontFamily: mono, fontSize: 8, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 2, position: "relative" }}>{p.sub}</span>
                  <span style={{ fontFamily: serif, fontSize: isTablet ? 12 : 13, fontWeight: 600, color: C.white, position: "relative" }}>{p.label}</span>
                </div>
              ))}
            </div>

            {/* Thread line below grid */}
            <svg style={{ marginTop: 16, opacity: 0.2, maxWidth: 160 }} height="8" viewBox="0 0 160 8" preserveAspectRatio="none">
              <path d="M0,4 Q20,1 40,4 T80,4 T120,4 T160,4" stroke={C.warmGray} strokeWidth="1.2" fill="none" />
            </svg>

            <p style={{ fontFamily: sans, fontSize: 12, color: C.textMuted, marginTop: 12 }}>
              Morehouse School of Medicine
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════ RIGHT: LOGIN FORM ═══════════════ */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: isMobile ? "32px 20px 40px" : "40px 32px",
        position: "relative", overflow: "hidden",
      }}>
        {/* Subtle corner decoration */}
        {!isMobile && (
          <div style={{ position: "absolute", top: 32, right: 32, opacity: 0.06 }}>
            <AscendingSquares colors={[C.borderLight, C.warmGray, C.border, C.borderLight]} size={10} gap={3} />
          </div>
        )}

        <div style={{
          width: "100%", maxWidth: 400,
          ...fadeIn(isMobile ? 0.1 : 0.3),
        }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            {/* Mobile logo */}
            {isMobile && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
                <span style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, color: C.navyDeep }}>Journey</span>
                <span style={{ fontFamily: mono, fontSize: 9, color: C.greenDark, letterSpacing: "0.1em", border: `1.5px solid ${C.greenDark}`, padding: "2px 7px", borderRadius: 3 }}>OS</span>
              </div>
            )}
            <h2 style={{
              fontFamily: serif, fontSize: isMobile ? 26 : 30, fontWeight: 700,
              color: C.navyDeep, marginBottom: 6, letterSpacing: "-0.01em",
            }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: C.textMuted }}>Sign in to continue to Journey OS</p>
          </div>

          {/* Role tabs */}
          <div style={{
            display: "flex", gap: 2, marginBottom: 28,
            background: C.parchment, borderRadius: 8, padding: 3,
            border: `1px solid ${C.borderLight}`,
          }}>
            {roles.map(r => (
              <button key={r.key} onClick={() => setActiveRole(r.key)} style={{
                flex: 1, fontFamily: sans, fontSize: 13, fontWeight: activeRole === r.key ? 700 : 500,
                color: activeRole === r.key ? C.navyDeep : C.textMuted,
                background: activeRole === r.key ? C.white : "transparent",
                border: "none",
                borderRadius: 6, padding: "9px 0", cursor: "pointer",
                transition: "all 0.2s",
                boxShadow: activeRole === r.key ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
              }}>
                {r.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Email */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@msm.edu"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "13px 16px",
                  background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8,
                  fontFamily: sans, fontSize: 15, color: C.textPrimary, outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%", boxSizing: "border-box", padding: "13px 48px 13px 16px",
                    background: C.parchment, border: `1px solid ${C.border}`, borderRadius: 8,
                    fontFamily: sans, fontSize: 15, color: C.textPrimary, outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={e => { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; }}
                  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    color: C.textMuted, fontSize: 16, lineHeight: 1,
                    display: "flex", alignItems: "center",
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  type="button"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div
                  onClick={() => setRemember(!remember)}
                  style={{
                    width: 18, height: 18, borderRadius: 4,
                    border: `1.5px solid ${remember ? C.navyDeep : C.border}`,
                    background: remember ? C.navyDeep : C.white,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s", cursor: "pointer",
                  }}
                >
                  {remember && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>Remember me</span>
              </label>
              <a href="/forgot-password" style={{
                fontFamily: sans, fontSize: 13, color: C.blueMid, textDecoration: "none",
                fontWeight: 500, transition: "color 0.2s",
              }}
                onMouseEnter={e => e.target.style.color = C.navyDeep}
                onMouseLeave={e => e.target.style.color = C.blueMid}>
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 8, border: "none",
                fontFamily: sans, fontSize: 15, fontWeight: 700, letterSpacing: "0.01em",
                cursor: (!canSubmit || loading) ? "default" : "pointer",
                background: (!canSubmit) ? C.warmGray : C.navyDeep,
                color: (!canSubmit) ? C.textMuted : C.white,
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { if (canSubmit && !loading) e.target.style.background = C.blue; }}
              onMouseLeave={e => { if (canSubmit && !loading) e.target.style.background = C.navyDeep; }}
            >
              {loading ? (
                <div style={{
                  width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white", borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }} />
              ) : "Sign in"}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: C.borderLight }} />
              <span style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em" }}>OR</span>
              <div style={{ flex: 1, height: 1, background: C.borderLight }} />
            </div>

            {/* Google */}
            <button
              style={{
                width: "100%", padding: "13px 0", borderRadius: 8,
                border: `1.5px solid ${C.border}`, background: C.white,
                fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary,
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,44,118,0.06)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
            >
              {/* Google icon */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>

          {/* Footer */}
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 14 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="10" height="8" rx="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" />
              </svg>
              <span style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Protected by Journey OS</span>
            </div>
            <p style={{ fontSize: 13, color: C.textMuted }}>
              Don't have an account?{" "}
              <a href="/waitlist" style={{ color: C.blueMid, textDecoration: "none", fontWeight: 600, transition: "color 0.2s" }}
                onMouseEnter={e => e.target.style.color = C.navyDeep}
                onMouseLeave={e => e.target.style.color = C.blueMid}>
                Join the waitlist
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
