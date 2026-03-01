"use client";

import type { SelfRegisterableRole } from "@journey-os/types";

interface RoleOption {
  value: SelfRegisterableRole;
  label: string;
  description: string;
  icon: string;
  accentColor: string;
  features: string[];
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "faculty",
    label: "Faculty",
    description:
      "Create and manage course content, assessments, and curricula.",
    icon: "\uD83C\uDFEB",
    accentColor: "var(--blue-mid)",
    features: [
      "AI-powered question generation",
      "Curriculum mapping tools",
      "Student performance analytics",
    ],
  },
  {
    value: "student",
    label: "Student",
    description:
      "Access learning paths, practice questions, and track your progress.",
    icon: "\uD83C\uDF93",
    accentColor: "var(--green)",
    features: [
      "Adaptive practice sessions",
      "Mastery tracking dashboard",
      "Exam preparation tools",
    ],
  },
  {
    value: "advisor",
    label: "Advisor",
    description:
      "Monitor student progress, set alerts, and manage interventions.",
    icon: "\uD83E\uDDE0",
    accentColor: "var(--navy-deep)",
    features: [
      "Student progress monitoring",
      "Early alert system",
      "Intervention management",
    ],
  },
];

interface RoleStepProps {
  selectedRole: SelfRegisterableRole | null;
  onSelect: (role: SelfRegisterableRole) => void;
  onNext: () => void;
}

export function RoleStep({ selectedRole, onSelect, onNext }: RoleStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-serif text-xl font-semibold text-navy-deep">
        Select Your Role
      </h2>
      <p className="mb-6 text-center text-sm text-text-secondary">
        Choose the role that best describes you.
      </p>

      <div className="space-y-3">
        {ROLE_OPTIONS.map((option) => {
          const isSelected = selectedRole === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
                isSelected
                  ? "border-blue-mid bg-blue-mid/5"
                  : "border-border-light hover:border-border"
              }`}
              style={{
                borderLeftWidth: 4,
                borderLeftColor: isSelected
                  ? option.accentColor
                  : "var(--border-light)",
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 20 }}>{option.icon}</span>
                <span className="font-serif font-medium text-text-primary">
                  {option.label}
                </span>
              </div>
              <div className="mt-1 text-sm text-text-secondary">
                {option.description}
              </div>
              <ul className="mt-2 space-y-1">
                {option.features.map((feat) => (
                  <li
                    key={feat}
                    className="flex items-center gap-1.5 text-xs text-text-muted"
                  >
                    <span
                      className="inline-block h-1 w-1 shrink-0 rounded-full"
                      style={{ background: option.accentColor }}
                    />
                    {feat}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!selectedRole}
        className="mt-6 flex w-full items-center justify-center rounded-lg bg-navy-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue disabled:opacity-60"
      >
        Continue
      </button>
    </div>
  );
}
