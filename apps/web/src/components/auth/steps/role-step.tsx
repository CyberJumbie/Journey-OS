"use client";

import type { SelfRegisterableRole } from "@journey-os/types";

interface RoleOption {
  value: SelfRegisterableRole;
  label: string;
  description: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "faculty",
    label: "Faculty",
    description:
      "Create and manage course content, assessments, and curricula.",
  },
  {
    value: "student",
    label: "Student",
    description:
      "Access learning paths, practice questions, and track your progress.",
  },
  {
    value: "advisor",
    label: "Advisor",
    description:
      "Monitor student progress, set alerts, and manage interventions.",
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
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`w-full rounded-lg border-2 p-4 text-left transition-colors ${
              selectedRole === option.value
                ? "border-blue-mid bg-blue-mid/5"
                : "border-border-light hover:border-border"
            }`}
          >
            <div className="font-serif font-medium text-text-primary">
              {option.label}
            </div>
            <div className="mt-1 text-sm text-text-secondary">
              {option.description}
            </div>
          </button>
        ))}
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
