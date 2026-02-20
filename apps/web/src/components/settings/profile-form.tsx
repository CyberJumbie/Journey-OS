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
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod@4.3 / @hookform/resolvers@5.2 type mismatch; runtime detection works correctly */
    resolver: zodResolver(profileFormSchema as any),
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

  return (
    <div className="bg-white rounded-md p-6">
      {/* Avatar section */}
      <AvatarUploader
        currentAvatarUrl={initialProfile.avatar_url}
        userId={initialProfile.id}
        onAvatarChange={onAvatarChange}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 mt-6"
      >
        {/* Display Name */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider font-medium text-text-secondary mb-1">
            Display Name *
          </label>
          <input
            type="text"
            {...register("display_name")}
            className={`w-full px-3 py-2.5 border rounded-sm font-sans text-sm text-text-primary outline-none ${
              errors.display_name ? "border-error" : "border-border"
            }`}
          />
          {errors.display_name && (
            <p className="font-sans text-xs text-error mt-1">
              {errors.display_name.message}
            </p>
          )}
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider font-medium text-text-secondary mb-1">
            Email
          </label>
          <input
            type="email"
            value={initialProfile.email}
            disabled
            className="w-full px-3 py-2.5 border border-border rounded-sm font-sans text-sm text-text-muted bg-parchment cursor-not-allowed outline-none"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider font-medium text-text-secondary mb-1">
            Bio
          </label>
          <textarea
            {...register("bio")}
            rows={3}
            className={`w-full px-3 py-2.5 border rounded-sm font-sans text-sm text-text-primary outline-none resize-y ${
              errors.bio ? "border-error" : "border-border"
            }`}
          />
          <div className="flex justify-between mt-1">
            {errors.bio ? (
              <p className="font-sans text-xs text-error">
                {errors.bio.message}
              </p>
            ) : (
              <span />
            )}
            <span
              className={`font-sans text-xs ${
                (bioValue?.length ?? 0) > PROFILE_BIO_MAX
                  ? "text-error"
                  : "text-text-secondary"
              }`}
            >
              {bioValue?.length ?? 0}/{PROFILE_BIO_MAX}
            </span>
          </div>
        </div>

        {/* Department */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider font-medium text-text-secondary mb-1">
            Department
          </label>
          <input
            type="text"
            {...register("department")}
            className={`w-full px-3 py-2.5 border rounded-sm font-sans text-sm text-text-primary outline-none ${
              errors.department ? "border-error" : "border-border"
            }`}
          />
          {errors.department && (
            <p className="font-sans text-xs text-error mt-1">
              {errors.department.message}
            </p>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wider font-medium text-text-secondary mb-1">
            Title
          </label>
          <input
            type="text"
            {...register("title")}
            className={`w-full px-3 py-2.5 border rounded-sm font-sans text-sm text-text-primary outline-none ${
              errors.title ? "border-error" : "border-border"
            }`}
          />
          {errors.title && (
            <p className="font-sans text-xs text-error mt-1">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <p className="font-sans text-xs text-error px-3 py-2 bg-[var(--color-error)]/5 rounded-sm">
            {serverError}
          </p>
        )}

        {/* Success message */}
        {submitStatus === "success" && (
          <p className="font-sans text-[0.8125rem] text-green px-3 py-2 bg-green/5 rounded-sm">
            Profile updated successfully
          </p>
        )}

        {/* Save button */}
        <div>
          <button
            type="submit"
            disabled={!isDirty || submitStatus === "saving"}
            className={`px-6 py-2.5 text-white border-none rounded-sm font-sans text-sm font-medium ${
              !isDirty || submitStatus === "saving"
                ? "bg-text-muted cursor-not-allowed"
                : "bg-primary cursor-pointer"
            }`}
          >
            {submitStatus === "saving" ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
