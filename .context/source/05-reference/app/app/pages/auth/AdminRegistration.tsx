import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — ADMIN REGISTRATION PAGE
// MSM Brand: Education Pillar (Evergreens) + True Blues
// Centered form layout with validation
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

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AdminRegistration() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
    title: "",
    institutionName: "",
    accessCode: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => { setMounted(true); }, []);

  const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, system-ui, sans-serif";
  const serif = "'Lora', 'Georgia', serif";
  const mono = "'DM Mono', 'Menlo', monospace";

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!formData.email.endsWith("@msm.edu")) {
      newErrors.email = "Email must be from @msm.edu domain";
    }

    if (!formData.institutionName.trim()) {
      newErrors.institutionName = "Institution name is required";
    }

    if (!formData.accessCode.trim()) {
      newErrors.accessCode = "Admin access code is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  // Success State
  if (success) {
    return (
      <div style={{
        fontFamily: sans, minHeight: "100vh", background: C.cream,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 20px", position: "relative", overflow: "hidden",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
        <WovenField color={C.navyDeep} opacity={0.02} density={20} />

        <div style={{
          width: "100%", maxWidth: 460, background: C.white,
          borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          padding: "48px 40px", textAlign: "center", position: "relative", zIndex: 1,
        }}>
          {/* Success icon */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: `${C.green}12`, border: `2px solid ${C.green}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>

          <h2 style={{
            fontFamily: serif, fontSize: 28, fontWeight: 700,
            color: C.navyDeep, marginBottom: 8, letterSpacing: "-0.01em",
          }}>
            Check Your Email
          </h2>
          <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 6, lineHeight: 1.6 }}>
            We've sent a verification link to
          </p>
          <p style={{ fontSize: 15, color: C.textPrimary, fontWeight: 600, marginBottom: 24 }}>
            {formData.email}
          </p>
          <p style={{ fontSize: 13, color: C.textSecondary, marginBottom: 28, lineHeight: 1.6 }}>
            Click the link in the email to verify your account and complete registration.
          </p>

          <button
            onClick={() => navigate("/login")}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 8,
              border: `1.5px solid ${C.border}`, background: C.white,
              fontFamily: sans, fontSize: 14, fontWeight: 600, color: C.textPrimary,
              cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.blueMid; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,44,118,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div style={{
      fontFamily: sans, minHeight: "100vh", background: C.cream,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "40px 20px", position: "relative", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&family=DM+Mono:wght@300;400;500&display=swap" rel="stylesheet" />
      <WovenField color={C.navyDeep} opacity={0.02} density={20} />

      <div style={{ width: "100%", maxWidth: 540, position: "relative", zIndex: 1 }}>
        {/* Back link */}
        <Link to="/" style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontFamily: sans, fontSize: 13, color: C.textMuted,
          textDecoration: "none", marginBottom: 24, transition: "color 0.2s",
          ...fadeIn(0.1),
        }}
          onMouseEnter={e => e.target.style.color = C.ink}
          onMouseLeave={e => e.target.style.color = C.textMuted}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to role selection
        </Link>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24, ...fadeIn(0.15) }}>
          <div style={{
            width: 48, height: 48, borderRadius: 8,
            background: C.navyDeep, display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontFamily: serif, fontSize: 24, fontWeight: 700, color: C.white,
          }}>
            🛡️
          </div>
          <h1 style={{
            fontFamily: serif, fontSize: 28, fontWeight: 700,
            color: C.navyDeep, marginBottom: 6, letterSpacing: "-0.01em",
          }}>
            Admin Registration
          </h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>
            Create your institutional admin account
          </p>
        </div>

        {/* Info Alert */}
        <div style={{
          background: `${C.blueMid}08`, border: `1px solid ${C.blueMid}30`,
          borderRadius: 8, padding: "14px 16px", marginBottom: 24,
          display: "flex", gap: 12, ...fadeIn(0.2),
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.blueMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.6, margin: 0 }}>
            Admin accounts require a valid access code provided by your institution.
          </p>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} style={{
          background: C.white, borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          padding: "32px 28px", ...fadeIn(0.25),
        }}>
          {error && (
            <div style={{
              background: `${C.error}08`, border: `1px solid ${C.error}30`,
              borderRadius: 8, padding: "14px 16px", marginBottom: 20,
              display: "flex", gap: 12,
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p style={{ fontSize: 13, color: C.error, margin: 0 }}>{error}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Full Name */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Smith"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  background: C.parchment, border: `1px solid ${errors.name ? C.error : C.border}`,
                  borderRadius: 8, fontFamily: sans, fontSize: 15, color: C.textPrimary,
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { if (!errors.name) { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; } }}
                onBlur={e => { e.target.style.borderColor = errors.name ? C.error : C.border; e.target.style.boxShadow = "none"; }}
              />
              {errors.name && <p style={{ fontSize: 12, color: C.error, marginTop: 4 }}>{errors.name}</p>}
            </div>

            {/* Email */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@msm.edu"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  background: C.parchment, border: `1px solid ${errors.email ? C.error : C.border}`,
                  borderRadius: 8, fontFamily: sans, fontSize: 15, color: C.textPrimary,
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { if (!errors.email) { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; } }}
                onBlur={e => { e.target.style.borderColor = errors.email ? C.error : C.border; e.target.style.boxShadow = "none"; }}
              />
              {errors.email && <p style={{ fontSize: 12, color: C.error, marginTop: 4 }}>{errors.email}</p>}
            </div>

            {/* Title */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Director of Medical Education"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  background: C.parchment, border: `1px solid ${C.border}`,
                  borderRadius: 8, fontFamily: sans, fontSize: 15, color: C.textPrimary,
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; }}
                onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Institution Name */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Institution Name *
              </label>
              <input
                type="text"
                value={formData.institutionName}
                onChange={e => setFormData({ ...formData, institutionName: e.target.value })}
                placeholder="Morehouse School of Medicine"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  background: C.parchment, border: `1px solid ${errors.institutionName ? C.error : C.border}`,
                  borderRadius: 8, fontFamily: sans, fontSize: 15, color: C.textPrimary,
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { if (!errors.institutionName) { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; } }}
                onBlur={e => { e.target.style.borderColor = errors.institutionName ? C.error : C.border; e.target.style.boxShadow = "none"; }}
              />
              {errors.institutionName && <p style={{ fontSize: 12, color: C.error, marginTop: 4 }}>{errors.institutionName}</p>}
            </div>

            {/* Access Code */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Admin Access Code *
              </label>
              <input
                type="text"
                value={formData.accessCode}
                onChange={e => setFormData({ ...formData, accessCode: e.target.value })}
                placeholder="Enter provided access code"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  background: C.parchment, border: `1px solid ${errors.accessCode ? C.error : C.border}`,
                  borderRadius: 8, fontFamily: sans, fontSize: 15, color: C.textPrimary,
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { if (!errors.accessCode) { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; } }}
                onBlur={e => { e.target.style.borderColor = errors.accessCode ? C.error : C.border; e.target.style.boxShadow = "none"; }}
              />
              {errors.accessCode && <p style={{ fontSize: 12, color: C.error, marginTop: 4 }}>{errors.accessCode}</p>}
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                Contact your institution administrator for an access code
              </p>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 8 characters"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  background: C.parchment, border: `1px solid ${errors.password ? C.error : C.border}`,
                  borderRadius: 8, fontFamily: sans, fontSize: 15, color: C.textPrimary,
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { if (!errors.password) { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; } }}
                onBlur={e => { e.target.style.borderColor = errors.password ? C.error : C.border; e.target.style.boxShadow = "none"; }}
              />
              {errors.password && <p style={{ fontSize: 12, color: C.error, marginTop: 4 }}>{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ fontFamily: mono, fontSize: 10, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Confirm Password *
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                style={{
                  width: "100%", boxSizing: "border-box", padding: "12px 14px",
                  background: C.parchment, border: `1px solid ${errors.confirmPassword ? C.error : C.border}`,
                  borderRadius: 8, fontFamily: sans, fontSize: 15, color: C.textPrimary,
                  outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={e => { if (!errors.confirmPassword) { e.target.style.borderColor = C.blueMid; e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`; } }}
                onBlur={e => { e.target.style.borderColor = errors.confirmPassword ? C.error : C.border; e.target.style.boxShadow = "none"; }}
              />
              {errors.confirmPassword && <p style={{ fontSize: 12, color: C.error, marginTop: 4 }}>{errors.confirmPassword}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 8, border: "none",
                fontFamily: sans, fontSize: 15, fontWeight: 700,
                background: isLoading ? C.warmGray : C.navyDeep,
                color: isLoading ? C.textMuted : C.white,
                cursor: isLoading ? "default" : "pointer",
                transition: "all 0.2s", marginTop: 4,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={e => { if (!isLoading) e.target.style.background = C.blue; }}
              onMouseLeave={e => { if (!isLoading) e.target.style.background = C.navyDeep; }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid white", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  Creating Account...
                </>
              ) : "Create Admin Account"}
            </button>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: "center", paddingTop: 20, marginTop: 20,
            borderTop: `1px solid ${C.borderLight}`,
          }}>
            <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "none", border: "none", padding: 0,
                  fontFamily: sans, fontSize: 13, fontWeight: 600,
                  color: C.blueMid, cursor: "pointer", transition: "color 0.2s",
                }}
                onMouseEnter={e => e.target.style.color = C.navyDeep}
                onMouseLeave={e => e.target.style.color = C.blueMid}
              >
                Sign in
              </button>
            </p>
          </div>
        </form>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
