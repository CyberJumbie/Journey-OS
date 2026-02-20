import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — REGISTRATION WIZARD (4-STEP)
// Template C: Split Panel with 4-step progress
// Surface: white brand panel + cream form panel → white card → parchment inputs
// ═══════════════════════════════════════════════════════════════

const C = {
  navyDeep: "#002c76", navy: "#003265", blue: "#004ebc",
  blueMid: "#2b71b9", blueLight: "#00a8e1", bluePale: "#a3d9ff",
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

// ─── Thread Divider ─────────────────────────────────────────────
function ThreadDivider() {
  return (
    <div style={{ position: "relative", height: 20, overflow: "hidden", margin: "0 auto", maxWidth: 200 }}>
      <svg width="100%" height="20" viewBox="0 0 200 20" preserveAspectRatio="none">
        <path d="M0,10 Q25,2 50,10 T100,10 T150,10 T200,10" stroke={C.warmGray} strokeWidth="1.5" fill="none" />
        <path d="M0,10 Q25,18 50,10 T100,10 T150,10 T200,10" stroke={C.warmGray} strokeWidth="1" fill="none" opacity="0.5" />
      </svg>
    </div>
  );
}

interface FormData {
  role: "faculty" | "student" | "advisor" | null;
  display_name: string;
  email: string;
  password: string;
  institution_id: string | null;
  institution_name: string | null;
  consented: boolean;
}

interface Institution {
  id: string;
  name: string;
  domain: string;
}

export default function Registration() {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    role: null,
    display_name: "",
    email: "",
    password: "",
    institution_id: null,
    institution_name: null,
    consented: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Step 3: Institution search
  const [institutionSearch, setInstitutionSearch] = useState("");
  const [institutionResults, setInstitutionResults] = useState<Institution[]>([]);

  // Password validation
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    number: false,
  });

  useEffect(() => { setMounted(true); }, []);

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

  const searchInstitutions = async (query: string) => {
    if (query.length < 2) {
      setInstitutionResults([]);
      return;
    }
    // Mock data
    setInstitutionResults([
      { id: "1", name: "Morehouse School of Medicine", domain: "msm.edu" },
      { id: "2", name: "Howard University College of Medicine", domain: "howard.edu" },
    ]);
  };

  const handleInstitutionSearch = (value: string) => {
    setInstitutionSearch(value);
    setTimeout(() => searchInstitutions(value), 300);
  };

  const selectInstitution = (institution: Institution) => {
    setFormData((prev) => ({
      ...prev,
      institution_id: institution.id,
      institution_name: institution.name,
    }));
    setInstitutionSearch("");
    setInstitutionResults([]);
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1 && !formData.role) return false;

    if (step === 2) {
      if (!formData.display_name || formData.display_name.length < 2) {
        newErrors.display_name = "Name must be at least 2 characters";
      }
      if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Please enter a valid email address";
      }
      if (!formData.password || formData.password.length < 8 || !/[A-Z]/.test(formData.password) || !/\d/.test(formData.password)) {
        newErrors.password = "Password requirements not met";
      }
    }

    if (step === 3 && !formData.institution_id) return false;
    if (step === 4 && !formData.consented) return false;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      setServerError(null);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
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
            Every thread of your curriculum, woven together
          </h2>
          <p style={{
            fontFamily: sans,
            fontSize: 15,
            color: C.textSecondary,
            lineHeight: 1.7,
          }}>
            AI-powered competency-based medical education
          </p>
        </div>

        {!isMobile && (
          <div style={{ marginTop: "auto", paddingTop: 48, ...fadeIn(0.2) }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Curriculum", sub: "Knowledge Graph" },
                { label: "Assessment", sub: "AI-Generated" },
                { label: "Measurement", sub: "Student Mastery" },
                { label: "Compliance", sub: "LCME Ready" },
              ].map((pillar) => (
                <div key={pillar.label}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: C.navyDeep, marginBottom: 4 }} />
                  <div style={{
                    fontFamily: mono,
                    fontSize: 8,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: C.textMuted,
                    marginBottom: 2,
                  }}>
                    {pillar.label}
                  </div>
                  <div style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary }}>
                    {pillar.sub}
                  </div>
                </div>
              ))}
            </div>
            <ThreadDivider />
            <p style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.textMuted,
              marginTop: 16,
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
              Check Your Email
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 24,
            }}>
              A verification link has been sent to{" "}
              <strong style={{ color: C.green }}>{formData.email}</strong>
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
              Go to Login →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Progress Indicator
  const ProgressIndicator = () => {
    const steps = [
      { num: 1, label: "Role" },
      { num: 2, label: "Profile" },
      { num: 3, label: "Institution" },
      { num: 4, label: "Consent" },
    ];

    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
        {steps.map((step, index) => (
          <div key={step.num} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: `2px solid ${step.num <= currentStep ? C.navyDeep : C.borderLight}`,
                background: step.num <= currentStep ? C.navyDeep : C.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
              }}>
                <span style={{
                  fontFamily: mono,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: step.num <= currentStep ? C.white : C.textMuted,
                }}>
                  {step.num}
                </span>
              </div>
              {!isMobile && (
                <span style={{
                  fontFamily: mono,
                  fontSize: 9,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: step.num <= currentStep ? C.navyDeep : C.textMuted,
                  marginTop: 8,
                }}>
                  {step.label}
                </span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div style={{
                width: isMobile ? 40 : 60,
                height: 2,
                background: step.num < currentStep ? C.navyDeep : C.borderLight,
                margin: "0 8px",
                transition: "all 0.3s ease",
              }} />
            )}
          </div>
        ))}
      </div>
    );
  };

  // Step Content Renderer
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2 style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.3,
              marginBottom: 24,
              textAlign: "center",
            }}>
              Select Your Role
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { value: "faculty" as const, label: "Faculty", desc: "Create and manage course content, assessments, and curricula." },
                { value: "student" as const, label: "Student", desc: "Access learning paths, practice questions, and track your progress." },
                { value: "advisor" as const, label: "Advisor", desc: "Monitor student progress, set alerts, and manage interventions." },
              ].map((role) => (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, role: role.value }))}
                  style={{
                    padding: "20px",
                    borderRadius: 8,
                    border: `2px solid ${formData.role === role.value ? C.blueMid : C.borderLight}`,
                    background: formData.role === role.value ? "rgba(43,113,185,0.03)" : C.white,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (formData.role !== role.value) {
                      e.currentTarget.style.borderColor = C.blueMid;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.role !== role.value) {
                      e.currentTarget.style.borderColor = C.borderLight;
                    }
                  }}
                >
                  <div style={{
                    fontFamily: sans,
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.navyDeep,
                    marginBottom: 4,
                  }}>
                    {role.label}
                  </div>
                  <div style={{
                    fontFamily: sans,
                    fontSize: 15,
                    color: C.textSecondary,
                    lineHeight: 1.7,
                  }}>
                    {role.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.3,
              marginBottom: 24,
              textAlign: "center",
            }}>
              Profile Information
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Name */}
              <div>
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
                  value={formData.display_name}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, display_name: e.target.value }));
                    if (errors.display_name) {
                      setErrors((prev) => {
                        const { display_name, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  placeholder="Dr. Jane Smith"
                  style={{
                    width: "100%",
                    height: 44,
                    background: C.parchment,
                    border: `1px solid ${errors.display_name ? C.danger : C.border}`,
                    borderRadius: 8,
                    padding: "0 16px",
                    fontFamily: sans,
                    fontSize: 16,
                    color: C.ink,
                    outline: "none",
                    transition: "all 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.blueMid;
                    e.target.style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.display_name ? C.danger : C.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
                {errors.display_name && (
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.danger, marginTop: 4 }}>
                    {errors.display_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
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
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, email: e.target.value }));
                    if (errors.email) {
                      setErrors((prev) => {
                        const { email, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  placeholder="you@example.edu"
                  style={{
                    width: "100%",
                    height: 44,
                    background: C.parchment,
                    border: `1px solid ${errors.email ? C.danger : C.border}`,
                    borderRadius: 8,
                    padding: "0 16px",
                    fontFamily: sans,
                    fontSize: 16,
                    color: C.ink,
                    outline: "none",
                    transition: "all 0.15s ease",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.blueMid;
                    e.target.style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.email ? C.danger : C.border;
                    e.target.style.boxShadow = "none";
                  }}
                />
                {errors.email && (
                  <p style={{ fontFamily: sans, fontSize: 13, color: C.danger, marginTop: 4 }}>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
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
                      transition: "all 0.15s ease",
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
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.3,
              marginBottom: 8,
              textAlign: "center",
            }}>
              Institution
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 24,
              textAlign: "center",
            }}>
              Search for your institution by name or domain
            </p>

            {!formData.institution_id ? (
              <>
                <div style={{ marginBottom: 16 }}>
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
                    Institution Search
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      value={institutionSearch}
                      onChange={(e) => handleInstitutionSearch(e.target.value)}
                      placeholder="Start typing to search..."
                      style={{
                        width: "100%",
                        height: 44,
                        background: C.parchment,
                        border: `1px solid ${C.border}`,
                        borderRadius: 8,
                        padding: "0 16px 0 40px",
                        fontFamily: sans,
                        fontSize: 16,
                        color: C.ink,
                        outline: "none",
                      }}
                    />
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={C.textMuted}
                      strokeWidth="2"
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.35-4.35" />
                    </svg>
                  </div>
                </div>

                {institutionResults.length > 0 && (
                  <div style={{
                    border: `1px solid ${C.borderLight}`,
                    borderRadius: 8,
                    maxHeight: 192,
                    overflowY: "auto",
                    marginBottom: 16,
                  }}>
                    {institutionResults.map((inst) => (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => selectInstitution(inst)}
                        style={{
                          width: "100%",
                          padding: 12,
                          textAlign: "left",
                          background: C.white,
                          border: "none",
                          borderBottom: `1px solid ${C.borderLight}`,
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = C.parchment;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = C.white;
                        }}
                      >
                        <div style={{
                          fontFamily: sans,
                          fontSize: 15,
                          fontWeight: 600,
                          color: C.ink,
                          marginBottom: 2,
                        }}>
                          {inst.name}
                        </div>
                        <div style={{
                          fontFamily: mono,
                          fontSize: 9,
                          color: C.textMuted,
                        }}>
                          {inst.domain}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {institutionSearch.length >= 2 && institutionResults.length === 0 && (
                  <div style={{
                    borderLeft: `3px solid ${C.warning}`,
                    background: "rgba(250,157,51,0.1)",
                    padding: 16,
                    borderRadius: 8,
                  }}>
                    <p style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                      Institution not found?
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/apply")}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        fontFamily: sans,
                        fontSize: 15,
                        color: C.blueMid,
                        cursor: "pointer",
                        textDecoration: "underline",
                      }}
                    >
                      Request to add your institution
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                borderLeft: `3px solid ${C.blueMid}`,
                background: "rgba(43,113,185,0.05)",
                padding: 16,
                borderRadius: 8,
                display: "flex",
                alignItems: "start",
                justifyContent: "space-between",
              }}>
                <div>
                  <span style={{ fontSize: 18, color: C.blueMid, marginRight: 8 }}>◆</span>
                  <span style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, color: C.ink }}>
                    Selected: {formData.institution_name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, institution_id: null, institution_name: null }))}
                  style={{
                    background: "none",
                    border: "none",
                    fontFamily: sans,
                    fontSize: 14,
                    fontWeight: 600,
                    color: C.blueMid,
                    cursor: "pointer",
                  }}
                >
                  Change
                </button>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div>
            <h2 style={{
              fontFamily: serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.3,
              marginBottom: 8,
              textAlign: "center",
            }}>
              FERPA Consent
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 20,
              textAlign: "center",
            }}>
              Please review and agree to the following disclosure
            </p>

            <div style={{
              background: C.parchment,
              border: `1px solid ${C.borderLight}`,
              borderRadius: 8,
              padding: 20,
              maxHeight: isMobile ? 240 : 300,
              overflowY: "auto",
              marginBottom: 20,
            }}>
              <div style={{ fontFamily: sans, fontSize: 15, color: C.ink, lineHeight: 1.7 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>FERPA Disclosure and Consent</h3>
                <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 16 }}>Journey OS Educational Records Notice</p>

                <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 4 }}>1. Data Collection and Storage</h4>
                <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 12 }}>
                  We collect and store your educational records, including assessment results, learning progress, and curriculum interactions, in accordance with FERPA.
                </p>

                <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 4 }}>2. Data Usage</h4>
                <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 12 }}>
                  Your educational data will be used to personalize your learning experience, generate adaptive assessments, track competency development, and provide analytics to authorized faculty.
                </p>

                <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 4 }}>3. Data Sharing</h4>
                <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 12 }}>
                  Your records will only be shared with faculty teaching your enrolled courses, academic advisors assigned to support you, institutional administrators for compliance reporting, and no third parties without your explicit consent.
                </p>

                <h4 style={{ fontSize: 14, fontWeight: 700, marginTop: 16, marginBottom: 4 }}>4. Your Rights</h4>
                <p style={{ fontSize: 14, color: C.textSecondary, marginBottom: 12 }}>
                  Under FERPA, you have the right to inspect and review your educational records, request amendments to inaccurate information, consent to disclosures of personally identifiable information, and file complaints with the U.S. Department of Education.
                </p>

                <p style={{ fontFamily: sans, fontSize: 13, color: C.textMuted, marginTop: 20, textAlign: "right" }}>
                  For questions, contact privacy@journeyos.edu
                </p>
                <p style={{ fontFamily: mono, fontSize: 9, color: C.textMuted, textAlign: "right", marginTop: 8 }}>
                  Version 1.0
                </p>
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "start",
                gap: 12,
                padding: 12,
                borderRadius: 8,
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.parchment;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <input
                type="checkbox"
                checked={formData.consented}
                onChange={(e) => setFormData((prev) => ({ ...prev, consented: e.target.checked }))}
                style={{
                  width: 18,
                  height: 18,
                  marginTop: 2,
                  cursor: "pointer",
                }}
              />
              <span style={{ fontFamily: sans, fontSize: 15, color: C.ink, lineHeight: 1.7 }}>
                I have read and agree to the FERPA disclosure above
              </span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  // Main Layout
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
        <div style={{ width: "100%", maxWidth: 448, ...fadeIn(0.3) }}>
          <ProgressIndicator />

          <div style={{
            background: C.white,
            border: `1px solid ${C.borderLight}`,
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
            padding: isMobile ? "28px 20px" : "32px 28px",
          }}>
            {serverError && (
              <div style={{
                background: "rgba(201,40,45,0.06)",
                border: `1px solid ${C.danger}`,
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 20,
              }}>
                <p style={{ fontFamily: sans, fontSize: 14, color: C.danger, margin: 0 }}>
                  {serverError}
                </p>
              </div>
            )}

            {renderStepContent()}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 32 }}>
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  disabled={isSubmitting}
                  style={{
                    padding: "10px 20px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.navyDeep,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
              )}

              {currentStep < 4 ? (
                <button
                  onClick={handleContinue}
                  disabled={
                    (currentStep === 1 && !formData.role) ||
                    (currentStep === 3 && !formData.institution_id)
                  }
                  style={{
                    marginLeft: "auto",
                    padding: "12px 24px",
                    background: ((currentStep === 1 && !formData.role) || (currentStep === 3 && !formData.institution_id)) ? C.textMuted : C.navyDeep,
                    border: "none",
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    cursor: ((currentStep === 1 && !formData.role) || (currentStep === 3 && !formData.institution_id)) ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!((currentStep === 1 && !formData.role) || (currentStep === 3 && !formData.institution_id))) {
                      e.currentTarget.style.background = C.blue;
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!((currentStep === 1 && !formData.role) || (currentStep === 3 && !formData.institution_id))) {
                      e.currentTarget.style.background = C.navyDeep;
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!formData.consented || isSubmitting}
                  style={{
                    marginLeft: "auto",
                    padding: "12px 24px",
                    background: (!formData.consented || isSubmitting) ? C.textMuted : C.navyDeep,
                    border: "none",
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    cursor: (!formData.consented || isSubmitting) ? "not-allowed" : "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (formData.consented && !isSubmitting) {
                      e.currentTarget.style.background = C.blue;
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.consented && !isSubmitting) {
                      e.currentTarget.style.background = C.navyDeep;
                      e.currentTarget.style.transform = "translateY(0)";
                    }
                  }}
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>
              )}
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: 24 }}>
            <p style={{ fontFamily: sans, fontSize: 13, color: C.textSecondary }}>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                style={{
                  background: "none",
                  border: "none",
                  fontFamily: sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.blueMid,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
