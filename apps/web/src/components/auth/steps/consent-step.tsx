"use client";

const FERPA_VERSION = "1.0";

const FERPA_DISCLOSURE = `The Family Educational Rights and Privacy Act (FERPA) (20 U.S.C. § 1232g; 34 CFR Part 99) is a Federal law that protects the privacy of student education records. By consenting, you acknowledge that:

1. Your educational records, including assessment performance, learning analytics, and progress data, will be stored and processed by Journey OS.

2. This data will be used to provide personalized learning experiences, adaptive assessments, and academic advising support.

3. Your data may be shared with authorized institutional personnel (faculty, advisors, administrators) who have a legitimate educational interest.

4. You have the right to inspect and review your education records, request amendments, and consent to disclosures of personally identifiable information.

5. You may revoke this consent at any time by contacting your institution's registrar or Journey OS support.`;

interface ConsentStepProps {
  consented: boolean;
  onConsentChange: (value: boolean) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function ConsentStep({
  consented,
  onConsentChange,
  onSubmit,
  onBack,
  isSubmitting,
}: ConsentStepProps) {
  return (
    <div>
      <h2 className="mb-2 text-center font-serif text-xl font-semibold text-navy-deep">
        FERPA Consent
      </h2>
      <p className="mb-4 text-center text-sm text-text-secondary">
        Please review and accept the FERPA disclosure.
      </p>

      <div className="max-h-48 overflow-y-auto rounded-lg border border-border-light bg-parchment p-4 text-sm leading-relaxed text-text-secondary">
        {FERPA_DISCLOSURE.split("\n\n").map((paragraph, i) => (
          <p key={i} className={i > 0 ? "mt-3" : ""}>
            {paragraph}
          </p>
        ))}
      </div>

      <p className="mt-2 text-right font-mono text-[9px] uppercase tracking-wider text-text-muted">
        Version {FERPA_VERSION}
      </p>

      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={consented}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-blue-mid"
        />
        <span className="text-sm text-text-secondary">
          I have read and agree to the FERPA disclosure above. I understand how
          my educational data will be used and shared.
        </span>
      </label>

      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-parchment disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!consented || isSubmitting}
          className="flex-1 rounded-lg bg-navy-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue disabled:opacity-60"
        >
          {isSubmitting ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            "Create Account"
          )}
        </button>
      </div>
    </div>
  );
}

export { FERPA_VERSION };
