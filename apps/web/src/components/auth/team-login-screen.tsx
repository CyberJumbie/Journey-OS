"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@web/lib/supabase";
import { JourneyLogo } from "@web/components/brand/journey-logo";

const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

type FormState = "idle" | "loading" | "error";

export function TeamLoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const canSubmit = email.length > 0 && password.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setErrorMessage("");
    setFormState("loading");

    const supabase = createBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
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

    const role = data.user?.app_metadata?.role as string | undefined;
    if (role !== "superadmin") {
      await supabase.auth.signOut();
      setErrorMessage("This login is restricted to Journey OS team members.");
      setFormState("error");
      return;
    }

    const next = searchParams.get("next") ?? "/admin";
    router.push(next);
    router.refresh();
  }

  const fadeIn = (delay = 0) => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? "translateY(0)" : "translateY(12px)",
    transition: `opacity 0.5s ease ${delay}s, transform 0.5s ease ${delay}s`,
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream font-sans">
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "48px 32px",
          ...fadeIn(0.1),
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="mb-5 flex items-center justify-center">
            <JourneyLogo size="md" />
          </div>
          <h2
            className="font-serif font-bold text-navy-deep"
            style={{
              fontSize: 28,
              marginBottom: 8,
              letterSpacing: "-0.01em",
            }}
          >
            Team Sign In
          </h2>
          <p className="text-sm text-text-muted">
            Internal access for Journey OS team
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          {/* Email */}
          <div>
            <label
              htmlFor="team-email"
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
              id="team-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={formState === "loading"}
              placeholder="you@journey-os.com"
              className="w-full font-sans text-ink"
              style={{
                boxSizing: "border-box",
                padding: "13px 16px",
                background: "var(--parchment)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 15,
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "var(--blue-mid)";
                e.target.style.boxShadow =
                  "0 0 0 3px rgba(43,113,185,0.082)" /* token: --blue-mid @ 8% */;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "var(--border)";
                e.target.style.boxShadow = "none";
              }}
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="team-password"
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
                id="team-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={formState === "loading"}
                placeholder="••••••••"
                className="w-full font-sans text-ink"
                style={{
                  boxSizing: "border-box",
                  padding: "13px 48px 13px 16px",
                  background: "var(--parchment)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 15,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--blue-mid)";
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(43,113,185,0.082)" /* token: --blue-mid @ 8% */;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--border)";
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

          {errorMessage && <p className="text-sm text-error">{errorMessage}</p>}

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
              marginTop: 4,
              cursor:
                !canSubmit || formState === "loading" ? "default" : "pointer",
              background: !canSubmit ? "var(--warm-gray)" : "var(--navy-deep)",
              color: !canSubmit ? "var(--text-muted)" : "var(--white)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (canSubmit && formState !== "loading")
                e.currentTarget.style.background = "var(--blue)";
            }}
            onMouseLeave={(e) => {
              if (canSubmit && formState !== "loading")
                e.currentTarget.style.background = "var(--navy-deep)";
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
        </form>

        <div style={{ marginTop: 32, textAlign: "center" }}>
          <div className="flex items-center justify-center gap-1.5">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="#718096" /* token: --text-muted */
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="7" width="10" height="8" rx="1.5" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" />
            </svg>
            <span
              className="font-mono uppercase text-text-muted"
              style={{
                fontSize: 9,
                letterSpacing: "0.1em",
              }}
            >
              Journey OS Internal
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
