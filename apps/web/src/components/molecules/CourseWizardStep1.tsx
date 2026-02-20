"use client";

import { Check, X, Loader2 } from "lucide-react";
import { Input } from "@web/components/ui/input";
import { Textarea } from "@web/components/ui/textarea";
import { Label } from "@web/components/ui/label";
import { Badge } from "@web/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";

interface CourseWizardStep1Props {
  readonly name: string;
  readonly onNameChange: (v: string) => void;
  readonly code: string;
  readonly onCodeChange: (v: string) => void;
  readonly description: string;
  readonly onDescriptionChange: (v: string) => void;
  readonly academicYear: string;
  readonly onAcademicYearChange: (v: string) => void;
  readonly semester: string;
  readonly onSemesterChange: (v: string) => void;
  readonly programId: string | null;
  readonly onProgramIdChange: (v: string | null) => void;
  readonly codeAvailable: boolean | null;
  readonly codeCheckLoading: boolean;
}

function CodeAvailabilityIndicator({
  available,
  loading,
}: {
  readonly available: boolean | null;
  readonly loading: boolean;
}) {
  if (loading) {
    return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  }
  if (available === true) {
    return (
      <Badge variant="secondary" className="text-green-700 dark:text-green-400">
        <Check className="size-3" />
        Available
      </Badge>
    );
  }
  if (available === false) {
    return (
      <Badge variant="destructive">
        <X className="size-3" />
        Already in use
      </Badge>
    );
  }
  return null;
}

const SEMESTER_OPTIONS = [
  { value: "fall", label: "Fall" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "year_long", label: "Year Long" },
] as const;

export function CourseWizardStep1({
  name,
  onNameChange,
  code,
  onCodeChange,
  description,
  onDescriptionChange,
  academicYear,
  onAcademicYearChange,
  semester,
  onSemesterChange,
  programId,
  onProgramIdChange,
  codeAvailable,
  codeCheckLoading,
}: CourseWizardStep1Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="course-name">
          Course Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="course-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Human Anatomy I"
          minLength={3}
          required
        />
      </div>

      {/* Code */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="course-code">
          Course Code <span className="text-destructive">*</span>
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="course-code"
            value={code}
            onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
            placeholder="e.g. ANAT101"
            minLength={3}
            required
            className="flex-1"
          />
          <CodeAvailabilityIndicator
            available={codeAvailable}
            loading={codeCheckLoading}
          />
        </div>
      </div>

      {/* Description — full width */}
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label htmlFor="course-description">Description</Label>
        <Textarea
          id="course-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Brief course description (max 2000 characters)"
          maxLength={2000}
          rows={4}
        />
      </div>

      {/* Academic Year */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="course-academic-year">Academic Year</Label>
        <Input
          id="course-academic-year"
          value={academicYear}
          onChange={(e) => onAcademicYearChange(e.target.value)}
          placeholder="e.g. 2025-2026"
        />
      </div>

      {/* Semester */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="course-semester">Semester</Label>
        <Select value={semester} onValueChange={onSemesterChange}>
          <SelectTrigger id="course-semester" className="w-full">
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            {SEMESTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Program ID */}
      <div className="flex flex-col gap-2 md:col-span-2">
        <Label htmlFor="course-program-id">Program ID (optional)</Label>
        <Input
          id="course-program-id"
          value={programId ?? ""}
          onChange={(e) =>
            onProgramIdChange(e.target.value === "" ? null : e.target.value)
          }
          placeholder="Associated program identifier"
        />
      </div>
    </div>
  );
}
