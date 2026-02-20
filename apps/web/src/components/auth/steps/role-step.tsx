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
      <h2
        className="mb-2 text-center text-xl font-semibold"
        style={{ fontFamily: "Source Sans 3, sans-serif" }}
      >
        Select Your Role
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600">
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
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
            style={
              selectedRole === option.value
                ? { borderColor: "#2b71b9", backgroundColor: "#f0f6ff" }
                : undefined
            }
          >
            <div className="font-medium">{option.label}</div>
            <div className="mt-1 text-sm text-gray-600">
              {option.description}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!selectedRole}
        className="mt-6 flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "#2b71b9" }}
      >
        Continue
      </button>
    </div>
  );
}
