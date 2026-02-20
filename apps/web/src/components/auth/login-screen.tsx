"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@web/lib/supabase";
import { useBreakpoint } from "@web/hooks/use-breakpoint";

const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
import { WovenField } from "@web/components/brand/woven-field";
import { AscendingSquares } from "@web/components/brand/ascending-squares";
import { JourneyLogo } from "@web/components/brand/journey-logo";

const C = {
  navyDeep: "#002c76",
  blue: "#004ebc",
  blueMid: "#2b71b9",
  greenDark: "#5d7203",
  green: "#69a338",
  ink: "#1b232a",
  warmGray: "#d7d3c8",
  cream: "#f5f3ef",
  parchment: "#faf9f6",
  white: "#ffffff",
  textPrimary: "#1b232a",
  textSecondary: "#4a5568",
  textMuted: "#718096",
  border: "#e2dfd8",
  borderLight: "#edeae4",
  error: "#c9282d",
};

type FormState = "idle" | "loading" | "error";

const roles = [
  { key: "faculty", label: "Faculty" },
  { key: "admin", label: "Admin" },
  { key: "advisor", label: "Advisor" },
  { key: "student", label: "Student" },
];

const pillars = [
  { label: "Curriculum", sub: "Knowledge Graph", bg: C.navyDeep },
  { label: "Assessment", sub: "AI-Generated", bg: C.blue },
  { label: "Measurement", sub: "Student Mastery", bg: C.green },
  { label: "Compliance", sub: "Accreditation", bg: C.blueMid },
];

export function LoginScreen() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeRole, setActiveRole] = useState("faculty");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const mounted = useMounted();

  const callbackError = searchParams.get("error");
  const canSubmit = email.length > 0 && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMessage("");
    setFormState("loading");

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMessage(
        error.message === "Invalid login credentials"
          ? "Invalid email or password."
          : error.message,
      );
      setFormState("error");
      return;
    }

    const next = searchParams.get("next") ?? "/";
    router.push(next);
    router.refresh();
  }

  async function handleGoogleSignIn() {
    const supabase = createBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div
      className="flex min-h-screen font-sans"
      style={{
        flexDirection: isMobile ? "column" : "row",
        background: C.cream,
      }}
    >
      {/* ═══ LEFT: BRAND PANEL ═══ */}
      <div
        style={{
          flex: isMobile ? "none" : isTablet ? "0 0 340px" : "0 0 480px",
          position: "relative",
          overflow: "hidden",
          background: C.white,
          borderRight: isMobile ? "none" : `1px solid ${C.borderLight}`,
          borderBottom: isMobile ? `1px solid ${C.borderLight}` : "none",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          minHeight: isMobile ? "auto" : "100vh",
          padding: isMobile
            ? "32px 24px 28px"
            : isTablet
              ? "40px 32px"
              : "48px 44px",
        }}
      >
        <WovenField color={C.navyDeep} opacity={0.02} density={14} />

        {/* Top: Logo + tagline */}
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ ...fadeIn(0.1), marginBottom: isMobile ? 24 : 48 }}>
            <JourneyLogo size={isMobile ? "md" : "lg"} />
          </div>

          <div style={fadeIn(0.18)}>
            <AscendingSquares
              colors={[C.navyDeep, C.blue, C.blueMid, C.green]}
              size={isMobile ? 10 : 14}
              gap={4}
              className="mb-4 md:mb-6"
            />
          </div>

          <div style={fadeIn(0.24)}>
            <h1
              className="font-serif font-bold text-navy-deep"
              style={{
                fontSize: isMobile ? 26 : isTablet ? 28 : 36,
                lineHeight: 1.2,
                letterSpacing: "-0.015em",
                marginBottom: isMobile ? 12 : 20,
                maxWidth: 360,
              }}
            >
              Every thread of your curriculum, woven together.
            </h1>
          </div>

          <div style={fadeIn(0.3)}>
            <p
              className="text-text-secondary"
              style={{
                fontSize: isMobile ? 14 : 15,
                lineHeight: 1.75,
                maxWidth: 340,
                marginBottom: isMobile ? 0 : 32,
              }}
            >
              AI-powered assessment generation, curriculum mapping, and student
              mastery tracking — all connected in one knowledge graph.
            </p>
          </div>
        </div>

        {/* Bottom: Pillar grid — hidden on mobile */}
        {!isMobile && (
          <div style={{ position: "relative", zIndex: 1, ...fadeIn(0.4) }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 6,
                maxWidth: isTablet ? 240 : 280,
              }}
            >
              {pillars.map((p, i) => (
                <div
                  key={i}
                  style={{
                    background: p.bg,
                    borderRadius: 8,
                    padding: isTablet ? "14px 12px" : "16px 14px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0.06,
                      backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 5px),
                        repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.4) 4px, rgba(255,255,255,0.4) 5px)`,
                    }}
                  />
                  <span
                    className="font-mono"
                    style={{
                      fontSize: 8,
                      color: "rgba(255,255,255,0.5)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: 2,
                      position: "relative",
                    }}
                  >
                    {p.sub}
                  </span>
                  <span
                    className="font-serif font-semibold text-white"
                    style={{
                      fontSize: isTablet ? 12 : 13,
                      position: "relative",
                    }}
                  >
                    {p.label}
                  </span>
                </div>
              ))}
            </div>

            <svg
              style={{ marginTop: 16, opacity: 0.2, maxWidth: 160 }}
              height="8"
              viewBox="0 0 160 8"
              preserveAspectRatio="none"
            >
              <path
                d="M0,4 Q20,1 40,4 T80,4 T120,4 T160,4"
                stroke={C.warmGray}
                strokeWidth="1.2"
                fill="none"
              />
            </svg>

            <p
              className="font-sans text-text-muted"
              style={{ fontSize: 12, marginTop: 12 }}
            >
              Morehouse School of Medicine
            </p>
          </div>
        )}
      </div>

      {/* ═══ RIGHT: LOGIN FORM ═══ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: isMobile ? "32px 20px 40px" : "40px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!isMobile && (
          <div
            style={{ position: "absolute", top: 32, right: 32, opacity: 0.06 }}
          >
            <AscendingSquares
              colors={[C.borderLight, C.warmGray, C.border, C.borderLight]}
              size={10}
              gap={3}
            />
          </div>
        )}

        <div
          style={{
            width: "100%",
            maxWidth: 400,
            ...fadeIn(isMobile ? 0.1 : 0.3),
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            {isMobile && (
              <div className="mb-5 flex items-center justify-center">
                <JourneyLogo size="md" />
              </div>
            )}
            <h2
              className="font-serif font-bold text-navy-deep"
              style={{
                fontSize: isMobile ? 26 : 30,
                marginBottom: 6,
                letterSpacing: "-0.01em",
              }}
            >
              Welcome back
            </h2>
            <p className="text-sm text-text-muted">
              Sign in to continue to Journey OS
            </p>
          </div>

          {callbackError && (
            <p className="mb-4 text-sm text-error">
              Authentication failed. Please sign in again.
            </p>
          )}

          {/* Role tabs */}
          <div
            style={{
              display: "flex",
              gap: 2,
              marginBottom: 28,
              background: C.parchment,
              borderRadius: 8,
              padding: 3,
              border: `1px solid ${C.borderLight}`,
            }}
          >
            {roles.map((r) => (
              <button
                key={r.key}
                onClick={() => setActiveRole(r.key)}
                type="button"
                className="font-sans"
                style={{
                  flex: 1,
                  fontSize: 13,
                  fontWeight: activeRole === r.key ? 700 : 500,
                  color: activeRole === r.key ? C.navyDeep : C.textMuted,
                  background: activeRole === r.key ? C.white : "transparent",
                  border: "none",
                  borderRadius: 6,
                  padding: "9px 0",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow:
                    activeRole === r.key
                      ? "0 1px 3px rgba(0,0,0,0.04)"
                      : "none",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="font-mono uppercase text-text-muted"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={formState === "loading"}
                placeholder="you@msm.edu"
                className="w-full font-sans text-text-primary"
                style={{
                  boxSizing: "border-box",
                  padding: "13px 16px",
                  background: C.parchment,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  fontSize: 15,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = C.blueMid;
                  e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = C.border;
                  e.target.style.boxShadow = "none";
                }}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="font-mono uppercase text-text-muted"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={formState === "loading"}
                  placeholder="••••••••"
                  className="w-full font-sans text-text-primary"
                  style={{
                    boxSizing: "border-box",
                    padding: "13px 48px 13px 16px",
                    background: C.parchment,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 15,
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = C.blueMid;
                    e.target.style.boxShadow = `0 0 0 3px ${C.blueMid}15`;
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = C.border;
                    e.target.style.boxShadow = "none";
                  }}
                  required
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                  className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center text-text-muted"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                  }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me + forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2">
                <div
                  onClick={() => setRemember(!remember)}
                  role="checkbox"
                  aria-checked={remember}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter")
                      setRemember(!remember);
                  }}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `1.5px solid ${remember ? C.navyDeep : C.border}`,
                    background: remember ? C.navyDeep : C.white,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s",
                    cursor: "pointer",
                  }}
                >
                  {remember && (
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6L5 8.5L9.5 3.5"
                        stroke="white"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className="font-mono uppercase text-text-muted"
                  style={{ fontSize: 10, letterSpacing: "0.06em" }}
                >
                  Remember me
                </span>
              </label>
              <a
                href="/forgot-password"
                className="font-sans font-medium text-blue-mid hover:text-navy-deep"
                style={{
                  fontSize: 13,
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
              >
                Forgot password?
              </a>
            </div>

            {errorMessage && (
              <p className="text-sm text-error">{errorMessage}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit || formState === "loading"}
              className="flex w-full items-center justify-center gap-2 font-sans font-bold text-white"
              style={{
                padding: "14px 0",
                borderRadius: 8,
                border: "none",
                fontSize: 15,
                letterSpacing: "0.01em",
                cursor:
                  !canSubmit || formState === "loading" ? "default" : "pointer",
                background: !canSubmit ? C.warmGray : C.navyDeep,
                color: !canSubmit ? C.textMuted : C.white,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                if (canSubmit && formState !== "loading")
                  e.currentTarget.style.background = C.blue;
              }}
              onMouseLeave={(e) => {
                if (canSubmit && formState !== "loading")
                  e.currentTarget.style.background = C.navyDeep;
              }}
            >
              {formState === "loading" ? (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTop: "2px solid white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              ) : (
                "Sign in"
              )}
            </button>

            {/* Divider */}
            <div
              className="flex items-center gap-4"
              style={{ margin: "4px 0" }}
            >
              <div className="h-px flex-1 bg-border-light" />
              <span
                className="font-mono text-text-muted"
                style={{ fontSize: 10, letterSpacing: "0.08em" }}
              >
                OR
              </span>
              <div className="h-px flex-1 bg-border-light" />
            </div>

            {/* Google SSO */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="flex w-full items-center justify-center gap-2.5 font-sans font-semibold text-text-primary"
              style={{
                padding: "13px 0",
                borderRadius: 8,
                border: `1.5px solid ${C.border}`,
                background: C.white,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = C.blueMid;
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0,44,118,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path
                  d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  fill="#4285F4"
                />
                <path
                  d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                  fill="#34A853"
                />
                <path
                  d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  fill="#FBBC05"
                />
                <path
                  d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                  fill="#EA4335"
                />
              </svg>
              Sign in with Google
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <div className="mb-3.5 flex items-center justify-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke={C.textMuted}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="7" width="10" height="8" rx="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" />
              </svg>
              <span
                className="font-mono uppercase text-text-muted"
                style={{ fontSize: 9, letterSpacing: "0.1em" }}
              >
                Protected by Journey OS
              </span>
            </div>
            <p className="text-[13px] text-text-muted">
              Don&apos;t have an account?{" "}
              <a
                href="/waitlist"
                className="font-semibold text-blue-mid hover:text-navy-deep"
                style={{ textDecoration: "none", transition: "color 0.2s" }}
              >
                Join the waitlist
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
