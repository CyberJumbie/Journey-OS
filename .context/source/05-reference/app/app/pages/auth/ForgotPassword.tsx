import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — FORGOT PASSWORD FORM (STORY-U-5)
// Template C: Split Panel Auth Flow
// Surface: white brand panel + cream form panel → white card → parchment input
// ═══════════════════════════════════════════════════════════════

const C = {
  navyDeep: "#002c76", navy: "#003265", blue: "#004ebc",
  blueMid: "#2b71b9", blueLight: "#00a8e1",
  greenDark: "#5d7203", green: "#69a338",
  ink: "#1b232a", warmGray: "#d7d3c8", cream: "#f5f3ef",
  parchment: "#faf9f6", white: "#ffffff",
  textPrimary: "#1b232a", textSecondary: "#4a5568", textMuted: "#718096",
  border: "#e2dfd8", borderLight: "#edeae4",
  danger: "#c9282d",
};

const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, system-ui, sans-serif";
const serif = "'Lora', Georgia, serif";
const mono = "'DM Mono', Menlo, monospace";

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

// ─── Woven Field ────────────────────────────────────────────────
function WovenField({ color = C.navyDeep, opacity = 0.02, density = 14 }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = c.offsetWidth * dpr;
      c.height = c.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = c.offsetWidth, ch = c.offsetHeight, sp = cw / density;
      ctx.clearRect(0, 0, cw * 2, ch * 2);
      for (let y = 0; y < ch; y += sp) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x < cw; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.015 + y * 0.01) * 1.5);
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
      for (let x = 0; x < cw; x += sp * 2) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        for (let y = 0; y < ch; y += 4) ctx.lineTo(x + Math.sin(y * 0.012) * 1.5, y);
        ctx.globalAlpha = opacity * 0.6;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [color, opacity, density]);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

// ─── Ascending Squares ──────────────────────────────────────────
function AscSquares({ colors, size = 14, gap = 3 }: any) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap }}>
      {colors.map((c: string, i: number) => (
        <div key={i} style={{
          width: size, height: size, borderRadius: Math.max(2, size * 0.14),
          background: c, transform: `translateY(${(colors.length - 1 - i) * -(size * 0.2)}px)`,
        }} />
      ))}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        } else if (response.status === 404) {
          // Don't reveal if email exists - still show success
          setIsSuccess(true);
          return;
        } else {
          const data = await response.json();
          throw new Error(data.message || "Something went wrong. Please try again.");
        }
      }

      setIsSuccess(true);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.6s ease ${d}s, transform 0.6s ease ${d}s`,
  });

  // Brand Panel
  const BrandPanel = () => (
    <div style={{
      width: isMobile ? "100%" : isTablet ? 340 : 480,
      flexShrink: 0,
      background: C.white,
      borderRight: isMobile ? "none" : `1px solid ${C.borderLight}`,
      borderBottom: isMobile ? `1px solid ${C.borderLight}` : "none",
      position: "relative",
      overflow: "hidden",
    }}>
      <WovenField color={C.navyDeep} opacity={0.02} density={14} />
      <div style={{
        position: "relative",
        zIndex: 10,
        padding: isMobile ? "32px 20px" : isTablet ? "40px 24px" : "48px 32px",
        height: isMobile ? "auto" : "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        <div style={{ ...fadeIn(0) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontFamily: serif, fontSize: isMobile ? 24 : 30, fontWeight: 700, color: C.navyDeep }}>Journey</span>
            <span style={{
              fontFamily: mono,
              fontSize: 9,
              color: C.greenDark,
              letterSpacing: "0.1em",
              border: `1.2px solid ${C.greenDark}`,
              padding: "1px 6px",
              borderRadius: 3,
            }}>
              OS
            </span>
          </div>
          <AscSquares colors={[C.navyDeep, C.blue, C.blueMid, C.green]} size={14} gap={3} />
          <h2 style={{
            fontFamily: serif,
            fontSize: isMobile ? 22 : 24,
            fontWeight: 700,
            color: C.navyDeep,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: "16px 0 8px",
          }}>
            Reset your password
          </h2>
          <p style={{
            fontFamily: sans,
            fontSize: 15,
            color: C.textSecondary,
            lineHeight: 1.7,
          }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {!isMobile && (
          <div style={{ marginTop: 48, paddingTop: 48, borderTop: `1px solid ${C.borderLight}`, ...fadeIn(0.2) }}>
            <p style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.textMuted,
              textAlign: "center",
            }}>
              Morehouse School of Medicine
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Success State
  if (isSuccess) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", flexDirection: isMobile ? "column" : "row" }}>
        <BrandPanel />
        <div style={{
          flex: 1,
          background: C.cream,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "32px 20px" : "48px 32px",
        }}>
          <div style={{
            maxWidth: 448,
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
            padding: isMobile ? "40px 24px" : "48px 32px",
            textAlign: "center",
            ...fadeIn(0.3),
          }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "rgba(105,163,56,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.3,
              marginBottom: 12,
            }}>
              Check Your Email
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 32,
            }}>
              If an account exists for{" "}
              <strong style={{ color: C.ink }}>{email}</strong>, you'll receive a password reset link within a few minutes.
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{
                width: "100%",
                height: 48,
                background: C.navyDeep,
                border: "none",
                borderRadius: 6,
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 700,
                color: C.white,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.blue;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.navyDeep;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form State
  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: isMobile ? "column" : "row" }}>
      <BrandPanel />

      <div style={{
        flex: 1,
        background: C.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "32px 20px" : "48px 32px",
      }}>
        <div style={{ width: "100%", maxWidth: 400, ...fadeIn(0.3) }}>
          <div style={{
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
            padding: isMobile ? "28px 24px" : "32px 32px",
          }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{
                fontFamily: serif,
                fontSize: isMobile ? 24 : 28,
                fontWeight: 700,
                color: C.navyDeep,
                lineHeight: 1.2,
                marginBottom: 8,
              }}>
                Forgot Password?
              </h2>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: C.textSecondary,
                lineHeight: 1.7,
              }}>
                No worries, we'll send you reset instructions.
              </p>
            </div>

            {/* Server Error */}
            {serverError && (
              <div style={{
                background: "rgba(201,40,45,0.06)",
                border: `1px solid ${C.danger}`,
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
              }}>
                <p style={{
                  fontFamily: sans,
                  fontSize: 14,
                  color: C.danger,
                  margin: 0,
                }}>
                  {serverError}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 24 }}>
                <label htmlFor="email" style={{
                  display: "block",
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 6,
                }}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                    if (serverError) setServerError(null);
                  }}
                  placeholder="your.email@msm.edu"
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    height: 44,
                    background: C.parchment,
                    border: `1px solid ${emailError ? C.danger : C.border}`,
                    borderRadius: 8,
                    padding: "0 16px",
                    fontFamily: sans,
                    fontSize: 16,
                    color: C.ink,
                    outline: "none",
                    transition: "border 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.blueMid;
                    e.target.style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = emailError ? C.danger : C.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
                {emailError && (
                  <p style={{
                    fontFamily: sans,
                    fontSize: 13,
                    color: C.danger,
                    margin: "4px 0 0",
                  }}>
                    {emailError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  height: 48,
                  background: isSubmitting ? C.textMuted : C.navyDeep,
                  border: "none",
                  borderRadius: 6,
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.white,
                  cursor: isSubmitting ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = C.blue;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = C.navyDeep;
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </button>
            </form>
          </div>

          {/* Back to Login */}
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "none",
                border: "none",
                fontFamily: sans,
                fontSize: 14,
                fontWeight: 600,
                color: C.blueMid,
                cursor: "pointer",
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = C.navyDeep;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = C.blueMid;
              }}
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
