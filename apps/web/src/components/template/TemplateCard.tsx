"use client";

import { MoreVertical, Edit, Copy, Eye, Trash2 } from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@web/components/ui/card";
import { Button } from "@web/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@web/components/ui/dropdown-menu";
import { SharingLevelBadge } from "@web/components/template/SharingLevelBadge";
import type { TemplateDTO } from "@journey-os/types";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_best_answer: "Single Best Answer",
  extended_matching: "Extended Matching",
  sequential_item_set: "Sequential Item Set",
};

interface TemplateCardProps {
  readonly template: TemplateDTO;
  readonly onEdit: (template: TemplateDTO) => void;
  readonly onDuplicate: (template: TemplateDTO) => void;
  readonly onPreview: (template: TemplateDTO) => void;
  readonly onDelete: (template: TemplateDTO) => void;
}

export function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onPreview,
  onDelete,
}: TemplateCardProps) {
  const updatedDate = new Date(template.updated_at).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-base font-semibold text-foreground">
            {template.name}
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            {QUESTION_TYPE_LABELS[template.question_type] ??
              template.question_type}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              aria-label="Template actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(template)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(template)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onPreview(template)}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(template)}
              className="text-error focus:text-error"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pb-3">
        <p className="line-clamp-2 text-sm text-text-secondary">
          {template.description || "No description"}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-0">
        <SharingLevelBadge level={template.sharing_level} />
        <span className="text-xs text-text-muted">
          v{template.current_version} &middot; {updatedDate}
        </span>
      </CardFooter>
    </Card>
  );
}
