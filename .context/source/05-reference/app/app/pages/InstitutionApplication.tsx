import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — INSTITUTION APPLICATION (3-STEP WIZARD)
// Template D: Full-Width Flow, public waitlist form
// Surface: cream → white card → parchment inputs (The One Rule)
// ═══════════════════════════════════════════════════════════════

const C = {
  navyDeep: "#002c76",
  blue: "#004ebc",
  blueMid: "#2b71b9",
  green: "#69a338",
  greenDark: "#5d7203",
  ink: "#1b232a",
  textSecondary: "#4a5568",
  textMuted: "#718096",
  cream: "#f5f3ef",
  parchment: "#faf9f6",
  white: "#ffffff",
  border: "#e2dfd8",
  borderLight: "#edeae4",
  danger: "#c9282d",
  warning: "#fa9d33",
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

interface FormData {
  institution_name: string;
  institution_type: string;
  accreditation_body: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  student_count: string;
  website_url: string;
  reason: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function InstitutionApplication() {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    institution_name: "",
    institution_type: "",
    accreditation_body: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    student_count: "",
    website_url: "",
    reason: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case "institution_name":
        return value.length >= 3 ? "" : "Must be at least 3 characters";
      case "institution_type":
        return ["md", "do", "combined"].includes(value) ? "" : "Required";
      case "accreditation_body":
        return value.length >= 2 ? "" : "Must be at least 2 characters";
      case "contact_name":
        return value.length >= 2 ? "" : "Must be at least 2 characters";
      case "contact_email":
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "" : "Invalid email";
      case "contact_phone":
        return !value || /^\+?[\d\s\-()]+$/.test(value) ? "" : "Invalid phone format";
      case "student_count":
        return Number(value) > 0 ? "" : "Must be greater than 0";
      case "website_url":
        return !value || /^https?:\/\/.+/.test(value) ? "" : "Must start with http:// or https://";
      case "reason":
        return !value || value.length <= 1000 ? "" : "Maximum 1000 characters";
      default:
        return "";
    }
  };

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};

    if (step === 1) {
      const nameError = validateField("institution_name", formData.institution_name);
      if (nameError) newErrors.institution_name = nameError;

      const typeError = validateField("institution_type", formData.institution_type);
      if (typeError) newErrors.institution_type = typeError;

      const accredError = validateField("accreditation_body", formData.accreditation_body);
      if (accredError) newErrors.accreditation_body = accredError;
    }

    if (step === 2) {
      const nameError = validateField("contact_name", formData.contact_name);
      if (nameError) newErrors.contact_name = nameError;

      const emailError = validateField("contact_email", formData.contact_email);
      if (emailError) newErrors.contact_email = emailError;

      if (formData.contact_phone) {
        const phoneError = validateField("contact_phone", formData.contact_phone);
        if (phoneError) newErrors.contact_phone = phoneError;
      }
    }

    if (step === 3) {
      const countError = validateField("student_count", formData.student_count);
      if (countError) newErrors.student_count = countError;

      if (formData.website_url) {
        const urlError = validateField("website_url", formData.website_url);
        if (urlError) newErrors.website_url = urlError;
      }

      if (formData.reason) {
        const reasonError = validateField("reason", formData.reason);
        if (reasonError) newErrors.reason = reasonError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
      setServerError(null);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
    setServerError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const response = await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institution_name: formData.institution_name,
          institution_type: formData.institution_type,
          accreditation_body: formData.accreditation_body,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email.toLowerCase().trim(),
          contact_phone: formData.contact_phone || undefined,
          student_count: Number(formData.student_count),
          website_url: formData.website_url || undefined,
          reason: formData.reason || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        } else if (response.status === 409) {
          throw new Error("This institution has already submitted an application.");
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

  // Progress Indicator
  const ProgressIndicator = () => {
    const steps = [
      { num: 1, label: "Institution" },
      { num: 2, label: "Contact" },
      { num: 3, label: "Details" },
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
                width: isMobile ? 40 : 80,
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

  // Success state
  if (isSuccess) {
    return (
      <div style={{
        minHeight: "100vh",
        background: C.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 16 : 24,
      }}>
        <div style={{
          width: "100%",
          maxWidth: 512,
          background: C.white,
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
          padding: isMobile ? "32px 24px" : "48px 32px",
          textAlign: "center",
          ...fadeIn(0.2),
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
            letterSpacing: "-0.01em",
            margin: "0 0 12px",
          }}>
            Application Submitted
          </h2>

          <p style={{
            fontFamily: sans,
            fontSize: 15,
            fontWeight: 400,
            color: C.textSecondary,
            lineHeight: 1.7,
            margin: 0,
          }}>
            Thank you! Your application for{" "}
            <strong style={{ color: C.ink }}>{formData.institution_name}</strong> is now
            pending review. We'll contact you at{" "}
            <strong style={{ color: C.green }}>{formData.contact_email}</strong>.
          </p>
        </div>
      </div>
    );
  }

  // Input component
  const Input = ({ label, name, type = "text", placeholder, required, value, error }: any) => (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={name} style={{
        display: "block",
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: C.textMuted,
        marginBottom: 6,
      }}>
        {label} {!required && <span style={{ color: C.textMuted }}>(Optional)</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          value={value}
          onChange={(e) => handleChange(name, e.target.value)}
          placeholder={placeholder}
          maxLength={1000}
          rows={3}
          disabled={isSubmitting}
          style={{
            width: "100%",
            background: C.parchment,
            border: `1px solid ${error ? C.danger : C.border}`,
            borderRadius: 8,
            padding: "13px 16px",
            fontFamily: sans,
            fontSize: 16,
            fontWeight: 400,
            color: C.ink,
            resize: "none",
            outline: "none",
            transition: "border 0.15s ease, box-shadow 0.15s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = C.blueMid;
            e.target.style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? C.danger : C.border;
            e.target.style.boxShadow = "none";
          }}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={(e) => handleChange(name, e.target.value)}
          placeholder={placeholder}
          disabled={isSubmitting}
          style={{
            width: "100%",
            height: 44,
            background: C.parchment,
            border: `1px solid ${error ? C.danger : C.border}`,
            borderRadius: 8,
            padding: "0 16px",
            fontFamily: sans,
            fontSize: 16,
            fontWeight: 400,
            color: C.ink,
            outline: "none",
            transition: "border 0.15s ease, box-shadow 0.15s ease",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = C.blueMid;
            e.target.style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error ? C.danger : C.border;
            e.target.style.boxShadow = "none";
          }}
        />
      )}
      {error && (
        <p style={{
          fontFamily: sans,
          fontSize: 13,
          color: C.danger,
          margin: "4px 0 0",
        }}>
          {error}
        </p>
      )}
      {name === "reason" && value && (
        <p style={{
          fontFamily: mono,
          fontSize: 9,
          color: C.textMuted,
          textAlign: "right",
          margin: "4px 0 0",
        }}>
          {value.length} / 1000
        </p>
      )}
    </div>
  );

  // Select component
  const Select = ({ label, name, options, value, error }: any) => (
    <div style={{ marginBottom: 20 }}>
      <label htmlFor={name} style={{
        display: "block",
        fontFamily: mono,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: C.textMuted,
        marginBottom: 6,
      }}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => handleChange(name, e.target.value)}
        disabled={isSubmitting}
        style={{
          width: "100%",
          height: 44,
          background: C.parchment,
          border: `1px solid ${error ? C.danger : C.border}`,
          borderRadius: 8,
          padding: "0 16px",
          fontFamily: sans,
          fontSize: 16,
          fontWeight: 400,
          color: value ? C.ink : C.textMuted,
          outline: "none",
          cursor: "pointer",
          transition: "border 0.15s ease, box-shadow 0.15s ease",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = C.blueMid;
          e.target.style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)";
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? C.danger : C.border;
          e.target.style.boxShadow = "none";
        }}
      >
        <option value="">Select type...</option>
        {options.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p style={{
          fontFamily: sans,
          fontSize: 13,
          color: C.danger,
          margin: "4px 0 0",
        }}>
          {error}
        </p>
      )}
    </div>
  );

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
              marginBottom: 8,
              textAlign: "center",
            }}>
              Institution Information
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 24,
              textAlign: "center",
            }}>
              Tell us about your medical school
            </p>

            <Input
              label="Institution Name"
              name="institution_name"
              placeholder="Morehouse School of Medicine"
              required
              value={formData.institution_name}
              error={errors.institution_name}
            />

            <Select
              label="Institution Type"
              name="institution_type"
              options={[
                { value: "md", label: "MD (Allopathic Medical School)" },
                { value: "do", label: "DO (Osteopathic Medical School)" },
                { value: "combined", label: "Combined MD/DO Program" },
              ]}
              value={formData.institution_type}
              error={errors.institution_type}
            />

            <Input
              label="Accreditation Body"
              name="accreditation_body"
              placeholder="LCME, AOA, etc."
              required
              value={formData.accreditation_body}
              error={errors.accreditation_body}
            />
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
              marginBottom: 8,
              textAlign: "center",
            }}>
              Contact Information
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 24,
              textAlign: "center",
            }}>
              How can we reach you?
            </p>

            <Input
              label="Contact Name"
              name="contact_name"
              placeholder="Dr. Jane Smith"
              required
              value={formData.contact_name}
              error={errors.contact_name}
            />

            <Input
              label="Contact Email"
              name="contact_email"
              type="email"
              placeholder="jsmith@msm.edu"
              required
              value={formData.contact_email}
              error={errors.contact_email}
            />

            <Input
              label="Contact Phone"
              name="contact_phone"
              type="tel"
              placeholder="+1-404-555-0100"
              value={formData.contact_phone}
              error={errors.contact_phone}
            />
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
              Additional Details
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 15,
              color: C.textSecondary,
              lineHeight: 1.7,
              marginBottom: 24,
              textAlign: "center",
            }}>
              Help us understand your needs
            </p>

            <Input
              label="Student Count"
              name="student_count"
              type="number"
              placeholder="450"
              required
              value={formData.student_count}
              error={errors.student_count}
            />

            <Input
              label="Website URL"
              name="website_url"
              type="url"
              placeholder="https://www.msm.edu"
              value={formData.website_url}
              error={errors.website_url}
            />

            <Input
              label="Reason for Interest"
              name="reason"
              type="textarea"
              placeholder="Tell us why you're interested in Journey OS..."
              value={formData.reason}
              error={errors.reason}
            />
          </div>
        );

      default:
        return null;
    }
  };

  // Default state: form view
  return (
    <div style={{
      minHeight: "100vh",
      background: C.cream,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: isMobile ? 16 : 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 512,
        ...fadeIn(),
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, justifyContent: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: 1, background: C.greenDark }} />
            <span style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.textMuted,
            }}>
              Waitlist Application
            </span>
          </div>
          <h1 style={{
            fontFamily: serif,
            fontSize: isMobile ? 26 : 30,
            fontWeight: 700,
            color: C.navyDeep,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: "0 0 8px",
            textAlign: "center",
          }}>
            Apply for Platform Access
          </h1>
          <p style={{
            fontFamily: sans,
            fontSize: 15,
            fontWeight: 400,
            color: C.textSecondary,
            lineHeight: 1.7,
            margin: 0,
            textAlign: "center",
          }}>
            Join the Journey OS waitlist in three simple steps
          </p>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator />

        {/* Form Card */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
          padding: isMobile ? "24px 20px" : "32px 28px",
        }}>
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

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 32 }}>
            {currentStep > 1 && (
              <button
                onClick={handleBack}
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

            {currentStep < 3 ? (
              <button
                onClick={handleContinue}
                style={{
                  marginLeft: "auto",
                  padding: "12px 24px",
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
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={{
                  marginLeft: "auto",
                  padding: "12px 24px",
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
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
