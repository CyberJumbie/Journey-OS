import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";

// ═══════════════════════════════════════════════════════════════
// JOURNEY OS — EMAIL VERIFICATION GATE (STORY-U-14)
// Template D: Full-width centered flow
// Surface: cream → white card
// States: Default, Sending, Sent, Rate Limited, Verified (auto-redirect)
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

type VerificationState = "default" | "sending" | "sent" | "rateLimited" | "verified";

export default function EmailVerification() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<VerificationState>("default");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const cooldownInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);

    // Check if user is logged in and get email
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/v1/auth/me", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setUserEmail(data.email);
        }
      } catch (err) {
        console.error("Failed to fetch user data", err);
      }
    };

    checkAuth();

    // Check if verifying from email link
    const token = searchParams.get("token");
    if (token) {
      verifyEmail(token);
    }

    return () => {
      if (cooldownInterval.current) {
        clearInterval(cooldownInterval.current);
      }
    };
  }, [searchParams]);

  // Start cooldown timer
  const startCooldown = () => {
    setCooldown(60);
    cooldownInterval.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownInterval.current) clearInterval(cooldownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Verify email with token
  const verifyEmail = async (token: string) => {
    setState("sending");
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Verification failed");
      }

      setState("verified");
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate("/onboarding");
      }, 2000);
    } catch (err) {
      setState("default");
      setError(err instanceof Error ? err.message : "Verification failed");
    }
  };

  // Resend verification email
  const handleResend = async () => {
    if (cooldown > 0) return;

    setState("sending");
    setError(null);

    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 429) {
          setState("rateLimited");
          setError("Too many requests. Please wait before trying again.");
          return;
        }
        const data = await response.json();
        throw new Error(data.message || "Failed to resend email");
      }

      setState("sent");
      startCooldown();

      // Reset to default after showing success message
      setTimeout(() => {
        setState("default");
      }, 3000);
    } catch (err) {
      setState("default");
      setError(err instanceof Error ? err.message : "Failed to resend email");
    }
  };

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(16px)",
    transition: `opacity 0.6s ease ${d}s, transform 0.6s ease ${d}s`,
  });

  // Verified State
  if (state === "verified") {
    return (
      <div style={{
        minHeight: "100vh",
        background: C.cream,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}>
        <div style={{
          width: "100%",
          maxWidth: 512,
          background: C.white,
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
          padding: 48,
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
            marginBottom: 12,
          }}>
            Email Verified!
          </h2>

          <p style={{
            fontFamily: sans,
            fontSize: 15,
            color: C.textSecondary,
            lineHeight: 1.7,
            marginBottom: 8,
          }}>
            Your email has been successfully verified.
          </p>

          <p style={{
            fontFamily: mono,
            fontSize: 11,
            color: C.textMuted,
            letterSpacing: "0.05em",
          }}>
            Redirecting to onboarding...
          </p>
        </div>
      </div>
    );
  }

  // Default/Sending/Sent/RateLimited State
  return (
    <div style={{
      minHeight: "100vh",
      background: C.cream,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 512,
        background: C.white,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 12,
        boxShadow: "0 8px 32px rgba(0,44,118,0.04)",
        padding: 48,
        textAlign: "center",
        ...fadeIn(),
      }}>
        {/* Icon */}
        <div style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(43,113,185,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.blueMid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>

        {/* Header */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 12 }}>
            <div style={{ width: 5, height: 5, borderRadius: 1, background: C.blueMid }} />
            <span style={{
              fontFamily: mono,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: C.textMuted,
            }}>
              Verification Required
            </span>
          </div>
          <h1 style={{
            fontFamily: serif,
            fontSize: 26,
            fontWeight: 700,
            color: C.navyDeep,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
            margin: 0,
          }}>
            Verify Your Email
          </h1>
        </div>

        {/* Description */}
        <p style={{
          fontFamily: sans,
          fontSize: 15,
          color: C.textSecondary,
          lineHeight: 1.7,
          marginBottom: 24,
        }}>
          We sent a verification link to{" "}
          {userEmail ? (
            <strong style={{ color: C.ink }}>{userEmail}</strong>
          ) : (
            "your email address"
          )}
          . Click the link in the email to verify your account.
        </p>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: state === "rateLimited" ? "rgba(250,157,51,0.06)" : "rgba(201,40,45,0.06)",
            border: `1px solid ${state === "rateLimited" ? C.warning : C.danger}`,
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            textAlign: "left",
          }}>
            <p style={{
              fontFamily: sans,
              fontSize: 14,
              color: state === "rateLimited" ? C.warning : C.danger,
              margin: 0,
            }}>
              {error}
            </p>
          </div>
        )}

        {/* Success Alert */}
        {state === "sent" && (
          <div style={{
            background: "rgba(105,163,56,0.06)",
            border: `1px solid ${C.green}`,
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            textAlign: "left",
          }}>
            <p style={{
              fontFamily: sans,
              fontSize: 14,
              color: C.green,
              margin: 0,
            }}>
              ✓ Verification email sent! Check your inbox.
            </p>
          </div>
        )}

        {/* Divider */}
        <div style={{
          height: 1,
          background: C.borderLight,
          margin: "24px 0",
        }} />

        {/* Resend Section */}
        <div>
          <p style={{
            fontFamily: sans,
            fontSize: 14,
            color: C.textSecondary,
            marginBottom: 16,
          }}>
            Didn't receive the email?
          </p>

          <button
            onClick={handleResend}
            disabled={state === "sending" || cooldown > 0}
            style={{
              width: "100%",
              height: 48,
              background: (state === "sending" || cooldown > 0) ? C.parchment : C.white,
              border: `2px solid ${(state === "sending" || cooldown > 0) ? C.border : C.blueMid}`,
              borderRadius: 6,
              fontFamily: sans,
              fontSize: 15,
              fontWeight: 700,
              color: (state === "sending" || cooldown > 0) ? C.textMuted : C.blueMid,
              cursor: (state === "sending" || cooldown > 0) ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              if (state !== "sending" && cooldown === 0) {
                e.currentTarget.style.background = C.blueMid;
                e.currentTarget.style.color = C.white;
              }
            }}
            onMouseLeave={(e) => {
              if (state !== "sending" && cooldown === 0) {
                e.currentTarget.style.background = C.white;
                e.currentTarget.style.color = C.blueMid;
              }
            }}
          >
            {state === "sending" 
              ? "Sending..." 
              : cooldown > 0 
                ? `Resend in ${cooldown}s` 
                : "Resend Verification Email"}
          </button>

          {cooldown > 0 && (
            <div style={{
              width: "100%",
              height: 4,
              background: C.parchment,
              borderRadius: 2,
              marginTop: 8,
              overflow: "hidden",
            }}>
              <div style={{
                width: `${(cooldown / 60) * 100}%`,
                height: "100%",
                background: C.blueMid,
                transition: "width 1s linear",
              }} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          marginTop: 32,
          paddingTop: 24,
          borderTop: `1px solid ${C.borderLight}`,
        }}>
          <button
            onClick={() => navigate("/login")}
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
            Sign Out
          </button>
          <span style={{ color: C.border }}>•</span>
          <button
            onClick={() => navigate("/support")}
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
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
