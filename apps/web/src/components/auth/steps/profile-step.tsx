"use client";

import { useState } from "react";
import { PasswordToggle } from "@web/components/auth/password-toggle";

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
  const [showPassword, setShowPassword] = useState(false);

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
    "w-full rounded-lg border border-border bg-parchment px-3 py-2 text-sm text-text-primary focus:border-blue-mid focus:outline-none focus:ring-2 focus:ring-blue-mid/15";

  return (
    <div>
      <h2 className="mb-2 text-center font-serif text-xl font-semibold text-navy-deep">
        Profile Information
      </h2>
      <p className="mb-6 text-center text-sm text-text-secondary">
        Enter your name, email, and password.
      </p>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="displayName"
            className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted"
          >
            Full Name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            className={inputClassName}
            placeholder="Dr. Jane Smith"
          />
          {errors.displayName && (
            <p className="mt-1 text-sm text-error">{errors.displayName}</p>
          )}
        </div>

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
            onChange={(e) => onEmailChange(e.target.value)}
            className={inputClassName}
            placeholder="you@example.edu"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-error">{errors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-text-muted"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className={`${inputClassName} pr-10`}
              placeholder="Min 8 chars, 1 uppercase, 1 number"
            />
            <PasswordToggle
              show={showPassword}
              onToggle={() => setShowPassword(!showPassword)}
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-error">{errors.password}</p>
          )}
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-parchment"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 rounded-lg bg-navy-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
