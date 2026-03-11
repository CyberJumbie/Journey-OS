'use client';

import { useRouter } from 'next/navigation';

import { useState, useEffect } from "react";
import { C, sans, serif, mono, WovenField, AscSquares } from '@/lib/design-tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function LoginPage() {
  const router = useRouter();
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isTablet = bp === "tablet";

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

  const fadeIn = (d = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${d}s, transform 0.5s ease ${d}s`,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);

    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      // Check for redirect param
      const params = new URLSearchParams(window.location.search);
      const redirectPath = params.get('redirect');

      if (redirectPath && redirectPath.startsWith('/')) {
        router.push(redirectPath);
      } else {
        // Read role from JWT app_metadata (no DB query, no RLS issues)
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const meta = user.app_metadata as Record<string, unknown> | undefined;
          const role = meta?.role as string | undefined;
          const onboardingCompleted = (meta?.onboarding_completed as boolean) ?? false;

          const hasOnboarding = new Set(['faculty', 'institutional_admin', 'student']);
          const onboardingRoutes: Record<string, string> = {
            faculty: '/onboarding',
            student: '/onboarding/student',
            institutional_admin: '/onboarding/admin',
          };
          const dashboardRoutes: Record<string, string> = {
            faculty: '/dashboard',
            student: '/student-dashboard',
            institutional_admin: '/institution/dashboard',
            superadmin: '/admin',
            advisor: '/advisor/cohort',
          };

          if (!role) {
            router.push('/register');
          } else if (!onboardingCompleted && hasOnboarding.has(role)) {
            router.push(onboardingRoutes[role] ?? '/onboarding');
          } else {
            router.push(dashboardRoutes[role] ?? '/dashboard');
          }
        } else {
          router.push('/dashboard');
        }
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ fontFamily: sans, minHeight: "100vh", display: "flex", flexDirection: isMobile ? "column" : "row", background: C.cream }}>
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
                  padding: 12, borderRadius: 8, border: "none",
                  background: p.bg,
                }}>
                  <div style={{ fontFamily: mono, fontSize: 9, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", textTransform: "uppercase", lineHeight: 1.4 }}>
                    {p.label}
                  </div>
                  <div style={{ fontFamily: sans, fontSize: 11, color: "rgba(255,255,255,0.9)", marginTop: 4 }}>
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
                Enter your credentials to continue
              </p>
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
                  onFocus={e => { (e.target as HTMLElement).style.borderColor = C.blueMid; (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)"; }}
                  onBlur={e => { (e.target as HTMLElement).style.borderColor = C.border; (e.target as HTMLElement).style.boxShadow = "none"; }}
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
                    onFocus={e => { (e.target as HTMLElement).style.borderColor = C.blueMid; (e.target as HTMLElement).style.boxShadow = "0 0 0 3px rgba(43,113,185,0.08)"; }}
                    onBlur={e => { (e.target as HTMLElement).style.borderColor = C.border; (e.target as HTMLElement).style.boxShadow = "none"; }}
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
                  onMouseEnter={e => (e.target as HTMLElement).style.color = C.navyDeep}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = C.blueMid}
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
                onMouseEnter={e => !loading && ((e.target as HTMLElement).style.background = C.blue)}
                onMouseLeave={e => (e.target as HTMLElement).style.background = C.navyDeep}
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
                <a href="/register" style={{
                  color: C.blueMid, fontWeight: 600, textDecoration: "none", transition: "color 0.15s",
                }}
                  onMouseEnter={e => (e.target as HTMLElement).style.color = C.navyDeep}
                  onMouseLeave={e => (e.target as HTMLElement).style.color = C.blueMid}
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
