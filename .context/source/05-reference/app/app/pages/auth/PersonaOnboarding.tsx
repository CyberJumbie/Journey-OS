import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { BookOpen, Sparkles, Users, BarChart3, GraduationCap, CheckCircle2, ArrowRight } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — PERSONA ONBOARDING (STORY-U-13)
// Template D: Full-width centered flow with 3-step progression
// Surface: cream → white card
// 5 role variants: SA/IA/Faculty/Student/Advisor (3 steps each)
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
};

const sans = "'Source Sans 3', 'Source Sans Pro', -apple-system, system-ui, sans-serif";
const serif = "'Lora', Georgia, serif";
const mono = "'DM Mono', Menlo, monospace";

type Role = "superadmin" | "institutional_admin" | "faculty" | "student" | "advisor";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  action_label?: string;
  action_href?: string;
}

interface OnboardingConfig {
  role: Role;
  welcome_title: string;
  welcome_subtitle: string;
  steps: OnboardingStep[];
}

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

// Onboarding configurations for each role
const ONBOARDING_CONFIGS: Record<Role, OnboardingConfig> = {
  superadmin: {
    role: "superadmin",
    welcome_title: "Welcome, Superadmin",
    welcome_subtitle: "Let's get you set up to manage the Journey OS platform",
    steps: [
      {
        id: "review-applications",
        title: "Review Applications",
        description: "Review and approve institution applications from the waitlist. Set up new schools and assign institutional admins.",
        icon: "◆",
        action_label: "Go to Applications",
        action_href: "/admin/applications",
      },
      {
        id: "manage-institutions",
        title: "Manage Institutions",
        description: "Monitor institution health, user activity, and system-wide metrics. Ensure smooth operations across all schools.",
        icon: "◇",
        action_label: "View Institutions",
        action_href: "/admin/institutions",
      },
      {
        id: "global-settings",
        title: "Configure Platform",
        description: "Set up global settings, manage user directory, and configure platform-wide features and permissions.",
        icon: "▣",
        action_label: "Open Settings",
        action_href: "/admin/setup",
      },
    ],
  },
  institutional_admin: {
    role: "institutional_admin",
    welcome_title: "Welcome, Administrator",
    welcome_subtitle: "Let's set up your institution on Journey OS",
    steps: [
      {
        id: "invite-users",
        title: "Invite Your Team",
        description: "Start by inviting faculty, students, and advisors. You can bulk import users or send individual invitations.",
        icon: "◆",
        action_label: "Invite Users",
        action_href: "/institution/users",
      },
      {
        id: "setup-frameworks",
        title: "Configure Frameworks",
        description: "Set up competency frameworks (USMLE, ACGME, etc.) and define your institution's learning objectives.",
        icon: "◇",
        action_label: "Manage Frameworks",
        action_href: "/institution/frameworks",
      },
      {
        id: "monitor-coverage",
        title: "Monitor Coverage",
        description: "Track curriculum coverage, review accreditation readiness, and oversee faculty course development.",
        icon: "▣",
        action_label: "View Dashboard",
        action_href: "/institution/dashboard",
      },
    ],
  },
  faculty: {
    role: "faculty",
    welcome_title: "Welcome, Faculty",
    welcome_subtitle: "Let's get you started with AI-powered assessment creation",
    steps: [
      {
        id: "setup-courses",
        title: "Set Up Your Courses",
        description: "Create or claim your courses. Upload syllabi, learning objectives, and course materials to build your knowledge graph.",
        icon: "◆",
        action_label: "Manage Courses",
        action_href: "/courses",
      },
      {
        id: "generate-questions",
        title: "Generate Questions",
        description: "Use AI to generate USMLE-style questions aligned with your curriculum. Review, refine, and approve items for your exams.",
        icon: "◇",
        action_label: "Start Generating",
        action_href: "/generation/wizard",
      },
      {
        id: "review-analytics",
        title: "Track Student Progress",
        description: "Monitor student mastery, identify knowledge gaps, and see how well your assessments measure learning outcomes.",
        icon: "▣",
        action_label: "View Analytics",
        action_href: "/analytics",
      },
    ],
  },
  student: {
    role: "student",
    welcome_title: "Welcome, Student",
    welcome_subtitle: "Your personalized path to medical mastery starts here",
    steps: [
      {
        id: "explore-dashboard",
        title: "Explore Your Dashboard",
        description: "See your mastery levels, readiness scores, and personalized practice recommendations based on your courses.",
        icon: "◆",
        action_label: "View Dashboard",
        action_href: "/dashboard/student",
      },
      {
        id: "start-practice",
        title: "Start Practicing",
        description: "Launch adaptive practice sessions tailored to your knowledge gaps. Build mastery with spaced repetition.",
        icon: "◇",
        action_label: "Launch Practice",
        action_href: "/practice/launch",
      },
      {
        id: "track-progress",
        title: "Track Your Progress",
        description: "Monitor your concept-level understanding over time. See where you're strong and where to focus your study efforts.",
        icon: "▣",
        action_label: "View Progress",
        action_href: "/dashboard/student/analytics",
      },
    ],
  },
  advisor: {
    role: "advisor",
    welcome_title: "Welcome, Advisor",
    welcome_subtitle: "Help students succeed with data-driven interventions",
    steps: [
      {
        id: "view-cohort",
        title: "Review Your Cohort",
        description: "See mastery profiles for all students under your guidance. Identify those who need early intervention.",
        icon: "◆",
        action_label: "View Cohort",
        action_href: "/dashboard/admin/cohort-analytics",
      },
      {
        id: "setup-alerts",
        title: "Configure Alerts",
        description: "Set up automated alerts for performance drops, mastery plateaus, or other early warning signals.",
        icon: "◇",
        action_label: "Manage Alerts",
        action_href: "/settings/notifications",
      },
      {
        id: "intervention-tools",
        title: "Intervention Tools",
        description: "Flag concerns, recommend resources, and track follow-through. All your advising workflows in one place.",
        icon: "▣",
        action_label: "Open Tools",
        action_href: "/dashboard",
      },
    ],
  },
};

export default function PersonaOnboarding() {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  const [mounted, setMounted] = useState(false);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<OnboardingConfig | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Fetch user role from backend
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          const role = data.role as Role;
          setUserRole(role);
          setConfig(ONBOARDING_CONFIGS[role]);
        }
      } catch (err) {
        console.error("Failed to fetch user role", err);
        // Default to faculty for demo
        setUserRole("faculty");
        setConfig(ONBOARDING_CONFIGS.faculty);
      }
    };

    fetchUserRole();
  }, []);

  const handleStepComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set(prev).add(stepId));
  };

  const handleNext = () => {
    if (config && currentStep < config.steps.length - 1) {
      handleStepComplete(config.steps[currentStep].id);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleFinish = async () => {
    if (!config) return;

    handleStepComplete(config.steps[currentStep].id);

    // Mark onboarding as complete
    try {
      await fetch("/api/v1/auth/onboarding/complete", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to mark onboarding complete", err);
    }

    // Navigate to appropriate dashboard
    const dashboardRoutes: Record<Role, string> = {
      superadmin: "/admin",
      institutional_admin: "/institution/dashboard",
      faculty: "/dashboard",
      student: "/dashboard/student",
      advisor: "/dashboard",
    };

    navigate(dashboardRoutes[config.role]);
  };

  const handleSkip = async () => {
    try {
      await fetch("/api/v1/auth/onboarding/complete", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Failed to mark onboarding complete", err);
    }

    if (!config) return;
    const dashboardRoutes: Record<Role, string> = {
      superadmin: "/admin",
      institutional_admin: "/institution/dashboard",
      faculty: "/dashboard",
      student: "/dashboard/student",
      advisor: "/dashboard",
    };
    navigate(dashboardRoutes[config.role]);
  };

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.6s ease ${d}s, transform 0.6s ease ${d}s`,
  });

  if (!config) {
    return (
      <div style={{
        minHeight: "100vh",
        background: C.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: `3px solid ${C.borderLight}`,
          borderTopColor: C.blueMid,
          animation: "spin 1s linear infinite",
        }} />
        <style>
          {`@keyframes spin { to { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  const currentStepData = config.steps[currentStep];
  const isLastStep = currentStep === config.steps.length - 1;

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
        maxWidth: 720,
        ...fadeIn(),
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            <div style={{ width: 5, height: 5, borderRadius: 1, background: C.greenDark }} />
            <span style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.textMuted,
            }}>
              Getting Started
            </span>
          </div>
          <h1 style={{
            fontFamily: serif,
            fontSize: isMobile ? 28 : 34,
            fontWeight: 700,
            color: C.navyDeep,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: "0 0 8px",
          }}>
            {config.welcome_title}
          </h1>
          <p style={{
            fontFamily: sans,
            fontSize: 16,
            color: C.textSecondary,
            lineHeight: 1.7,
            margin: 0,
          }}>
            {config.welcome_subtitle}
          </p>
        </div>

        {/* Progress Indicator */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 32,
        }}>
          {config.steps.map((step, index) => (
            <div key={step.id} style={{
              width: index === currentStep ? 32 : 8,
              height: 8,
              borderRadius: 4,
              background: index <= currentStep ? C.navyDeep : C.borderLight,
              transition: "all 0.3s ease",
            }} />
          ))}
        </div>

        {/* Main Card */}
        <div style={{
          background: C.white,
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
          padding: isMobile ? "32px 24px" : "48px 40px",
          marginBottom: 20,
        }}>
          {/* Step Icon */}
          <div style={{
            width: 64,
            height: 64,
            borderRadius: 12,
            background: "rgba(43,113,185,0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
          }}>
            <span style={{
              fontFamily: serif,
              fontSize: 28,
              color: C.blueMid,
            }}>
              {currentStepData.icon}
            </span>
          </div>

          {/* Step Content */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.textMuted,
              marginBottom: 8,
            }}>
              Step {currentStep + 1} of {config.steps.length}
            </div>
            <h2 style={{
              fontFamily: serif,
              fontSize: isMobile ? 22 : 26,
              fontWeight: 700,
              color: C.navyDeep,
              lineHeight: 1.25,
              letterSpacing: "-0.01em",
              margin: "0 0 12px",
            }}>
              {currentStepData.title}
            </h2>
            <p style={{
              fontFamily: sans,
              fontSize: 16,
              color: C.textSecondary,
              lineHeight: 1.7,
              margin: 0,
            }}>
              {currentStepData.description}
            </p>
          </div>

          {/* Action Button (if available) */}
          {currentStepData.action_label && currentStepData.action_href && (
            <button
              onClick={() => {
                handleStepComplete(currentStepData.id);
                navigate(currentStepData.action_href!);
              }}
              style={{
                width: "100%",
                height: 52,
                background: C.parchment,
                border: `2px solid ${C.blueMid}`,
                borderRadius: 8,
                fontFamily: sans,
                fontSize: 15,
                fontWeight: 700,
                color: C.blueMid,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginBottom: 16,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.blueMid;
                e.currentTarget.style.color = C.white;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = C.parchment;
                e.currentTarget.style.color = C.blueMid;
              }}
            >
              {currentStepData.action_label}
              <ArrowRight size={18} />
            </button>
          )}

          {/* Navigation Buttons */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}>
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => prev - 1)}
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

            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              {!isLastStep ? (
                <button
                  onClick={handleNext}
                  style={{
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
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  style={{
                    padding: "12px 24px",
                    background: C.green,
                    border: "none",
                    borderRadius: 6,
                    fontFamily: sans,
                    fontSize: 15,
                    fontWeight: 700,
                    color: C.white,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = C.greenDark;
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = C.green;
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <CheckCircle2 size={18} />
                  Get Started
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Skip Link */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleSkip}
            style={{
              background: "none",
              border: "none",
              fontFamily: sans,
              fontSize: 14,
              fontWeight: 600,
              color: C.textSecondary,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Skip for now
          </button>
        </div>

        {/* Step List (Desktop Only) */}
        {!isMobile && (
          <div style={{
            marginTop: 32,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16,
          }}>
            {config.steps.map((step, index) => (
              <div
                key={step.id}
                style={{
                  background: index <= currentStep ? "rgba(43,113,185,0.05)" : C.white,
                  border: `1px solid ${index === currentStep ? C.blueMid : C.borderLight}`,
                  borderRadius: 8,
                  padding: 16,
                  opacity: index > currentStep ? 0.5 : 1,
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}>
                  <span style={{
                    fontFamily: serif,
                    fontSize: 18,
                    color: index <= currentStep ? C.blueMid : C.textMuted,
                  }}>
                    {step.icon}
                  </span>
                  {completedSteps.has(step.id) && (
                    <CheckCircle2 size={16} color={C.green} />
                  )}
                </div>
                <div style={{
                  fontFamily: sans,
                  fontSize: 13,
                  fontWeight: 600,
                  color: index <= currentStep ? C.navyDeep : C.textMuted,
                }}>
                  {step.title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
