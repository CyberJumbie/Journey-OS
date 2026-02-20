"use client";

import { useCallback } from "react";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";

interface DifficultyDistributionInputProps {
  readonly value: { easy: number; medium: number; hard: number };
  readonly onChange: (value: {
    easy: number;
    medium: number;
    hard: number;
  }) => void;
  readonly error?: string;
}

const LABELS: { key: "easy" | "medium" | "hard"; label: string }[] = [
  { key: "easy", label: "Easy" },
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Hard" },
];

export function DifficultyDistributionInput({
  value,
  onChange,
  error,
}: DifficultyDistributionInputProps) {
  const sum = value.easy + value.medium + value.hard;
  const isValid = Math.abs(sum - 1.0) < 0.001;

  const handleChange = useCallback(
    (key: "easy" | "medium" | "hard", raw: string) => {
      const parsed = parseFloat(raw);
      if (Number.isNaN(parsed)) return;
      const clamped = Math.round(Math.max(0, Math.min(1, parsed)) * 100) / 100;
      onChange({ ...value, [key]: clamped });
    },
    [value, onChange],
  );

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Difficulty Distribution</Label>
      <div className="grid grid-cols-3 gap-3">
        {LABELS.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-text-secondary">{label}</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={value[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className={!isValid ? "border-error" : ""}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className={isValid ? "text-green-dark" : "text-error"}>
          Sum: {Math.round(sum * 100) / 100}
        </span>
        {!isValid && <span className="text-error">Must equal 1.0</span>}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
