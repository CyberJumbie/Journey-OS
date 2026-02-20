"use client";

import { useState } from "react";
import type { InstitutionType } from "@journey-os/types";

type FormState = {
  institution_name: string;
  institution_type: InstitutionType | "";
  accreditation_body: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  student_count: string;
  website_url: string;
  reason: string;
};

type FormStatus = "idle" | "submitting" | "success" | "error";

const INITIAL_STATE: FormState = {
  institution_name: "",
  institution_type: "",
  accreditation_body: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  student_count: "",
  website_url: "",
  reason: "",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function ApplicationForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<FormStatus>("idle");
  const [serverError, setServerError] = useState("");
  const [submittedName, setSubmittedName] = useState("");

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!form.institution_name || form.institution_name.trim().length < 3) {
      newErrors.institution_name = "Required (minimum 3 characters)";
    }
    if (!form.institution_type) {
      newErrors.institution_type = "Required";
    }
    if (!form.accreditation_body || !form.accreditation_body.trim()) {
      newErrors.accreditation_body = "Required";
    }
    if (!form.contact_name || form.contact_name.trim().length < 2) {
      newErrors.contact_name = "Required (minimum 2 characters)";
    }
    if (
      !form.contact_email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())
    ) {
      newErrors.contact_email = "Valid email required";
    }
    const count = parseInt(form.student_count, 10);
    if (!form.student_count || isNaN(count) || count <= 0) {
      newErrors.student_count = "Must be a positive number";
    }
    if (
      form.website_url.trim() &&
      !/^https?:\/\/.+\..+/.test(form.website_url.trim())
    ) {
      newErrors.website_url = "Must start with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setStatus("submitting");
    setServerError("");

    try {
      const res = await fetch(`${API_URL}/api/v1/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institution_name: form.institution_name.trim(),
          institution_type: form.institution_type,
          accreditation_body: form.accreditation_body.trim(),
          contact_name: form.contact_name.trim(),
          contact_email: form.contact_email.trim().toLowerCase(),
          contact_phone: form.contact_phone.trim(),
          student_count: parseInt(form.student_count, 10),
          website_url: form.website_url.trim(),
          reason: form.reason.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error?.message ?? "Submission failed");
        setStatus("error");
        return;
      }

      setSubmittedName(json.data?.institution_name ?? form.institution_name);
      setStatus("success");
    } catch {
      setServerError("Network error. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center">
        <div className="mb-4 text-4xl">&#10003;</div>
        <h2 className="mb-2 font-serif text-xl font-bold text-navy-deep">
          Application Submitted
        </h2>
        <p className="text-sm text-text-secondary">
          Thank you! Your application for <strong>{submittedName}</strong> is
          now pending review. We&apos;ll contact you at the email you provided.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Institution Name"
        required
        value={form.institution_name}
        onChange={(v) => updateField("institution_name", v)}
        error={errors.institution_name}
        placeholder="e.g. Morehouse School of Medicine"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Institution Type <span className="text-error">*</span>
        </label>
        <select
          value={form.institution_type}
          onChange={(e) => updateField("institution_type", e.target.value)}
          className="w-full rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-1 focus:ring-blue-mid"
        >
          <option value="">Select type...</option>
          <option value="md">MD (Allopathic)</option>
          <option value="do">DO (Osteopathic)</option>
          <option value="combined">Combined MD/DO</option>
        </select>
        {errors.institution_type && (
          <p className="mt-1 text-xs text-error">{errors.institution_type}</p>
        )}
      </div>

      <Field
        label="Accreditation Body"
        required
        value={form.accreditation_body}
        onChange={(v) => updateField("accreditation_body", v)}
        error={errors.accreditation_body}
        placeholder="e.g. LCME, AOA"
      />

      <Field
        label="Contact Name"
        required
        value={form.contact_name}
        onChange={(v) => updateField("contact_name", v)}
        error={errors.contact_name}
        placeholder="e.g. Dr. Jane Smith"
      />

      <Field
        label="Contact Email"
        required
        type="email"
        value={form.contact_email}
        onChange={(v) => updateField("contact_email", v)}
        error={errors.contact_email}
        placeholder="e.g. jsmith@msm.edu"
      />

      <Field
        label="Contact Phone"
        value={form.contact_phone}
        onChange={(v) => updateField("contact_phone", v)}
        error={errors.contact_phone}
        placeholder="e.g. +1-404-555-0100"
      />

      <Field
        label="Student Count"
        required
        type="number"
        value={form.student_count}
        onChange={(v) => updateField("student_count", v)}
        error={errors.student_count}
        placeholder="e.g. 450"
      />

      <Field
        label="Website URL"
        value={form.website_url}
        onChange={(v) => updateField("website_url", v)}
        error={errors.website_url}
        placeholder="e.g. https://www.msm.edu"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-text-secondary">
          Reason for Interest
        </label>
        <textarea
          value={form.reason}
          onChange={(e) => updateField("reason", e.target.value)}
          rows={3}
          maxLength={1000}
          className="w-full rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-1 focus:ring-blue-mid"
          placeholder="Tell us why your institution is interested in Journey OS..."
        />
      </div>

      {serverError && (
        <div className="rounded border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded bg-navy-deep px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting..." : "Submit Application"}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-secondary">
        {label} {required && <span className="text-error">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border px-3 py-2 text-sm focus:border-blue-mid focus:outline-none focus:ring-1 focus:ring-blue-mid"
        placeholder={placeholder}
      />
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
