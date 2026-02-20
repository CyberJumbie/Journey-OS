"use client";

import { useProfile } from "@web/hooks/use-profile";
import { ProfileForm } from "@web/components/settings/profile-form";

// Next.js App Router requires default export for pages
export default function ProfilePage() {
  const { profile, status, error, refetch, setProfile } = useProfile();

  if (status === "loading") {
    return (
      <div className="p-6">
        <div className="h-6 w-[200px] bg-parchment rounded-sm mb-4" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-parchment rounded-sm mb-3" />
        ))}
      </div>
    );
  }

  if (status === "error" || !profile) {
    return (
      <div className="p-6">
        <p className="text-error font-sans">
          {error ?? "Failed to load profile"}
        </p>
        <button
          onClick={refetch}
          className="mt-3 px-4 py-2 bg-primary text-white border-none rounded-sm cursor-pointer font-sans text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold text-text-primary mb-6">
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
