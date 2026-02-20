"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@web/lib/supabase";
import { validatePassword } from "@web/lib/auth/password-validation";
import { PasswordStrengthIndicator } from "@web/components/auth/password-strength-indicator";

type FormState = "loading" | "idle" | "submitting" | "success" | "no-session";

export function ResetPasswordForm() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const validation = validatePassword(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    formState === "idle" &&
    validation.isValid &&
    passwordsMatch &&
    confirmPassword.length > 0;

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setFormState(user ? "idle" : "no-session");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMessage("");
    setFormState("submitting");

    const supabase = createBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setFormState("idle");
      return;
    }

    setFormState("success");

    // Sign out and redirect to login after 3 seconds
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 3000);
  }

  if (formState === "loading") {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
      </div>
    );
  }

  if (formState === "no-session") {
    return (
      <div className="text-center">
        <h1
          className="mb-4 text-2xl font-semibold"
          style={{ fontFamily: "Source Sans 3, sans-serif" }}
        >
          Session Expired
        </h1>
        <p className="mb-6 text-gray-600">
          Your password reset link has expired or is invalid.
        </p>
        <a
          href="/forgot-password"
          className="text-sm hover:underline"
          style={{ color: "#2b71b9" }}
        >
          Request a new reset link
        </a>
      </div>
    );
  }

  if (formState === "success") {
    return (
      <div className="text-center">
        <h1
          className="mb-4 text-2xl font-semibold"
          style={{ fontFamily: "Source Sans 3, sans-serif" }}
        >
          Password Updated
        </h1>
        <p className="mb-6" style={{ color: "#69a338" }}>
          Your password has been changed successfully. Redirecting to sign in...
        </p>
        <a
          href="/login"
          className="text-sm hover:underline"
          style={{ color: "#2b71b9" }}
        >
          Sign in now
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1
        className="mb-2 text-center text-2xl font-semibold"
        style={{ fontFamily: "Source Sans 3, sans-serif" }}
      >
        Reset Password
      </h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        Enter your new password below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-gray-700"
            style={{ fontFamily: "DM Mono, monospace" }}
          >
            New Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={formState === "submitting"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "#2b71b9" } as React.CSSProperties}
            placeholder="Enter new password"
            required
          />
          {password.length > 0 && (
            <div className="mt-2">
              <PasswordStrengthIndicator result={validation} />
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1 block text-sm font-medium text-gray-700"
            style={{ fontFamily: "DM Mono, monospace" }}
          >
            Confirm Password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={formState === "submitting"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "#2b71b9" } as React.CSSProperties}
            placeholder="Confirm new password"
            required
          />
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="mt-1 text-sm text-red-600">Passwords do not match.</p>
          )}
        </div>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "#2b71b9" }}
        >
          {formState === "submitting" ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            "Update Password"
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <a
          href="/login"
          className="hover:underline"
          style={{ color: "#2b71b9" }}
        >
          Back to Sign In
        </a>
      </p>
    </div>
  );
}
