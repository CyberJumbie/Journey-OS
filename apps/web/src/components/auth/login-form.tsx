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
      <h1
        className="mb-2 text-center text-2xl font-semibold"
        style={{ fontFamily: "Source Sans 3, sans-serif" }}
      >
        Sign In
      </h1>
      <p className="mb-6 text-center text-sm text-gray-600">
        Welcome back to Journey OS
      </p>

      {callbackError && (
        <p className="mb-4 text-sm text-red-600">
          Authentication failed. Please sign in again.
        </p>
      )}

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
            required
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-gray-700"
            style={{ fontFamily: "DM Mono, monospace" }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={formState === "loading"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            style={{ "--tw-ring-color": "#2b71b9" } as React.CSSProperties}
            placeholder="Enter your password"
            required
          />
        </div>

        {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

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
            "Sign In"
          )}
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <a
          href="/forgot-password"
          className="hover:underline"
          style={{ color: "#2b71b9" }}
        >
          Forgot password?
        </a>
        <a
          href="/register"
          className="hover:underline"
          style={{ color: "#2b71b9" }}
        >
          Create account
        </a>
      </div>
    </div>
  );
}
