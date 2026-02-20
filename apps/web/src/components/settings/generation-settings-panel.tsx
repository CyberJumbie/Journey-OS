"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AutomationLevel,
  GenerationPreferences,
  GenerationPreferencesResponse,
  UpdateGenerationPreferencesRequest,
  DifficultyDistribution,
} from "@journey-os/types";
import { AUTOMATION_LEVELS, AUTOMATION_STRICTNESS } from "@journey-os/types";
import { Switch } from "@web/components/ui/switch";
import { Label } from "@web/components/ui/label";
import { Checkbox } from "@web/components/ui/checkbox";
import { Slider } from "@web/components/ui/slider";
import { Button } from "@web/components/ui/button";
import { Skeleton } from "@web/components/ui/skeleton";

const LEVEL_LABELS: Record<
  AutomationLevel,
  { label: string; description: string }
> = {
  full_auto: {
    label: "Let AI handle it",
    description: "Pipeline runs end-to-end without pausing",
  },
  checkpoints: {
    label: "Pause at checkpoints",
    description: "Pipeline pauses at key milestones for review",
  },
  manual: {
    label: "Review everything",
    description: "Pipeline pauses at every step",
  },
};

const BLOOM_LEVELS = [
  { value: 1, label: "Remember" },
  { value: 2, label: "Understand" },
  { value: 3, label: "Apply" },
  { value: 4, label: "Analyze" },
  { value: 5, label: "Evaluate" },
  { value: 6, label: "Create" },
];

interface GenerationSettingsPanelProps {
  readonly apiBase?: string;
}

export function GenerationSettingsPanel({
  apiBase = "/api/v1",
}: GenerationSettingsPanelProps) {
  const [preferences, setPreferences] = useState<GenerationPreferences | null>(
    null,
  );
  const [institutionMinimum, setInstitutionMinimum] =
    useState<AutomationLevel | null>(null);
  const [effectiveLevel, setEffectiveLevel] = useState<AutomationLevel | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/settings/generation`, {
        credentials: "include",
      });
      const json = (await res.json()) as {
        data?: GenerationPreferencesResponse;
        error?: { code: string; message: string };
      };
      if (!res.ok || json.error) {
        setError(json.error?.message ?? "Failed to load preferences");
        return;
      }
      if (json.data) {
        setPreferences(json.data.preferences);
        setInstitutionMinimum(json.data.institution_minimum);
        setEffectiveLevel(json.data.effective_automation_level);
      }
    } catch {
      setError("Failed to load preferences");
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const load = async () => {
      await fetchPreferences();
    };
    load();
  }, [fetchPreferences]);

  const handleSave = async () => {
    if (!preferences || !dirty) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      const body: UpdateGenerationPreferencesRequest = {
        automation_level: preferences.automation_level,
        pause_before_critic: preferences.pause_before_critic,
        difficulty_distribution: preferences.difficulty_distribution,
        bloom_focus: preferences.bloom_focus,
      };
      const res = await fetch(`${apiBase}/settings/generation`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        data?: GenerationPreferencesResponse;
        error?: { code: string; message: string };
      };
      if (!res.ok || json.error) {
        setError(json.error?.message ?? "Failed to save preferences");
        return;
      }
      if (json.data) {
        setPreferences(json.data.preferences);
        setInstitutionMinimum(json.data.institution_minimum);
        setEffectiveLevel(json.data.effective_automation_level);
      }
      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof GenerationPreferences>(
    key: K,
    value: GenerationPreferences[K],
  ) => {
    setPreferences((prev) => (prev ? { ...prev, [key]: value } : prev));
    setDirty(true);
    setSaveSuccess(false);
  };

  const isLevelDisabled = (level: AutomationLevel): boolean => {
    if (!institutionMinimum) return false;
    return (
      AUTOMATION_STRICTNESS[level] < AUTOMATION_STRICTNESS[institutionMinimum]
    );
  };

  const handleDifficultyChange = (
    key: keyof DifficultyDistribution,
    newValue: number,
  ) => {
    if (!preferences) return;
    const current = preferences.difficulty_distribution;
    const otherKeys = (["easy", "medium", "hard"] as const).filter(
      (k) => k !== key,
    );
    const otherTotal = otherKeys.reduce((sum, k) => sum + current[k], 0);
    const remaining = 100 - newValue;

    let updated: DifficultyDistribution;
    if (otherTotal === 0) {
      const half = Math.floor(remaining / 2);
      updated = {
        ...current,
        [key]: newValue,
        [otherKeys[0]!]: half,
        [otherKeys[1]!]: remaining - half,
      } as DifficultyDistribution;
    } else {
      const ratio0 = current[otherKeys[0]!] / otherTotal;
      const val0 = Math.round(remaining * ratio0);
      const val1 = remaining - val0;
      updated = {
        ...current,
        [key]: newValue,
        [otherKeys[0]!]: val0,
        [otherKeys[1]!]: val1,
      } as DifficultyDistribution;
    }
    updatePreference("difficulty_distribution", updated);
  };

  const handleBloomToggle = (level: number, checked: boolean) => {
    if (!preferences) return;
    const current = [...preferences.bloom_focus];
    if (checked) {
      if (!current.includes(level)) {
        current.push(level);
        current.sort((a, b) => a - b);
      }
    } else {
      const idx = current.indexOf(level);
      if (idx !== -1 && current.length > 1) {
        current.splice(idx, 1);
      }
    }
    updatePreference("bloom_focus", current);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="space-y-3">
        <p
          style={{
            color: "var(--color-error, #dc2626)",
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
          }}
        >
          {error}
        </p>
        <Button onClick={() => void fetchPreferences()} variant="default">
          Retry
        </Button>
      </div>
    );
  }

  if (!preferences) return null;

  return (
    <div className="space-y-8">
      {/* Automation Level Section */}
      <section>
        <h2
          style={{
            fontFamily: "var(--font-serif, Georgia, serif)",
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--color-text-primary, #1a1a2e)",
            marginBottom: "var(--space-3, 12px)",
          }}
        >
          Automation Level
        </h2>
        {effectiveLevel && institutionMinimum && (
          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-text-muted, #9ca3af)",
              marginBottom: "var(--space-3, 12px)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
            }}
          >
            Effective: <strong>{LEVEL_LABELS[effectiveLevel].label}</strong>
          </p>
        )}
        <div className="space-y-2">
          {AUTOMATION_LEVELS.map((level) => {
            const disabled = isLevelDisabled(level);
            const selected = preferences.automation_level === level;
            return (
              <label
                key={level}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "var(--space-3, 12px)",
                  padding: "var(--space-3, 12px)",
                  borderRadius: "var(--radius-sm, 6px)",
                  border: selected
                    ? "2px solid var(--color-navy-deep, #1a1a2e)"
                    : "2px solid var(--color-cream, #e8e0d4)",
                  backgroundColor: selected
                    ? "var(--surface-white, #ffffff)"
                    : "transparent",
                  opacity: disabled ? 0.5 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                <input
                  type="radio"
                  name="automation_level"
                  value={level}
                  checked={selected}
                  disabled={disabled}
                  onChange={() => updatePreference("automation_level", level)}
                  style={{
                    accentColor: "var(--color-navy-deep, #1a1a2e)",
                    marginTop: 2,
                  }}
                />
                <div>
                  <span
                    style={{
                      fontFamily: "var(--font-sans, system-ui, sans-serif)",
                      fontSize: "0.875rem",
                      fontWeight: 500,
                      color: disabled
                        ? "var(--color-text-muted, #9ca3af)"
                        : "var(--color-text-primary, #1a1a2e)",
                    }}
                  >
                    {LEVEL_LABELS[level].label}
                    {disabled && (
                      <span
                        title="Your institution requires at least this level"
                        style={{
                          marginLeft: "var(--space-2, 8px)",
                          color: "var(--color-text-muted, #9ca3af)",
                        }}
                      >
                        &#128274;
                      </span>
                    )}
                  </span>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--color-text-secondary, #6b7280)",
                      fontFamily: "var(--font-sans, system-ui, sans-serif)",
                      marginTop: 2,
                    }}
                  >
                    {LEVEL_LABELS[level].description}
                  </p>
                  {disabled && institutionMinimum && (
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--color-text-muted, #9ca3af)",
                        fontFamily: "var(--font-sans, system-ui, sans-serif)",
                        marginTop: 4,
                      }}
                    >
                      Your institution requires at least &quot;
                      {LEVEL_LABELS[institutionMinimum].label}&quot;
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </section>

      {/* Divider */}
      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--color-cream, #e8e0d4)",
        }}
      />

      {/* Interrupt Preferences Section */}
      <section>
        <h2
          style={{
            fontFamily: "var(--font-serif, Georgia, serif)",
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--color-text-primary, #1a1a2e)",
            marginBottom: "var(--space-3, 12px)",
          }}
        >
          Interrupt Preferences
        </h2>
        <div className="flex items-center justify-between">
          <Label
            htmlFor="pause-critic"
            style={{
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: "0.875rem",
              color: "var(--color-text-primary, #1a1a2e)",
              cursor: "pointer",
            }}
          >
            Pause before critic scoring
          </Label>
          <Switch
            id="pause-critic"
            checked={preferences.pause_before_critic}
            onCheckedChange={(checked: boolean) =>
              updatePreference("pause_before_critic", checked)
            }
          />
        </div>
        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--color-text-secondary, #6b7280)",
            fontFamily: "var(--font-sans, system-ui, sans-serif)",
            marginTop: "var(--space-2, 8px)",
          }}
        >
          Inserts an extra review checkpoint before the critic scoring step,
          regardless of automation level.
        </p>
      </section>

      {/* Divider */}
      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--color-cream, #e8e0d4)",
        }}
      />

      {/* Default Generation Parameters Section */}
      <section>
        <h2
          style={{
            fontFamily: "var(--font-serif, Georgia, serif)",
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--color-text-primary, #1a1a2e)",
            marginBottom: "var(--space-3, 12px)",
          }}
        >
          Default Generation Parameters
        </h2>

        {/* Difficulty Distribution */}
        <div
          className="space-y-4"
          style={{ marginBottom: "var(--space-6, 24px)" }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--color-text-primary, #1a1a2e)",
            }}
          >
            Difficulty Distribution
          </p>
          {(["easy", "medium", "hard"] as const).map((key) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label
                  style={{
                    fontFamily: "var(--font-sans, system-ui, sans-serif)",
                    fontSize: "0.8125rem",
                    color: "var(--color-text-secondary, #6b7280)",
                    textTransform: "capitalize",
                  }}
                >
                  {key}
                </Label>
                <span
                  style={{
                    fontFamily: "var(--font-sans, system-ui, sans-serif)",
                    fontSize: "0.8125rem",
                    color: "var(--color-text-secondary, #6b7280)",
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {preferences.difficulty_distribution[key]}%
                </span>
              </div>
              <Slider
                value={[preferences.difficulty_distribution[key]]}
                min={0}
                max={100}
                step={5}
                onValueChange={([val]: number[]) => {
                  if (val !== undefined) handleDifficultyChange(key, val);
                }}
              />
            </div>
          ))}
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted, #9ca3af)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
            }}
          >
            Total:{" "}
            {preferences.difficulty_distribution.easy +
              preferences.difficulty_distribution.medium +
              preferences.difficulty_distribution.hard}
            % (must equal 100%)
          </p>
        </div>

        {/* Bloom Focus */}
        <div className="space-y-3">
          <p
            style={{
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--color-text-primary, #1a1a2e)",
            }}
          >
            Bloom&apos;s Taxonomy Focus
          </p>
          <div className="grid grid-cols-2 gap-2">
            {BLOOM_LEVELS.map(({ value, label }) => {
              const checked = preferences.bloom_focus.includes(value);
              return (
                <div key={value} className="flex items-center gap-2">
                  <Checkbox
                    id={`bloom-${value}`}
                    checked={checked}
                    onCheckedChange={(c: boolean | "indeterminate") =>
                      handleBloomToggle(value, c === true)
                    }
                    disabled={checked && preferences.bloom_focus.length <= 1}
                  />
                  <Label
                    htmlFor={`bloom-${value}`}
                    style={{
                      fontFamily: "var(--font-sans, system-ui, sans-serif)",
                      fontSize: "0.8125rem",
                      color: "var(--color-text-primary, #1a1a2e)",
                      cursor: "pointer",
                    }}
                  >
                    {value}. {label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--color-cream, #e8e0d4)",
        }}
      />

      {/* Save Button + Error/Success */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className={`text-white ${dirty ? "bg-navy-deep" : "bg-text-muted"}`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
        {saveSuccess && (
          <span
            style={{
              fontSize: "0.875rem",
              color: "var(--color-success, #16a34a)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
            }}
          >
            Settings saved
          </span>
        )}
        {error && preferences && (
          <span
            style={{
              fontSize: "0.875rem",
              color: "var(--color-error, #dc2626)",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
            }}
          >
            {error}
          </span>
        )}
      </div>
    </div>
  );
}
