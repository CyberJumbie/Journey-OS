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
        <h1
          className="mb-4 text-2xl font-semibold"
          style={{ fontFamily: "Source Sans 3, sans-serif" }}
        >
          Check Your Email
        </h1>
        <p className="mb-6" style={{ color: "#69a338" }}>
          If an account with that email exists, a password reset link has been
          sent.
        </p>
        <a
          href="/login"
          className="text-sm hover:underline"
          style={{ color: "#2b71b9" }}
        >
          Back to Login
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
        Forgot Password
      </h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-gray-700"
            style={{ fontFamily: "DM Mono, monospace" }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={formState === "loading"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "#2b71b9" } as React.CSSProperties}
            placeholder="you@example.edu"
          />
          {validationError && (
            <p className="mt-1 text-sm text-red-600">{validationError}</p>
          )}
        </div>

        {formState === "error" && (
          <p className="text-sm text-red-600">
            Something went wrong. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={formState === "loading"}
          className="flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          style={{ backgroundColor: "#2b71b9" }}
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
          className="hover:underline"
          style={{ color: "#2b71b9" }}
        >
          Back to Login
        </a>
      </p>
    </div>
  );
}
