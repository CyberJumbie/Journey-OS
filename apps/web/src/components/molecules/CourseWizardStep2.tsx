"use client";

import { useState, useCallback, type KeyboardEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { Checkbox } from "@web/components/ui/checkbox";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";

interface CourseWizardStep2Props {
  readonly creditHours: number;
  readonly onCreditHoursChange: (v: number) => void;
  readonly maxEnrollment: number;
  readonly onMaxEnrollmentChange: (v: number) => void;
  readonly isRequired: boolean;
  readonly onIsRequiredChange: (v: boolean) => void;
  readonly prerequisites: readonly string[];
  readonly onPrerequisitesChange: (v: string[]) => void;
  readonly learningObjectives: readonly string[];
  readonly onLearningObjectivesChange: (v: string[]) => void;
  readonly tags: readonly string[];
  readonly onTagsChange: (v: string[]) => void;
}

/**
 * Shared hook for comma-separated tag input fields.
 * Splits input on blur or Enter, deduplicates, and merges with existing items.
 */
function useTagInput(
  existing: readonly string[],
  onChange: (v: string[]) => void,
) {
  const [draft, setDraft] = useState("");

  const commit = useCallback(() => {
    const newItems = draft
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (newItems.length === 0) return;

    const merged = Array.from(new Set([...existing, ...newItems]));
    onChange(merged);
    setDraft("");
  }, [draft, existing, onChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
    },
    [commit],
  );

  const remove = useCallback(
    (item: string) => {
      onChange([...existing].filter((t) => t !== item));
    },
    [existing, onChange],
  );

  return { draft, setDraft, commit, handleKeyDown, remove };
}

export function CourseWizardStep2({
  creditHours,
  onCreditHoursChange,
  maxEnrollment,
  onMaxEnrollmentChange,
  isRequired,
  onIsRequiredChange,
  prerequisites,
  onPrerequisitesChange,
  learningObjectives,
  onLearningObjectivesChange,
  tags,
  onTagsChange,
}: CourseWizardStep2Props) {
  const prereqTag = useTagInput(prerequisites, onPrerequisitesChange);
  const tagsTag = useTagInput(tags, onTagsChange);

  const addObjective = () => {
    onLearningObjectivesChange([...learningObjectives, ""]);
  };

  const removeObjective = (index: number) => {
    if (learningObjectives.length <= 1) return;
    onLearningObjectivesChange(
      [...learningObjectives].filter((_, i) => i !== index),
    );
  };

  const updateObjective = (index: number, value: string) => {
    const updated = [...learningObjectives];
    updated[index] = value;
    onLearningObjectivesChange(updated);
  };

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Credit Hours */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="credit-hours">Credit Hours</Label>
        <Input
          id="credit-hours"
          type="number"
          min={1}
          max={20}
          value={creditHours}
          onChange={(e) => onCreditHoursChange(Number(e.target.value))}
        />
      </div>

      {/* Max Enrollment */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="max-enrollment">Max Enrollment</Label>
        <Input
          id="max-enrollment"
          type="number"
          min={1}
          value={maxEnrollment}
          onChange={(e) => onMaxEnrollmentChange(Number(e.target.value))}
        />
      </div>

      {/* Is Required */}
      <div className="flex items-center gap-2 md:col-span-2">
        <Checkbox
          id="is-required"
          checked={isRequired}
          onCheckedChange={(checked) => onIsRequiredChange(checked === true)}
        />
        <Label htmlFor="is-required" className="cursor-pointer">
          This course is required
        </Label>
      </div>

      {/* Prerequisites */}
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label htmlFor="prerequisites">Prerequisites</Label>
        <Input
          id="prerequisites"
          value={prereqTag.draft}
          onChange={(e) => prereqTag.setDraft(e.target.value)}
          onBlur={prereqTag.commit}
          onKeyDown={prereqTag.handleKeyDown}
          placeholder="Type prerequisite codes separated by commas, press Enter"
        />
        {prerequisites.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {prerequisites.map((item) => (
              <Badge key={item} variant="secondary" className="gap-1">
                {item}
                <button
                  type="button"
                  onClick={() => prereqTag.remove(item)}
                  className="ml-1 rounded-full hover:text-destructive"
                  aria-label={`Remove ${item}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Learning Objectives */}
      <div className="flex flex-col gap-2 md:col-span-2">
        <div className="flex items-center justify-between">
          <Label>
            Learning Objectives <span className="text-destructive">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addObjective}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {learningObjectives.map((objective, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={objective}
                onChange={(e) => updateObjective(index, e.target.value)}
                placeholder={`Objective ${index + 1}`}
                className="flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeObjective(index)}
                disabled={learningObjectives.length <= 1}
                aria-label={`Remove objective ${index + 1}`}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label htmlFor="course-tags">Tags</Label>
        <Input
          id="course-tags"
          value={tagsTag.draft}
          onChange={(e) => tagsTag.setDraft(e.target.value)}
          onBlur={tagsTag.commit}
          onKeyDown={tagsTag.handleKeyDown}
          placeholder="Type tags separated by commas, press Enter"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((item) => (
              <Badge key={item} variant="secondary" className="gap-1">
                {item}
                <button
                  type="button"
                  onClick={() => tagsTag.remove(item)}
                  className="ml-1 rounded-full hover:text-destructive"
                  aria-label={`Remove ${item}`}
                >
                  <Trash2 className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
