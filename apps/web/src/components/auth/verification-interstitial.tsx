"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, RefreshCw } from "lucide-react";
import { createBrowserClient } from "@web/lib/supabase";
import { getDashboardPath } from "@web/lib/auth/dashboard-routes";

type InterstitialState = "idle" | "sending" | "sent" | "rate-limited" | "error";

/**
 * VerificationInterstitial — client component for the email verification gate.
 * [STORY-U-14] Shows instructions, resend button with cooldown, and auto-redirects on verification.
 */
export function VerificationInterstitial() {
  const router = useRouter();
  const [state, setState] = useState<InterstitialState>("idle");
  const [email, setEmail] = useState<string>("");
  const [cooldown, setCooldown] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const supabase = createBrowserClient();

    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      setEmail(session.user.email ?? "");

      if (session.user.email_confirmed_at) {
        const role = (session.user.app_metadata?.role as string) ?? "";
        const dashboard = getDashboardPath(role) ?? "/";
        router.replace(dashboard);
      }
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "USER_UPDATED" && session?.user.email_confirmed_at) {
        const role = (session.user.app_metadata?.role as string) ?? "";
        const dashboard = getDashboardPath(role) ?? "/";
        router.replace(dashboard);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (state === "sent") setState("idle");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown, state]);

  const handleResend = useCallback(async () => {
    setState("sending");
    setErrorMessage("");

    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.status === 429) {
        setState("rate-limited");
        setCooldown(60);
        return;
      }

      if (res.status === 400) {
        const role = (session.user.app_metadata?.role as string) ?? "";
        const dashboard = getDashboardPath(role) ?? "/";
        router.replace(dashboard);
        return;
      }

      if (!res.ok) {
        setState("error");
        setErrorMessage("Failed to send verification email. Please try again.");
        return;
      }

      setState("sent");
      setCooldown(60);
    } catch {
      setState("error");
      setErrorMessage("An unexpected error occurred. Please try again.");
    }
  }, [router]);

  const isButtonDisabled = state === "sending" || cooldown > 0;

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-border-light bg-white p-8 shadow-sm">
      <div className="mb-6 flex justify-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-mid/5">
          <Mail className="h-8 w-8 text-blue-mid" />
        </div>
      </div>

      <h1 className="mb-2 text-center font-serif text-2xl font-bold text-text-primary">
        Verify your email
      </h1>

      <p className="mb-2 text-center text-sm text-text-secondary">
        We sent a verification link to
      </p>

      {email && (
        <p className="mb-6 text-center text-sm font-medium text-text-primary">
          {email}
        </p>
      )}

      <p className="mb-6 text-center text-sm text-text-muted">
        Click the link in the email to verify your account. Check your spam
        folder if you don&apos;t see it.
      </p>

      <button
        type="button"
        onClick={handleResend}
        disabled={isButtonDisabled}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-green px-4 py-2.5 text-sm font-medium text-green transition-colors hover:bg-green/5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {state === "sending" ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : cooldown > 0 ? (
          `Resend in ${cooldown}s`
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            Resend verification email
          </>
        )}
      </button>

      {state === "sent" && (
        <p className="mt-3 text-center text-sm text-green">
          Verification email sent! Check your inbox.
        </p>
      )}

      {state === "rate-limited" && (
        <p className="mt-3 text-center text-sm text-warning">
          Too many requests. Please wait before trying again.
        </p>
      )}

      {state === "error" && errorMessage && (
        <p className="mt-3 text-center text-sm text-error">{errorMessage}</p>
      )}

      <div className="mt-6 text-center">
        <a
          href="/login"
          className="text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          Back to login
        </a>
      </div>
    </div>
  );
}
