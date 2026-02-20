"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@web/components/ui/sheet";
import { Separator } from "@web/components/ui/separator";
import type { TemplateDTO } from "@journey-os/types";
import type { MockQuestionPreview } from "@web/lib/types/template-preview.types";

function generateMockPreview(template: TemplateDTO): MockQuestionPreview {
  const diffLabel =
    template.difficulty_distribution.hard > 0.5
      ? "High difficulty"
      : template.difficulty_distribution.easy > 0.5
        ? "Low difficulty"
        : "Moderate difficulty";
  const bloomLabel = `Bloom levels ${[...template.bloom_levels].join(", ")}`;
  const setting =
    template.prompt_overrides.clinical_setting ?? "General clinical";
  const typeLabel = template.question_type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    stem_preview: `A ${diffLabel.toLowerCase()} ${template.question_type.replace(/_/g, " ")} question targeting ${bloomLabel}`,
    vignette_preview:
      template.prompt_overrides.vignette_instructions ??
      "Standard clinical vignette",
    option_count: template.question_type === "single_best_answer" ? 5 : 8,
    bloom_level_label: bloomLabel,
    difficulty_label: diffLabel,
    clinical_setting: setting,
    question_type_label: typeLabel,
  };
}

interface TemplatePreviewProps {
  readonly template: TemplateDTO | null;
  readonly open: boolean;
  readonly onClose: () => void;
}

export function TemplatePreview({
  template,
  open,
  onClose,
}: TemplatePreviewProps) {
  if (!template) return null;

  const preview = generateMockPreview(template);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="font-serif">{template.name}</SheetTitle>
          <SheetDescription>Mock question preview</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-border bg-parchment p-4">
            <h4 className="mb-2 text-sm font-semibold text-foreground">
              Question Outline
            </h4>
            <p className="text-sm text-text-secondary">
              {preview.stem_preview}
            </p>
          </div>

          <Separator />

          <div className="space-y-3 text-sm">
            <DetailRow
              label="Clinical Setting"
              value={preview.clinical_setting}
            />
            <DetailRow
              label="Question Type"
              value={preview.question_type_label}
            />
            <DetailRow label="Bloom Levels" value={preview.bloom_level_label} />
            <DetailRow label="Difficulty" value={preview.difficulty_label} />
            <DetailRow
              label="Options"
              value={`A-${String.fromCharCode(64 + preview.option_count)} (${preview.option_count} choices)`}
            />
            <DetailRow label="Vignette" value={preview.vignette_preview} />
          </div>

          <Separator />

          <p className="text-xs text-text-muted italic">
            This is a preview outline. Actual generation uses the AI pipeline.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="shrink-0 text-text-muted">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}
