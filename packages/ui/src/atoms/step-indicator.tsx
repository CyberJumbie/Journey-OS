"use client";

import { Check } from "lucide-react";

export interface StepIndicatorProps {
  readonly steps: readonly { id: number; label: string }[];
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
}

export function StepIndicator({
  steps,
  currentStep,
  completedSteps,
}: StepIndicatorProps) {
  return (
    <>
      {/* Desktop: horizontal */}
      <nav aria-label="Wizard progress" className="hidden sm:block">
        <ol className="flex items-center gap-0">
          {steps.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id);
            const isActive = step.id === currentStep;

            return (
              <li key={step.id} className="flex items-center">
                {idx > 0 && (
                  <div
                    className={`h-0.5 w-8 md:w-12 ${
                      completedSteps.includes(steps[idx - 1]!.id)
                        ? "bg-[var(--color-green)]"
                        : "bg-warm-gray"
                    }`}
                  />
                )}
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                      isCompleted
                        ? "bg-[var(--color-green)] text-white"
                        : isActive
                          ? "bg-navy-deep text-white"
                          : "border-2 border-warm-gray text-text-secondary"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span
                    className={`text-xs text-center max-w-[5rem] leading-tight ${
                      isCompleted
                        ? "text-[var(--color-green)] font-medium"
                        : isActive
                          ? "text-navy-deep font-semibold"
                          : "text-text-secondary"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile: vertical */}
      <nav aria-label="Wizard progress" className="sm:hidden">
        <ol className="flex flex-col gap-3">
          {steps.map((step, idx) => {
            const isCompleted = completedSteps.includes(step.id);
            const isActive = step.id === currentStep;

            return (
              <li key={step.id} className="flex items-center gap-3">
                {idx > 0 && (
                  <div
                    className={`absolute ml-[0.9375rem] -mt-6 h-3 w-0.5 ${
                      completedSteps.includes(steps[idx - 1]!.id)
                        ? "bg-[var(--color-green)]"
                        : "bg-warm-gray"
                    }`}
                  />
                )}
                <div
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                    isCompleted
                      ? "bg-[var(--color-green)] text-white"
                      : isActive
                        ? "bg-navy-deep text-white"
                        : "border-2 border-warm-gray text-text-secondary"
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : step.id}
                </div>
                <span
                  className={`text-sm ${
                    isCompleted
                      ? "text-[var(--color-green)] font-medium"
                      : isActive
                        ? "text-navy-deep font-semibold"
                        : "text-text-secondary"
                  }`}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
