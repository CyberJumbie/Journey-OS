"use client";

import { useState, useRef, useCallback } from "react";
import { AVATAR_MAX_SIZE_BYTES, AVATAR_ALLOWED_TYPES } from "@journey-os/types";
import { createBrowserClient } from "@web/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface AvatarUploaderProps {
  readonly currentAvatarUrl: string | null;
  readonly userId: string;
  readonly onAvatarChange: () => void;
}

type UploadStatus = "idle" | "uploading" | "error";

export function AvatarUploader({
  currentAvatarUrl,
  userId,
  onAvatarChange,
}: AvatarUploaderProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = useCallback(async (): Promise<string | null> => {
    const supabase = createBrowserClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Client-side validation
      if (file.size > AVATAR_MAX_SIZE_BYTES) {
        setError("File must be under 2MB");
        return;
      }
      if (
        !AVATAR_ALLOWED_TYPES.includes(
          file.type as (typeof AVATAR_ALLOWED_TYPES)[number],
        )
      ) {
        setError("Only JPEG, PNG, and WebP files are allowed");
        return;
      }

      setStatus("uploading");
      setError(null);

      try {
        const token = await getToken();
        const formData = new FormData();
        formData.append("avatar", file);

        const res = await fetch(`${API_URL}/api/v1/profile/avatar`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const json = (await res.json()) as {
          data: { avatar_url: string } | null;
          error: { message: string } | null;
        };

        if (json.error) {
          setError(json.error.message);
          setStatus("error");
          return;
        }

        setStatus("idle");
        onAvatarChange();
      } catch {
        setError("Upload failed. Please try again.");
        setStatus("error");
      }

      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [getToken, onAvatarChange],
  );

  const handleRemove = useCallback(async () => {
    setStatus("uploading");
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/profile/avatar`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = (await res.json()) as {
        error: { message: string } | null;
      };

      if (json.error) {
        setError(json.error.message);
        setStatus("error");
        return;
      }

      setStatus("idle");
      onAvatarChange();
    } catch {
      setError("Failed to remove avatar. Please try again.");
      setStatus("error");
    }
  }, [getToken, onAvatarChange]);

  const initials = userId.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-4">
      {/* Avatar preview */}
      <div className="w-16 h-16 rounded-full overflow-hidden bg-parchment flex items-center justify-center shrink-0 border-2 border-border">
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-sans text-xl font-semibold text-text-secondary">
            {initials}
          </span>
        )}
      </div>

      {/* Upload/Remove controls */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <label
            className={`px-3.5 py-1.5 bg-primary text-white rounded-sm font-sans text-[0.8125rem] font-medium ${
              status === "uploading"
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer"
            }`}
          >
            {status === "uploading" ? "Uploading..." : "Upload Photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={status === "uploading"}
              className="hidden"
            />
          </label>

          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={status === "uploading"}
              className={`px-3.5 py-1.5 bg-transparent text-error border border-error rounded-sm font-sans text-[0.8125rem] font-medium ${
                status === "uploading"
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              }`}
            >
              Remove
            </button>
          )}
        </div>

        {error && <p className="font-sans text-xs text-error m-0">{error}</p>}

        <p className="font-sans text-[0.6875rem] text-text-secondary m-0">
          JPEG, PNG, or WebP. Max 2MB.
        </p>
      </div>
    </div>
  );
}
