"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  NotificationPreferenceType,
  NotificationPreferenceMatrix,
  NotificationPreferencesResponse,
  NotificationChannel,
} from "@journey-os/types";
import { NOTIFICATION_PREFERENCE_TYPES } from "@journey-os/types";
import { Switch } from "@web/components/ui/switch";
import { createBrowserClient } from "@web/lib/supabase";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Human-readable labels for notification preference types. */
const TYPE_LABELS: Record<
  NotificationPreferenceType,
  { label: string; description: string }
> = {
  batch_complete: {
    label: "Batch Complete",
    description: "Generation batch finished processing",
  },
  review_request: {
    label: "Review Request",
    description: "Item submitted for your review",
  },
  review_decision: {
    label: "Review Decision",
    description: "Your submitted item was approved or rejected",
  },
  gap_scan: {
    label: "Gap Scan",
    description: "Coverage gap analysis completed",
  },
  lint_alert: {
    label: "Lint Alert",
    description: "Quality issue detected in content",
  },
  system: {
    label: "System",
    description: "Platform updates and announcements",
  },
};

type Status = "loading" | "idle" | "error";

async function getToken(): Promise<string | null> {
  const supabase = createBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] =
    useState<NotificationPreferenceMatrix | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Fetch preferences on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Session expired. Please sign in again.");
          setStatus("error");
          return;
        }

        const res = await fetch(`${API_URL}/api/v1/settings/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const json = (await res.json()) as {
          data?: NotificationPreferencesResponse;
          error?: { code: string; message: string };
        };

        if (!cancelled) {
          if (json.error) {
            setError(json.error.message);
            setStatus("error");
          } else if (json.data) {
            setPreferences(json.data.preferences);
            setStatus("idle");
          }
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load notification preferences.");
          setStatus("error");
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = useCallback(
    async (type: NotificationPreferenceType, channel: NotificationChannel) => {
      if (!preferences) return;

      const savingKey = `${type}_${channel}`;
      const previousValue = preferences[type][channel];
      const newValue = !previousValue;

      // Optimistic update
      setPreferences((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [type]: { ...prev[type], [channel]: newValue },
        };
      });
      setSaving((prev) => ({ ...prev, [savingKey]: true }));

      try {
        const token = await getToken();
        if (!token) {
          // Rollback
          setPreferences((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [type]: { ...prev[type], [channel]: previousValue },
            };
          });
          setError("Session expired. Please sign in again.");
          return;
        }

        const res = await fetch(`${API_URL}/api/v1/settings/notifications`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preferences: { [type]: { [channel]: newValue } },
          }),
        });

        const json = (await res.json()) as {
          data?: NotificationPreferencesResponse;
          error?: { code: string; message: string };
        };

        if (json.error) {
          // Rollback on error
          setPreferences((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              [type]: { ...prev[type], [channel]: previousValue },
            };
          });
          setError(json.error.message);
        }
      } catch {
        // Rollback on network error
        setPreferences((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [type]: { ...prev[type], [channel]: previousValue },
          };
        });
        setError("Failed to save preference.");
      } finally {
        setSaving((prev) => ({ ...prev, [savingKey]: false }));
      }
    },
    [preferences],
  );

  const handleReset = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError("Session expired. Please sign in again.");
        return;
      }

      const res = await fetch(
        `${API_URL}/api/v1/settings/notifications/reset`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      const json = (await res.json()) as {
        data?: NotificationPreferencesResponse;
        error?: { code: string; message: string };
      };

      if (json.error) {
        setError(json.error.message);
      } else if (json.data) {
        setPreferences(json.data.preferences);
        setError(null);
      }
    } catch {
      setError("Failed to reset preferences.");
    }
  }, []);

  if (status === "loading") {
    return (
      <div className="animate-pulse space-y-4 rounded-lg border border-cream bg-white p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="flex gap-8">
              <div className="h-5 w-8 rounded-full bg-gray-200" />
              <div className="h-5 w-8 rounded-full bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (status === "error" && !preferences) {
    return (
      <div className="rounded-lg border border-cream bg-white p-6 text-text-primary">
        <p className="text-[var(--color-error,#dc2626)]">
          {error ?? "Something went wrong."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-cream bg-white p-6">
      {/* Error toast */}
      {error && (
        <div className="mb-4 rounded-md bg-[var(--color-error-bg,#fef2f2)] px-4 py-2 text-sm text-[var(--color-error,#dc2626)]">
          {error}
          <button
            className="ml-2 underline"
            onClick={() => setError(null)}
            type="button"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cream">
              <th className="pb-3 text-left font-sans text-sm font-semibold text-text-primary">
                Notification Type
              </th>
              <th className="w-24 pb-3 text-center font-sans text-sm font-semibold text-text-primary">
                In-App
              </th>
              <th className="w-24 pb-3 text-center font-sans text-sm font-semibold text-text-primary">
                Email
              </th>
            </tr>
          </thead>
          <tbody>
            {NOTIFICATION_PREFERENCE_TYPES.map((type) => {
              const meta = TYPE_LABELS[type];
              const prefs = preferences?.[type];
              return (
                <tr key={type} className="border-b border-cream">
                  <td className="py-4">
                    <div className="font-sans text-sm font-medium text-text-primary">
                      {meta.label}
                    </div>
                    <div className="mt-0.5 text-xs text-text-secondary">
                      {meta.description}
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    <Switch
                      checked={prefs?.in_app ?? true}
                      onCheckedChange={() => handleToggle(type, "in_app")}
                      disabled={saving[`${type}_in_app`]}
                      className="data-[state=checked]:bg-[var(--color-navy-deep,#1a1a2e)]"
                    />
                  </td>
                  <td className="py-4 text-center">
                    <Switch
                      checked={prefs?.email ?? false}
                      onCheckedChange={() => handleToggle(type, "email")}
                      disabled={saving[`${type}_email`]}
                      className="data-[state=checked]:bg-[var(--color-navy-deep,#1a1a2e)]"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile stacked cards */}
      <div className="space-y-4 md:hidden">
        {NOTIFICATION_PREFERENCE_TYPES.map((type) => {
          const meta = TYPE_LABELS[type];
          const prefs = preferences?.[type];
          return (
            <div key={type} className="rounded-md border border-cream p-4">
              <div className="mb-2 font-sans text-sm font-medium text-text-primary">
                {meta.label}
              </div>
              <div className="mb-3 text-xs text-text-secondary">
                {meta.description}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">In-App</span>
                  <Switch
                    checked={prefs?.in_app ?? true}
                    onCheckedChange={() => handleToggle(type, "in_app")}
                    disabled={saving[`${type}_in_app`]}
                    className="data-[state=checked]:bg-[var(--color-navy-deep,#1a1a2e)]"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">Email</span>
                  <Switch
                    checked={prefs?.email ?? false}
                    onCheckedChange={() => handleToggle(type, "email")}
                    disabled={saving[`${type}_email`]}
                    className="data-[state=checked]:bg-[var(--color-navy-deep,#1a1a2e)]"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset button */}
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md px-4 py-2 font-sans text-sm text-text-muted transition-colors hover:bg-gray-100"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}
