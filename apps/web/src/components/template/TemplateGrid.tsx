"use client";

import { Plus } from "lucide-react";
import { Button } from "@web/components/ui/button";
import { Skeleton } from "@web/components/ui/skeleton";
import { TemplateCard } from "@web/components/template/TemplateCard";
import type { TemplateDTO } from "@journey-os/types";

interface TemplateGridProps {
  readonly templates: readonly TemplateDTO[];
  readonly loading: boolean;
  readonly hasFilters: boolean;
  readonly onEdit: (template: TemplateDTO) => void;
  readonly onDuplicate: (template: TemplateDTO) => void;
  readonly onPreview: (template: TemplateDTO) => void;
  readonly onDelete: (template: TemplateDTO) => void;
  readonly onClearFilters: () => void;
  readonly onCreateFirst: () => void;
}

export function TemplateGrid({
  templates,
  loading,
  hasFilters,
  onEdit,
  onDuplicate,
  onPreview,
  onDelete,
  onClearFilters,
  onCreateFirst,
}: TemplateGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-lg" />
        ))}
      </div>
    );
  }

  if (templates.length === 0 && hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="text-sm text-text-secondary">
          No templates match your filters
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="mt-2"
        >
          Clear filters
        </Button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cream">
          <Plus className="h-8 w-8 text-text-muted" />
        </div>
        <h3 className="font-serif text-lg font-semibold text-foreground">
          Create your first template
        </h3>
        <p className="mt-1 text-sm text-text-secondary">
          Templates define how AI generates questions for your courses.
        </p>
        <Button onClick={onCreateFirst} className="mt-4">
          <Plus className="mr-2 h-4 w-4" />
          Create Template
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onPreview={onPreview}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
