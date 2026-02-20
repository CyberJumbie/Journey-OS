"use client";

import { useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@web/components/ui/dialog";
import { Button } from "@web/components/ui/button";
import { Input } from "@web/components/ui/input";
import { Textarea } from "@web/components/ui/textarea";
import { Label } from "@web/components/ui/label";
import { Checkbox } from "@web/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";
import { DifficultyDistributionInput } from "@web/components/template/DifficultyDistributionInput";
import {
  templateFormSchema,
  type TemplateFormValues,
} from "@web/lib/validations/template.validation";
import type {
  TemplateDTO,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from "@journey-os/types";

const BLOOM_LEVELS = [
  { value: 1, label: "1 - Remember" },
  { value: 2, label: "2 - Understand" },
  { value: 3, label: "3 - Apply" },
  { value: 4, label: "4 - Analyze" },
  { value: 5, label: "5 - Evaluate" },
  { value: 6, label: "6 - Create" },
];

interface TemplateFormProps {
  readonly open: boolean;
  readonly template?: TemplateDTO;
  readonly loading: boolean;
  readonly onSubmit: (
    data: CreateTemplateRequest | UpdateTemplateRequest,
  ) => void;
  readonly onCancel: () => void;
}

export function TemplateForm({
  open,
  template,
  loading,
  onSubmit,
  onCancel,
}: TemplateFormProps) {
  const isEdit = !!template;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<TemplateFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- zod@4.3 / @hookform/resolvers@5.2 type mismatch; runtime works correctly
    resolver: zodResolver(templateFormSchema as any),
    defaultValues: {
      name: template?.name ?? "",
      description: template?.description ?? "",
      question_type: template?.question_type ?? "single_best_answer",
      difficulty_distribution: template?.difficulty_distribution ?? {
        easy: 0.3,
        medium: 0.5,
        hard: 0.2,
      },
      bloom_levels: template?.bloom_levels
        ? [...template.bloom_levels]
        : [3, 4],
      sharing_level: template?.sharing_level ?? "private",
      scope_config: {
        course_id: template?.scope_config.course_id ?? undefined,
        usmle_systems: template?.scope_config.usmle_systems
          ? [...template.scope_config.usmle_systems]
          : undefined,
      },
      prompt_overrides: {
        vignette_instructions:
          template?.prompt_overrides.vignette_instructions ?? undefined,
        stem_instructions:
          template?.prompt_overrides.stem_instructions ?? undefined,
        clinical_setting:
          template?.prompt_overrides.clinical_setting ?? undefined,
      },
      metadata: {
        category: template?.metadata.category ?? undefined,
        tags: template?.metadata.tags ? [...template.metadata.tags] : undefined,
      },
    },
  });

  const onFormSubmit = useCallback(
    (data: TemplateFormValues) => {
      onSubmit(data as CreateTemplateRequest);
    },
    [onSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">
            {isEdit ? "Edit Template" : "Create Template"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="e.g. Board Prep - Cardiovascular"
            />
            {errors.name && (
              <p className="text-xs text-error">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Brief description of this template's purpose"
              rows={3}
            />
            {errors.description && (
              <p className="text-xs text-error">{errors.description.message}</p>
            )}
          </div>

          {/* Question Type */}
          <div className="space-y-2">
            <Label>Question Type *</Label>
            <Controller
              name="question_type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_best_answer">
                      Single Best Answer
                    </SelectItem>
                    <SelectItem value="extended_matching">
                      Extended Matching
                    </SelectItem>
                    <SelectItem value="sequential_item_set">
                      Sequential Item Set
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Difficulty Distribution */}
          <Controller
            name="difficulty_distribution"
            control={control}
            render={({ field, fieldState }) => (
              <DifficultyDistributionInput
                value={field.value}
                onChange={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          {/* Bloom Levels */}
          <div className="space-y-2">
            <Label>Bloom Levels *</Label>
            <Controller
              name="bloom_levels"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {BLOOM_LEVELS.map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={field.value.includes(value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            field.onChange([...field.value, value]);
                          } else {
                            field.onChange(
                              field.value.filter((v) => v !== value),
                            );
                          }
                        }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.bloom_levels && (
              <p className="text-xs text-error">
                {errors.bloom_levels.message}
              </p>
            )}
          </div>

          {/* Sharing Level */}
          <div className="space-y-2">
            <Label>Sharing Level</Label>
            <Controller
              name="sharing_level"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="shared_course">
                      Shared with Course
                    </SelectItem>
                    <SelectItem value="shared_institution">
                      Shared with Institution
                    </SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Prompt Overrides (collapsible section) */}
          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Prompt Overrides
            </summary>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinical_setting">Clinical Setting</Label>
                <Input
                  id="clinical_setting"
                  {...register("prompt_overrides.clinical_setting")}
                  placeholder="e.g. Emergency department"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vignette_instructions">
                  Vignette Instructions
                </Label>
                <Textarea
                  id="vignette_instructions"
                  {...register("prompt_overrides.vignette_instructions")}
                  placeholder="Custom instructions for vignette generation"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stem_instructions">Stem Instructions</Label>
                <Textarea
                  id="stem_instructions"
                  {...register("prompt_overrides.stem_instructions")}
                  placeholder="Custom instructions for question stem"
                  rows={2}
                />
              </div>
            </div>
          </details>

          {/* Metadata (collapsible section) */}
          <details className="rounded-lg border border-border p-4">
            <summary className="cursor-pointer text-sm font-medium text-foreground">
              Metadata
            </summary>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  {...register("metadata.category")}
                  placeholder="e.g. board_prep, formative, review"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Controller
                  name="metadata.tags"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="tags"
                      value={(field.value ?? []).join(", ")}
                      onChange={(e) => {
                        const tags = e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean);
                        field.onChange(tags.length > 0 ? tags : undefined);
                      }}
                      placeholder="e.g. cardiovascular, step1, high-yield"
                    />
                  )}
                />
              </div>
            </div>
          </details>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
