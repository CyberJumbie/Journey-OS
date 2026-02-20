import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — INVITATION ACCEPT (STORY-U-9)
// Template C: Split Panel Auth Flow
// Surface: white brand panel + cream form panel → white card → parchment input
// States: Validating, Invalid, Form, Submitting, Success, Error
// Data: email (readonly), full_name, password, confirmPassword
// ═══════════════════════════════════════════════════════════════

const C = {
  navyDeep: "#002c76", navy: "#003265", blue: "#004ebc",
  blueMid: "#2b71b9", blueLight: "#00a8e1",
  greenDark: "#5d7203", green: "#69a338",
  ink: "#1b232a", warmGray: "#d7d3c8", cream: "#f5f3ef",
  parchment: "#faf9f6", white: "#ffffff",
  textPrimary: "#1b232a", textSecondary: "#4a5568", textMuted: "#718096",
  border: "#e2dfd8", borderLight: "#edeae4",
  danger: "#c9282d", warning: "#fa9d33",
};

const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, system-ui, sans-serif";
const serif = "'Lora', Georgia, serif";
const mono = "'DM Mono', Menlo, monospace";

type InvitationState = "validating" | "invalid" | "form" | "submitting" | "success" | "error";

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

export default function InvitationAccept() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<InvitationState>("validating");
  const [invitationData, setInvitationData] = useState<{
    email: string;
    role: string;
    institution_name: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password validation
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    number: false,
  });

  useEffect(() => {
    setMounted(true);
    const token = searchParams.get("token");
    if (token) {
      validateInvitation(token);
    } else {
      setState("invalid");
      setErrorMessage("No invitation token provided");
    }
  }, [searchParams]);

  const validateInvitation = async (token: string) => {
    try {
      const response = await fetch(`/api/v1/auth/invitation/validate?token=${token}`);
      
      if (!response.ok) {
        setState("invalid");
        const data = await response.json();
        setErrorMessage(data.message || "Invalid or expired invitation");
        return;
      }

      const data = await response.json();
      setInvitationData(data);
      setState("form");
    } catch (err) {
      setState("error");
      setErrorMessage("Failed to validate invitation. Please try again.");
    }
  };

  const handlePasswordChange = (value: string) => {
    setFormData((prev) => ({ ...prev, password: value }));
    setPasswordChecks({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      number: /\d/.test(value),
    });
    if (errors.password) {
      setErrors((prev) => {
        const { password, ...rest } = prev;
        return rest;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.full_name || formData.full_name.length < 2) {
      newErrors.full_name = "Name must be at least 2 characters";
    }

    if (!formData.password || formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
      newErrors.password = "Password requirements not met";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setState("submitting");
    setErrorMessage(null);

    try {
      const token = searchParams.get("token");
      const response = await fetch("/api/v1/auth/invitation/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          full_name: formData.full_name,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to accept invitation");
      }

      setState("success");
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred");
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
            You've been invited
          </h2>
          <p style={{
            fontFamily: sans,
            fontSize: 15,
            color: C.textSecondary,
            lineHeight: 1.7,
          }}>
            {invitationData 
              ? `Join ${invitationData.institution_name} as ${invitationData.role}`
              : "Complete your account setup to get started"}
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
              {invitationData?.institution_name || "Morehouse School of Medicine"}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // Loading/Validating State
  if (state === "validating") {
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
              width: 48,
              height: 48,
              borderRadius: "50%",
              border: `3px solid ${C.borderLight}`,
              borderTopColor: C.blueMid,
              margin: "0 auto 24px",
              animation: "spin 1s linear infinite",
            }} />
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
            }}>
              Validating invitation...
            </p>
            <style>
              {`@keyframes spin { to { transform: rotate(360deg); } }`}
            </style>
          </div>
        </div>
      </div>
    );
  }

  // Invalid or Error State
  if (state === "invalid" || (state === "error" && !invitationData)) {
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
              background: "rgba(201,40,45,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}>
              <span style={{ fontSize: 36, color: C.danger }}>✕</span>
            </div>
            <h2 style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.3,
              marginBottom: 12,
            }}>
              Invalid Invitation
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 24,
            }}>
              {errorMessage || "This invitation link is invalid or has expired. Please contact your administrator."}
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
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success State
  if (state === "success") {
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
              <span style={{ fontSize: 36, color: C.green }}>✓</span>
            </div>
            <h2 style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.3,
              marginBottom: 12,
            }}>
              Account Created!
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 24,
            }}>
              Welcome to Journey OS, <strong style={{ color: C.ink }}>{formData.full_name}</strong>!
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
              Sign In →
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
                Complete Your Profile
              </h2>
              <p style={{
                fontFamily: sans,
                fontSize: 14,
                color: C.textSecondary,
                lineHeight: 1.7,
              }}>
                Set up your account to get started
              </p>
            </div>

            {/* Error Alert */}
            {state === "error" && errorMessage && (
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
                  {errorMessage}
                </p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email (readonly) */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
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
                  type="email"
                  value={invitationData?.email || ""}
                  readOnly
                  style={{
                    width: "100%",
                    height: 44,
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    padding: "0 16px",
                    fontFamily: sans,
                    fontSize: 16,
                    color: C.textMuted,
                    outline: "none",
                    cursor: "not-allowed",
                  }}
                />
              </div>

              {/* Full Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block",
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 6,
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, full_name: e.target.value }));
                    if (errors.full_name) {
                      setErrors((prev) => {
                        const { full_name, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  placeholder="Dr. Jane Smith"
                  disabled={state === "submitting"}
                  style={{
                    width: "100%",
                    height: 44,
                    background: C.parchment,
                    border: `1px solid ${errors.full_name ? C.danger : C.border}`,
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
                    e.target.style.borderColor = errors.full_name ? C.danger : C.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
                {errors.full_name && (
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.danger, marginTop: 4 }}>
                    {errors.full_name}
                  </p>
                )}
              </div>

              {/* Password */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block",
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 6,
                }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={state === "submitting"}
                    style={{
                      width: "100%",
                      height: 44,
                      background: C.parchment,
                      border: `1px solid ${errors.password ? C.danger : C.border}`,
                      borderRadius: 8,
                      padding: "0 40px 0 16px",
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
                      e.target.style.borderColor = errors.password ? C.danger : C.border;
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: C.textMuted,
                    }}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {errors.password && (
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.danger, marginTop: 4 }}>
                    {errors.password}
                  </p>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
                  {[
                    { label: "At least 8 characters", check: passwordChecks.length },
                    { label: "One uppercase letter", check: passwordChecks.uppercase },
                    { label: "One number", check: passwordChecks.number },
                  ].map((req) => (
                    <div key={req.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: req.check ? C.green : C.warmGray,
                      }} />
                      <span style={{
                        fontFamily: sans,
                        fontSize: 13,
                        color: req.check ? C.green : C.textMuted,
                      }}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: 24 }}>
                <label style={{
                  display: "block",
                  fontFamily: mono,
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: C.textMuted,
                  marginBottom: 6,
                }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }));
                      if (errors.confirmPassword) {
                        setErrors((prev) => {
                          const { confirmPassword, ...rest } = prev;
                          return rest;
                        });
                      }
                    }}
                    placeholder="Re-enter your password"
                    disabled={state === "submitting"}
                    style={{
                      width: "100%",
                      height: 44,
                      background: C.parchment,
                      border: `1px solid ${errors.confirmPassword ? C.danger : C.border}`,
                      borderRadius: 8,
                      padding: "0 40px 0 16px",
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
                      e.target.style.borderColor = errors.confirmPassword ? C.danger : C.border;
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: C.textMuted,
                    }}
                  >
                    {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.danger, marginTop: 4 }}>
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={state === "submitting"}
                style={{
                  width: "100%",
                  height: 48,
                  background: state === "submitting" ? C.textMuted : C.navyDeep,
                  border: "none",
                  borderRadius: 6,
                  fontFamily: sans,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.white,
                  cursor: state === "submitting" ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (state !== "submitting") {
                    e.currentTarget.style.background = C.blue;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (state !== "submitting") {
                    e.currentTarget.style.background = C.navyDeep;
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                {state === "submitting" ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
