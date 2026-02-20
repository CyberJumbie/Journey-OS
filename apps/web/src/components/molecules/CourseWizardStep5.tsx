"use client";

import type {
  CourseBasicInfo,
  CourseConfiguration,
  CourseStructure,
} from "@journey-os/types";
import { DAY_OF_WEEK_LABELS, SESSION_TYPE_LABELS } from "@journey-os/types";
import { Card, CardContent, CardHeader } from "@web/components/ui/card";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { Pencil } from "lucide-react";

export interface CourseWizardStep5Props {
  readonly basicInfo: Partial<CourseBasicInfo>;
  readonly configuration: Partial<CourseConfiguration>;
  readonly structure: CourseStructure;
  readonly directorId: string | null;
  readonly directorName: string | null;
  readonly directorEmail: string | null;
  readonly onEditStep: (step: number) => void;
}

function SectionHeader({
  title,
  step,
  onEdit,
}: {
  title: string;
  step: number;
  onEdit: (s: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-semibold text-navy-deep">{title}</h3>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onEdit(step)}
      >
        <Pencil className="mr-1 h-3 w-3" /> Edit
      </Button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  );
}

export function CourseWizardStep5({
  basicInfo,
  configuration,
  structure,
  directorId,
  directorName,
  directorEmail,
  onEditStep,
}: CourseWizardStep5Props) {
  const totalSessions = structure.sections.reduce(
    (sum, s) => sum + s.sessions.length,
    0,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Review your course details before creating.
      </p>

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader title="Basic Info" step={1} onEdit={onEditStep} />
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow label="Name" value={basicInfo.name ?? ""} />
          <InfoRow label="Code" value={basicInfo.code ?? ""} />
          <InfoRow label="Description" value={basicInfo.description || "—"} />
          <InfoRow
            label="Academic Year"
            value={basicInfo.academic_year ?? ""}
          />
          <InfoRow label="Semester" value={basicInfo.semester ?? ""} />
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader title="Configuration" step={2} onEdit={onEditStep} />
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow
            label="Credit Hours"
            value={String(configuration.credit_hours ?? 0)}
          />
          <InfoRow
            label="Max Enrollment"
            value={String(configuration.max_enrollment ?? 0)}
          />
          <InfoRow
            label="Required"
            value={configuration.is_required ? "Yes" : "No"}
          />
          {(configuration.prerequisites?.length ?? 0) > 0 && (
            <InfoRow
              label="Prerequisites"
              value={configuration.prerequisites?.join(", ") ?? ""}
            />
          )}
          <div className="py-1">
            <span className="text-sm text-text-secondary">
              Learning Objectives
            </span>
            <ol className="mt-1 list-decimal pl-5 text-sm text-text-primary">
              {configuration.learning_objectives?.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ol>
          </div>
          {(configuration.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1 py-1">
              <span className="text-sm text-text-secondary mr-2">Tags</span>
              {configuration.tags?.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structure */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader title="Structure" step={3} onEdit={onEditStep} />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-text-secondary mb-2">
            {structure.sections.length} section(s), {totalSessions} session(s)
          </p>
          <div className="space-y-3">
            {structure.sections.map((section, sIdx) => (
              <div key={sIdx} className="rounded-md bg-parchment p-3">
                <p className="text-sm font-medium text-text-primary">
                  {section.position}. {section.title || "Untitled Section"}
                </p>
                {section.sessions.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-4">
                    {section.sessions.map((session, ssIdx) => (
                      <li key={ssIdx} className="text-xs text-text-secondary">
                        {session.title || "Untitled"} —{" "}
                        {DAY_OF_WEEK_LABELS[session.day_of_week]}, Wk{" "}
                        {session.week_number}, {session.start_time}–
                        {session.end_time} (
                        {SESSION_TYPE_LABELS[session.session_type]})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Course Director */}
      <Card>
        <CardHeader className="pb-2">
          <SectionHeader title="Course Director" step={4} onEdit={onEditStep} />
        </CardHeader>
        <CardContent>
          {directorId ? (
            <div>
              <p className="text-sm font-medium text-text-primary">
                {directorName}
              </p>
              <p className="text-xs text-text-secondary">{directorEmail}</p>
            </div>
          ) : (
            <p className="text-sm text-text-secondary italic">Not assigned</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
