"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  FileInput,
  UserPlus,
  BookOpen,
  PenTool,
  Sparkles,
  GraduationCap,
  Route,
  Dumbbell,
  Activity,
  Bell,
  ChevronRight,
  ChevronLeft,
  Check,
  type LucideIcon,
} from "lucide-react";
import type { OnboardingConfig, OnboardingStep } from "@journey-os/types";
import { createBrowserClient } from "@web/lib/supabase";
import { ONBOARDING_CONFIGS } from "@web/config/onboarding.config";
import { getDashboardPath } from "@web/lib/auth/dashboard-routes";

/**
 * Static icon mapping to avoid dynamic imports and keep bundle small.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  ClipboardList,
  Users,
  Building2,
  FileInput,
  UserPlus,
  BookOpen,
  PenTool,
  Sparkles,
  GraduationCap,
  Route,
  Dumbbell,
  Activity,
  Bell,
};

type FlowState = "loading" | "welcome" | "steps" | "completing";

/**
 * OnboardingFlow — client component for the persona onboarding experience.
 * [STORY-U-13] States: loading → redirect (if done) → welcome → steps → complete.
 */
export function OnboardingFlow() {
  const router = useRouter();
  const [state, setState] = useState<FlowState>("loading");
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const supabase = createBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const res = await fetch("/api/v1/onboarding/status", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (!res.ok) {
          setError("Failed to load onboarding status.");
          return;
        }

        const json = await res.json();
        const status = json.data;

        if (status.onboarding_complete) {
          const dashboard = getDashboardPath(status.role) ?? "/";
          router.replace(dashboard);
          return;
        }

        const roleConfig = ONBOARDING_CONFIGS[status.role];
        if (!roleConfig) {
          setError(
            `No onboarding configuration found for role: ${status.role}`,
          );
          return;
        }

        setConfig(roleConfig);
        setState("welcome");
      } catch {
        setError("An unexpected error occurred. Please try again.");
      }
    }

    fetchStatus();
  }, [router]);

  const completeOnboarding = useCallback(async () => {
    setState("completing");
    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/v1/onboarding/complete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skipped: false }),
      });

      if (!res.ok) {
        setError("Failed to complete onboarding.");
        setState("steps");
        return;
      }

      const role = config?.role ?? "";
      const dashboard = getDashboardPath(role) ?? "/";
      router.replace(dashboard);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setState("steps");
    }
  }, [config, router]);

  const skipOnboarding = useCallback(async () => {
    setState("completing");
    try {
      const supabase = createBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      await fetch("/api/v1/onboarding/complete", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ skipped: true }),
      });

      const role = config?.role ?? "";
      const dashboard = getDashboardPath(role) ?? "/";
      router.replace(dashboard);
    } catch {
      const role = config?.role ?? "";
      const dashboard = getDashboardPath(role) ?? "/";
      router.replace(dashboard);
    }
  }, [config, router]);

  if (state === "loading") {
    return (
      <div className="flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!config) return null;

  if (state === "welcome") {
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          {config.welcome_title}
        </h1>
        <p className="mt-3 text-lg text-gray-600">{config.welcome_subtitle}</p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setState("steps")}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            Get Started
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={skipOnboarding}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip onboarding
          </button>
        </div>
      </div>
    );
  }

  if (state === "completing") {
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
        <p className="text-gray-600">Finishing up...</p>
      </div>
    );
  }

  // steps state
  const step = config.steps[currentStep];
  if (!step) return null;
  const totalSteps = config.steps.length;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Step indicator */}
      <StepIndicator
        currentStep={currentStep}
        totalSteps={totalSteps}
        steps={config.steps}
      />

      {/* Step card */}
      <OnboardingCard
        step={step}
        isLast={isLast}
        onNext={() => {
          if (isLast) {
            completeOnboarding();
          } else {
            setCurrentStep((prev) => prev + 1);
          }
        }}
        onPrev={
          currentStep > 0 ? () => setCurrentStep((prev) => prev - 1) : undefined
        }
        onSkip={skipOnboarding}
      />
    </div>
  );
}

/**
 * StepIndicator molecule — shows progress through onboarding steps.
 */
function StepIndicator({
  currentStep,
  totalSteps,
  steps,
}: {
  currentStep: number;
  totalSteps: number;
  steps: readonly OnboardingStep[];
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                index < currentStep
                  ? "bg-blue-600 text-white"
                  : index === currentStep
                    ? "border-2 border-blue-600 text-blue-600"
                    : "border-2 border-gray-300 text-gray-400"
              }`}
            >
              {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            {index < totalSteps - 1 && (
              <div
                className={`mx-2 h-0.5 w-12 sm:w-20 ${
                  index < currentStep ? "bg-blue-600" : "bg-gray-300"
                }`}
              />
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-center text-sm text-gray-500">
        Step {currentStep + 1} of {totalSteps}
      </p>
    </div>
  );
}

/**
 * OnboardingCard organism — displays a single onboarding step.
 */
function OnboardingCard({
  step,
  isLast,
  onNext,
  onPrev,
  onSkip,
}: {
  step: OnboardingStep;
  isLast: boolean;
  onNext: () => void;
  onPrev?: () => void;
  onSkip: () => void;
}) {
  const IconComponent = ICON_MAP[step.icon];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex items-center gap-4">
        {IconComponent && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
            <IconComponent className="h-6 w-6 text-blue-600" />
          </div>
        )}
        <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
      </div>

      <p className="mb-6 text-gray-600">{step.description}</p>

      {step.action_href && (
        <a
          href={step.action_href}
          className="mb-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {step.action_label ?? "Learn more"} →
        </a>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-6">
        <div className="flex gap-3">
          {onPrev && (
            <button
              type="button"
              onClick={onPrev}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <button
            type="button"
            onClick={onSkip}
            className="rounded-md px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Skip
          </button>
        </div>
        <button
          type="button"
          onClick={onNext}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm text-white hover:bg-blue-700"
        >
          {isLast ? "Complete" : "Next"}
          {isLast ? (
            <Check className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
