"use client";

import { useProfile } from "@web/hooks/use-profile";
import { ProfileForm } from "@web/components/settings/profile-form";

// Next.js App Router requires default export for pages
export default function ProfilePage() {
  const { profile, status, error, refetch, setProfile } = useProfile();

  if (status === "loading") {
    return (
      <div style={{ padding: "var(--space-6, 24px)" }}>
        <div
          style={{
            height: 24,
            width: 200,
            backgroundColor: "var(--surface-parchment, #f0ebe3)",
            borderRadius: "var(--radius-sm, 6px)",
            marginBottom: "var(--space-4, 16px)",
          }}
        />
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              height: 48,
              backgroundColor: "var(--surface-parchment, #f0ebe3)",
              borderRadius: "var(--radius-sm, 6px)",
              marginBottom: "var(--space-3, 12px)",
            }}
          />
        ))}
      </div>
    );
  }

  if (status === "error" || !profile) {
    return (
      <div style={{ padding: "var(--space-6, 24px)" }}>
        <p
          style={{
            color: "var(--color-error, #dc2626)",
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
          }}
        >
          {error ?? "Failed to load profile"}
        </p>
        <button
          onClick={refetch}
          style={{
            marginTop: "var(--space-3, 12px)",
            padding: "8px 16px",
            backgroundColor: "var(--color-primary, #1a1a2e)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-sm, 6px)",
            cursor: "pointer",
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            fontSize: "0.875rem",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-serif, Georgia, serif)",
          fontSize: "1.5rem",
          fontWeight: 600,
          color: "var(--color-text-primary, #1a1a2e)",
          marginBottom: "var(--space-6, 24px)",
        }}
      >
        Profile
      </h1>
      <ProfileForm
        initialProfile={profile}
        onUpdate={setProfile}
        onAvatarChange={refetch}
      />
    </div>
  );
}
