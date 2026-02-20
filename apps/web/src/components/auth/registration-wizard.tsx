"use client";

import { useState } from "react";
import type { SelfRegisterableRole, RegistrationStep } from "@journey-os/types";
import { RoleStep } from "./steps/role-step";
import { ProfileStep } from "./steps/profile-step";
import { InstitutionStep } from "./steps/institution-step";
import { ConsentStep, FERPA_VERSION } from "./steps/consent-step";

const STEPS: RegistrationStep[] = ["role", "profile", "institution", "consent"];
const STEP_LABELS = ["Role", "Profile", "Institution", "Consent"];

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type WizardState = "filling" | "submitting" | "success" | "error";

export function RegistrationWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<WizardState>("filling");
  const [errorMessage, setErrorMessage] = useState("");

  // Form state — preserved across steps
  const [role, setRole] = useState<SelfRegisterableRole | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [institutionId, setInstitutionId] = useState<string | null>(null);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [consented, setConsented] = useState(false);

  function goNext() {
    setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (!role || !institutionId) return;

    setWizardState("submitting");
    setErrorMessage("");

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          email: email.trim().toLowerCase(),
          password,
          display_name: displayName.trim(),
          institution_id: institutionId,
          consented,
          consent_version: FERPA_VERSION,
        }),
      });

      if (res.status === 429) {
        setErrorMessage(
          "Too many registration attempts. Please try again later.",
        );
        setWizardState("error");
        return;
      }

      const json = await res.json();

      if (!res.ok) {
        setErrorMessage(
          json.error?.message ?? "Registration failed. Please try again.",
        );
        setWizardState("error");
        return;
      }

      setWizardState("success");
    } catch {
      setErrorMessage(
        "Network error. Please check your connection and try again.",
      );
      setWizardState("error");
    }
  }

  if (wizardState === "success") {
    return (
      <div className="text-center">
        <h1 className="mb-4 font-serif text-2xl font-semibold text-navy-deep">
          Check Your Email
        </h1>
        <p className="mb-6 text-green">
          We&apos;ve sent a verification link to <strong>{email}</strong>.
          Please check your inbox to activate your account.
        </p>
        <a
          href="/login"
          className="text-sm font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
        >
          Go to Login
        </a>
      </div>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div>
      {/* Progress indicator */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {STEPS.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-medium ${
                i <= currentStep
                  ? "bg-blue-mid text-white"
                  : "border border-border text-text-muted"
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`hidden text-xs sm:inline ${
                i <= currentStep
                  ? "font-medium text-text-primary"
                  : "text-text-muted"
              }`}
            >
              {STEP_LABELS[i]}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-6 ${i < currentStep ? "bg-blue-mid" : "bg-border-light"}`}
              />
            )}
          </div>
        ))}
      </div>

      {wizardState === "error" && (
        <div className="mb-4 rounded-lg border border-error/20 bg-error/5 p-3 text-sm text-error">
          {errorMessage}
        </div>
      )}

      {step === "role" && (
        <RoleStep selectedRole={role} onSelect={setRole} onNext={goNext} />
      )}

      {step === "profile" && (
        <ProfileStep
          displayName={displayName}
          email={email}
          password={password}
          onDisplayNameChange={setDisplayName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === "institution" && (
        <InstitutionStep
          selectedInstitutionId={institutionId}
          selectedInstitutionName={institutionName}
          onSelect={(id, name) => {
            setInstitutionId(id);
            setInstitutionName(name);
          }}
          onNext={goNext}
          onBack={goBack}
        />
      )}

      {step === "consent" && (
        <ConsentStep
          consented={consented}
          onConsentChange={(value) => {
            setConsented(value);
            if (wizardState === "error") setWizardState("filling");
          }}
          onSubmit={handleSubmit}
          onBack={goBack}
          isSubmitting={wizardState === "submitting"}
        />
      )}

      <p className="mt-6 text-center text-sm">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-medium text-blue-mid transition-colors hover:text-navy-deep hover:underline"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
