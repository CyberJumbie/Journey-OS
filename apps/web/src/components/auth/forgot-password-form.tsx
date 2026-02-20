"use client";

import { useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [validationError, setValidationError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");

    const trimmed = email.trim();
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setValidationError("Please enter a valid email address.");
      return;
    }

    setFormState("loading");

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });

      if (res.status === 429) {
        setValidationError("Too many requests. Please try again later.");
        setFormState("idle");
        return;
      }

      if (!res.ok) {
        setFormState("error");
        return;
      }

      setFormState("success");
    } catch {
      setFormState("error");
    }
  }

  if (formState === "success") {
    return (
      <div className="text-center">
        <h1 className="mb-4 font-serif text-2xl font-semibold text-navy-deep">
          Check Your Email
        </h1>
        <p className="mb-6 text-green">
          If an account with that email exists, a password reset link has been
          sent.
        </p>
        <a
          href="/login"
          className="text-sm font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
        >
          Back to Login
        </a>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-center font-serif text-2xl font-semibold text-navy-deep">
        Forgot Password
      </h1>
      <p className="mb-6 text-center text-sm text-text-secondary">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={formState === "loading"}
            className="w-full rounded-lg border border-border bg-parchment px-3 py-2 text-sm text-text-primary focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
            placeholder="you@example.edu"
          />
          {validationError && (
            <p className="mt-1 text-sm text-error">{validationError}</p>
          )}
        </div>

        {formState === "error" && (
          <p className="text-sm text-error">
            Something went wrong. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={formState === "loading"}
          className="flex w-full items-center justify-center rounded-lg bg-navy-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue disabled:opacity-60"
        >
          {formState === "loading" ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : formState === "error" ? (
            "Try Again"
          ) : (
            "Send Reset Link"
          )}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        <a
          href="/login"
          className="font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
        >
          Back to Login
        </a>
      </p>
    </div>
  );
}
