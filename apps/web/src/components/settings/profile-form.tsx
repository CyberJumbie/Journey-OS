"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ProfileResponse, UpdateProfileRequest } from "@journey-os/types";
import { PROFILE_BIO_MAX } from "@journey-os/types";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@web/lib/validations/profile.validation";
import { AvatarUploader } from "@web/components/settings/avatar-uploader";
import { createBrowserClient } from "@web/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

type SubmitStatus = "idle" | "saving" | "success" | "error";

interface ProfileFormProps {
  readonly initialProfile: ProfileResponse;
  readonly onUpdate: (profile: ProfileResponse | null) => void;
  readonly onAvatarChange: () => void;
}

export function ProfileForm({
  initialProfile,
  onUpdate,
  onAvatarChange,
}: ProfileFormProps) {
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      display_name: initialProfile.display_name ?? "",
      bio: initialProfile.bio ?? "",
      department: initialProfile.department ?? "",
      title: initialProfile.title ?? "",
    },
  });

  const bioValue = watch("bio");

  const onSubmit = useCallback(
    async (data: ProfileFormValues) => {
      setSubmitStatus("saving");
      setServerError(null);

      try {
        const supabase = createBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          setServerError("Session expired. Please sign in again.");
          setSubmitStatus("error");
          return;
        }

        const body: UpdateProfileRequest = {
          display_name: data.display_name.trim(),
          bio: data.bio?.trim(),
          department: data.department?.trim(),
          title: data.title?.trim(),
        };

        const res = await fetch(`${API_URL}/api/v1/profile`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });

        const json = (await res.json()) as {
          data: ProfileResponse | null;
          error: { code: string; message: string } | null;
        };

        if (json.error) {
          setServerError(json.error.message);
          setSubmitStatus("error");
          return;
        }

        onUpdate(json.data);
        setSubmitStatus("success");
        setTimeout(() => setSubmitStatus("idle"), 2000);
      } catch {
        setServerError("Network error. Please try again.");
        setSubmitStatus("error");
      }
    },
    [onUpdate],
  );

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid var(--border-default, #d1d5db)",
    borderRadius: "var(--radius-sm, 6px)",
    fontFamily: "var(--font-sans, system-ui, sans-serif)",
    fontSize: "0.875rem",
    color: "var(--color-text-primary, #1a1a2e)",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    fontFamily: "var(--font-sans, system-ui, sans-serif)",
    fontSize: "0.8125rem",
    fontWeight: 500 as const,
    color: "var(--color-text-secondary, #6b7280)",
    marginBottom: "var(--space-1, 4px)",
  };

  const errorStyle = {
    fontFamily: "var(--font-sans, system-ui, sans-serif)",
    fontSize: "0.75rem",
    color: "var(--color-error, #dc2626)",
    marginTop: "var(--space-1, 4px)",
  };

  return (
    <div
      style={{
        backgroundColor: "var(--surface-white, #ffffff)",
        borderRadius: "var(--radius-md, 8px)",
        padding: "var(--space-6, 24px)",
      }}
    >
      {/* Avatar section */}
      <AvatarUploader
        currentAvatarUrl={initialProfile.avatar_url}
        userId={initialProfile.id}
        onAvatarChange={onAvatarChange}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4, 16px)",
          marginTop: "var(--space-6, 24px)",
        }}
      >
        {/* Display Name */}
        <div>
          <label style={labelStyle}>Display Name *</label>
          <input
            type="text"
            {...register("display_name")}
            style={{
              ...inputStyle,
              borderColor: errors.display_name
                ? "var(--color-error, #dc2626)"
                : "var(--border-default, #d1d5db)",
            }}
          />
          {errors.display_name && (
            <p style={errorStyle}>{errors.display_name.message}</p>
          )}
        </div>

        {/* Email (read-only) */}
        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email"
            value={initialProfile.email}
            disabled
            style={{
              ...inputStyle,
              backgroundColor: "var(--surface-parchment, #f0ebe3)",
              color: "var(--color-text-disabled, #9ca3af)",
              cursor: "not-allowed",
            }}
          />
        </div>

        {/* Bio */}
        <div>
          <label style={labelStyle}>Bio</label>
          <textarea
            {...register("bio")}
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical" as const,
              borderColor: errors.bio
                ? "var(--color-error, #dc2626)"
                : "var(--border-default, #d1d5db)",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "var(--space-1, 4px)",
            }}
          >
            {errors.bio ? (
              <p style={errorStyle}>{errors.bio.message}</p>
            ) : (
              <span />
            )}
            <span
              style={{
                fontFamily: "var(--font-sans, system-ui, sans-serif)",
                fontSize: "0.75rem",
                color:
                  (bioValue?.length ?? 0) > PROFILE_BIO_MAX
                    ? "var(--color-error, #dc2626)"
                    : "var(--color-text-secondary, #6b7280)",
              }}
            >
              {bioValue?.length ?? 0}/{PROFILE_BIO_MAX}
            </span>
          </div>
        </div>

        {/* Department */}
        <div>
          <label style={labelStyle}>Department</label>
          <input
            type="text"
            {...register("department")}
            style={{
              ...inputStyle,
              borderColor: errors.department
                ? "var(--color-error, #dc2626)"
                : "var(--border-default, #d1d5db)",
            }}
          />
          {errors.department && (
            <p style={errorStyle}>{errors.department.message}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label style={labelStyle}>Title</label>
          <input
            type="text"
            {...register("title")}
            style={{
              ...inputStyle,
              borderColor: errors.title
                ? "var(--color-error, #dc2626)"
                : "var(--border-default, #d1d5db)",
            }}
          />
          {errors.title && <p style={errorStyle}>{errors.title.message}</p>}
        </div>

        {/* Server error */}
        {serverError && (
          <p
            style={{
              ...errorStyle,
              padding: "8px 12px",
              backgroundColor: "var(--color-error-bg, #fef2f2)",
              borderRadius: "var(--radius-sm, 6px)",
            }}
          >
            {serverError}
          </p>
        )}

        {/* Success message */}
        {submitStatus === "success" && (
          <p
            style={{
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: "0.8125rem",
              color: "var(--color-success, #16a34a)",
              padding: "8px 12px",
              backgroundColor: "var(--color-success-bg, #f0fdf4)",
              borderRadius: "var(--radius-sm, 6px)",
            }}
          >
            Profile updated successfully
          </p>
        )}

        {/* Save button */}
        <div>
          <button
            type="submit"
            disabled={!isDirty || submitStatus === "saving"}
            style={{
              padding: "10px 24px",
              backgroundColor:
                !isDirty || submitStatus === "saving"
                  ? "var(--color-text-disabled, #9ca3af)"
                  : "var(--color-primary, #1a1a2e)",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--radius-sm, 6px)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor:
                !isDirty || submitStatus === "saving"
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {submitStatus === "saving" ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
