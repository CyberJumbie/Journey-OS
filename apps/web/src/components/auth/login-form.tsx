"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@web/lib/supabase";

type FormState = "idle" | "loading" | "error";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const callbackError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div>
      <h1 className="mb-2 text-center font-serif text-2xl font-semibold text-navy-deep">
        Sign In
      </h1>
      <p className="mb-6 text-center text-sm text-text-secondary">
        Welcome back to Journey OS
      </p>

      {callbackError && (
        <p className="mb-4 text-sm text-error">
          Authentication failed. Please sign in again.
        </p>
      )}

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
            required
          />
        </div>

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
            disabled={formState === "loading"}
            className="w-full rounded-lg border border-border bg-parchment px-3 py-2 text-sm text-text-primary focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15"
            placeholder="Enter your password"
            required
          />
        </div>

        {errorMessage && <p className="text-sm text-error">{errorMessage}</p>}

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
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <a
          href="/forgot-password"
          className="font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
        >
          Forgot password?
        </a>
        <a
          href="/register"
          className="font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
        >
          Create account
        </a>
      </div>
    </div>
  );
}
