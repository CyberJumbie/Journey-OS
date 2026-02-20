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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4, 16px)",
      }}
    >
      {/* Avatar preview */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--radius-full, 9999px)",
          overflow: "hidden",
          backgroundColor: "var(--surface-parchment, #f0ebe3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "2px solid var(--border-default, #d1d5db)",
        }}
      >
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="Avatar"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span
            style={{
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "var(--color-text-secondary, #6b7280)",
            }}
          >
            {initials}
          </span>
        )}
      </div>

      {/* Upload/Remove controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2, 8px)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-2, 8px)" }}>
          <label
            style={{
              padding: "6px 14px",
              backgroundColor: "var(--color-primary, #1a1a2e)",
              color: "#ffffff",
              borderRadius: "var(--radius-sm, 6px)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: "0.8125rem",
              fontWeight: 500,
              cursor: status === "uploading" ? "not-allowed" : "pointer",
              opacity: status === "uploading" ? 0.6 : 1,
            }}
          >
            {status === "uploading" ? "Uploading..." : "Upload Photo"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              disabled={status === "uploading"}
              style={{ display: "none" }}
            />
          </label>

          {currentAvatarUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={status === "uploading"}
              style={{
                padding: "6px 14px",
                backgroundColor: "transparent",
                color: "var(--color-error, #dc2626)",
                border: "1px solid var(--color-error, #dc2626)",
                borderRadius: "var(--radius-sm, 6px)",
                fontFamily: "var(--font-sans, system-ui, sans-serif)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: status === "uploading" ? "not-allowed" : "pointer",
                opacity: status === "uploading" ? 0.6 : 1,
              }}
            >
              Remove
            </button>
          )}
        </div>

        {error && (
          <p
            style={{
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: "0.75rem",
              color: "var(--color-error, #dc2626)",
              margin: 0,
            }}
          >
            {error}
          </p>
        )}

        <p
          style={{
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            fontSize: "0.6875rem",
            color: "var(--color-text-secondary, #6b7280)",
            margin: 0,
          }}
        >
          JPEG, PNG, or WebP. Max 2MB.
        </p>
      </div>
    </div>
  );
}
