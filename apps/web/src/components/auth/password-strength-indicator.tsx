"use client";

import type { PasswordValidationResult } from "@journey-os/types";

const STRENGTH_COLORS: Record<string, string> = {
  weak: "var(--color-error, #dc2626)",
  fair: "var(--color-warning, #f59e0b)",
  good: "var(--color-blue-mid, #2b71b9)",
  strong: "var(--color-green, #69a338)",
};

const STRENGTH_LABELS: Record<string, string> = {
  weak: "Weak",
  fair: "Fair",
  good: "Good",
  strong: "Strong",
};

const SEGMENT_COUNT = 4;

const REQUIREMENTS = [
  { key: "minLength" as const, label: "At least 8 characters" },
  { key: "hasUppercase" as const, label: "One uppercase letter" },
  { key: "hasLowercase" as const, label: "One lowercase letter" },
  { key: "hasNumber" as const, label: "One number" },
  { key: "hasSpecial" as const, label: "One special character" },
];

function getFilledSegments(strength: string): number {
  switch (strength) {
    case "weak":
      return 1;
    case "fair":
      return 2;
    case "good":
      return 3;
    case "strong":
      return 4;
    default:
      return 0;
  }
}

export function PasswordStrengthIndicator({
  result,
}: {
  result: PasswordValidationResult;
}) {
  const color = STRENGTH_COLORS[result.strength];
  const label = STRENGTH_LABELS[result.strength];
  const filled = getFilledSegments(result.strength);

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1">
          {Array.from({ length: SEGMENT_COUNT }, (_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{
                backgroundColor:
                  i < filled ? color : "var(--color-warm-gray, #e5e7eb)",
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color }}>
          {label}
        </span>
      </div>

      {/* Requirements checklist */}
      <ul className="space-y-1">
        {REQUIREMENTS.map(({ key, label: reqLabel }) => {
          const passed = result.checks[key];
          return (
            <li key={key} className="flex items-center gap-2 text-xs">
              <span
                style={{
                  color: passed
                    ? "var(--color-green, #69a338)"
                    : "var(--color-error, #dc2626)",
                }}
              >
                {passed ? "\u2713" : "\u2717"}
              </span>
              <span
                className={passed ? "text-text-secondary" : "text-text-muted"}
              >
                {reqLabel}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
