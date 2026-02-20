"use client";

import { useState } from "react";

interface ProfileStepProps {
  displayName: string;
  email: string;
  password: string;
  onDisplayNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter";
  if (!/\d/.test(password)) return "Password must contain at least one number";
  return null;
}

export function ProfileStep({
  displayName,
  email,
  password,
  onDisplayNameChange,
  onEmailChange,
  onPasswordChange,
  onNext,
  onBack,
}: ProfileStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleNext() {
    const newErrors: Record<string, string> = {};

    if (!displayName.trim()) {
      newErrors.displayName = "Name is required";
    }

    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length === 0) {
      onNext();
    }
  }

  const inputClassName =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2";

  return (
    <div>
      <h2
        className="mb-2 text-center text-xl font-semibold"
        style={{ fontFamily: "Source Sans 3, sans-serif" }}
      >
        Profile Information
      </h2>
      <p className="mb-6 text-center text-sm text-gray-600">
        Enter your name, email, and password.
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="displayName"
            className="mb-1 block text-sm font-medium text-gray-700"
            style={{ fontFamily: "DM Mono, monospace" }}
          >
            Full Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className={inputClassName}
            style={{ "--tw-ring-color": "#2b71b9" } as React.CSSProperties}
            placeholder="Dr. Jane Smith"
          />
          {errors.displayName && (
            <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>
          )}
        </div>

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
            onChange={(e) => onEmailChange(e.target.value)}
            className={inputClassName}
            style={{ "--tw-ring-color": "#2b71b9" } as React.CSSProperties}
            placeholder="you@example.edu"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
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
            onChange={(e) => onPasswordChange(e.target.value)}
            className={inputClassName}
            style={{ "--tw-ring-color": "#2b71b9" } as React.CSSProperties}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 rounded-md px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: "#2b71b9" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
