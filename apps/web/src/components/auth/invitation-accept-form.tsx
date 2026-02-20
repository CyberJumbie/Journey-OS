"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validatePassword } from "@web/lib/auth/password-validation";
import { PasswordStrengthIndicator } from "@web/components/auth/password-strength-indicator";

type FlowState =
  | "validating"
  | "invalid"
  | "form"
  | "submitting"
  | "success"
  | "error";

interface TokenPayload {
  invitation_id: string;
  email: string;
  role: string;
  institution_id: string;
  institution_name: string;
  expires_at: string;
  is_valid: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function InvitationAcceptFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [flowState, setFlowState] = useState<FlowState>("validating");
  const [payload, setPayload] = useState<TokenPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    flowState === "form" &&
    validation.isValid &&
    passwordsMatch &&
    confirmPassword.length > 0 &&
    fullName.trim().length > 0;

  useEffect(() => {
    if (!token) {
      setErrorMessage("No invitation token provided.");
      setErrorCode("MISSING_TOKEN");
      setFlowState("invalid");
      return;
    }

    async function validateToken() {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/invitations/validate?token=${encodeURIComponent(token!)}`,
        );
        const json = await res.json();

        if (!res.ok) {
          setErrorMessage(json.error?.message ?? "Invalid invitation.");
          setErrorCode(json.error?.code ?? "UNKNOWN");
          setFlowState("invalid");
          return;
        }

        setPayload(json.data);
        setFlowState("form");
      } catch {
        setErrorMessage("Unable to validate invitation. Please try again.");
        setFlowState("invalid");
      }
    }

    validateToken();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMessage("");
    setFlowState("submitting");

    try {
      const res = await fetch(`${API_BASE}/api/v1/invitations/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          full_name: fullName.trim(),
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(json.error?.message ?? "Failed to create account.");
        setFlowState("error");
        return;
      }

      setFlowState("success");
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch {
      setErrorMessage("Network error. Please try again.");
      setFlowState("error");
    }
  }

  // Validating state
  if (flowState === "validating") {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <span className="mb-4 inline-block h-6 w-6 animate-spin rounded-full border-2 border-border border-t-transparent" />
        <p className="text-sm text-text-secondary">
          Validating your invitation...
        </p>
      </div>
    );
  }

  // Invalid token state
  if (flowState === "invalid") {
    return (
      <div className="text-center">
        <h1 className="mb-4 font-serif text-2xl font-semibold text-navy-deep">
          {errorCode === "INVITATION_EXPIRED"
            ? "Invitation Expired"
            : errorCode === "INVITATION_ALREADY_USED"
              ? "Invitation Already Used"
              : "Invalid Invitation"}
        </h1>
        <p className="mb-6 text-text-secondary">{errorMessage}</p>
        {errorCode === "INVITATION_ALREADY_USED" ? (
          <a
            href="/login"
            className="text-sm font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
          >
            Go to Sign In
          </a>
        ) : (
          <p className="text-sm text-text-muted">
            Please contact your institution administrator to request a new
            invitation.
          </p>
        )}
      </div>
    );
  }

  // Success state
  if (flowState === "success") {
    return (
      <div className="text-center">
        <h1 className="mb-4 font-serif text-2xl font-semibold text-navy-deep">
          Account Created
        </h1>
        <p className="mb-6 text-green">
          Welcome to {payload?.institution_name}! Redirecting to sign in...
        </p>
        <a
          href="/login"
          className="text-sm font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
        >
          Sign in now
        </a>
      </div>
    );
  }

  // Form state (and error/submitting)
  return (
    <div>
      {/* Institution banner */}
      <div className="mb-6 rounded-lg bg-parchment p-4 text-center">
        <p className="font-serif text-lg font-semibold text-navy-deep">
          Join {payload?.institution_name}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          You&apos;ve been invited as{" "}
          <span className="font-medium text-text-primary">
            {payload?.role?.replace("_", " ")}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email (read-only) */}
        <div>
          <label
            htmlFor="email"
            className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={payload?.email ?? ""}
            disabled
            className="w-full rounded-lg border border-border-light bg-parchment px-3 py-2 text-sm text-text-muted"
          />
        </div>

        {/* Full name */}
        <div>
          <label
            htmlFor="full-name"
            className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted"
          >
            Full Name
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={flowState === "submitting"}
            className="w-full rounded-lg border border-border bg-parchment px-3 py-2 text-sm text-text-primary focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
            placeholder="Dr. Jane Smith"
            required
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={flowState === "submitting"}
            className="w-full rounded-lg border border-border bg-parchment px-3 py-2 text-sm text-text-primary focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
            placeholder="Enter password"
            required
          />
          {password.length > 0 && (
            <div className="mt-2">
              <PasswordStrengthIndicator result={validation} />
            </div>
          )}
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted"
          >
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={flowState === "submitting"}
            className="w-full rounded-lg border border-border bg-parchment px-3 py-2 text-sm text-text-primary focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
            placeholder="Confirm password"
            required
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-sm text-error">Passwords do not match.</p>
          )}
        </div>

        {errorMessage && flowState === "error" && (
          <p className="text-sm text-error">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center rounded-lg bg-green px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-dark disabled:opacity-60"
        >
          {flowState === "submitting" ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            "Create Account & Join"
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
        >
          Sign In
        </a>
      </p>
    </div>
  );
}
