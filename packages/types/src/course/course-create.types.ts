/**
 * Course creation wizard types.
 * [STORY-F-20] Multi-step wizard input types aligned with actual DB schema.
 *
 * Key differences from brief (adjusted for DB reality):
 * - `semester` not `term` (courses table column)
 * - `academic_year` is string (DB is text)
 * - sections/sessions use `title` not `name` (matches existing hierarchy types)
 * - `day_of_week` is DayOfWeek string enum (matches existing hierarchy types)
 * - No `institution_id` on course — resolved via program_id → programs.institution_id
 * - `session_type` added to sessions via migration
 */

import type { CourseStatus, DayOfWeek } from "..";

/** Academic semester options (stored in courses.semester) */
export type AcademicSemester = "fall" | "spring" | "summer" | "year_long";

/** Session type */
export type SessionType =
  | "lecture"
  | "lab"
  | "clinical"
  | "discussion"
  | "exam";

/** Step 1: Basic info */
export interface CourseBasicInfo {
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly academic_year: string;
  readonly semester: AcademicSemester;
  readonly program_id: string | null;
}

/** Step 2: Configuration */
export interface CourseConfiguration {
  readonly credit_hours: number;
  readonly max_enrollment: number;
  readonly is_required: boolean;
  readonly prerequisites: readonly string[];
  readonly learning_objectives: readonly string[];
  readonly tags: readonly string[];
}

/** Section input for step 3 */
export interface WizardSectionInput {
  readonly title: string;
  readonly position: number;
  readonly sessions: readonly WizardSessionInput[];
}

/** Session input for step 3 */
export interface WizardSessionInput {
  readonly title: string;
  readonly week_number: number;
  readonly day_of_week: DayOfWeek;
  readonly start_time: string;
  readonly end_time: string;
  readonly session_type: SessionType;
}

/** Step 3: Structure */
export interface CourseStructure {
  readonly sections: readonly WizardSectionInput[];
}

/** Step 4: Course Director */
export interface CourseDirectorAssignment {
  readonly course_director_id: string | null;
}

/** Complete course creation input (all steps combined) */
export interface CourseCreateInput {
  readonly basic_info: CourseBasicInfo;
  readonly configuration: CourseConfiguration;
  readonly structure: CourseStructure;
  readonly director: CourseDirectorAssignment;
}

/** Course creation response */
export interface CourseCreateResponse {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly status: CourseStatus;
  readonly section_count: number;
  readonly session_count: number;
  readonly course_director_id: string | null;
  readonly created_at: string;
}

/** Course code uniqueness check response */
export interface CourseCodeCheckResponse {
  readonly available: boolean;
  readonly code: string;
}

/** Wizard step definition for the frontend */
export interface WizardStepDefinition {
  readonly id: number;
  readonly label: string;
  readonly description: string;
}

/** All wizard steps */
export const COURSE_WIZARD_STEPS: readonly WizardStepDefinition[] = [
  {
    id: 1,
    label: "Basic Info",
    description: "Course name, code, and semester",
  },
  {
    id: 2,
    label: "Configuration",
    description: "Credits, enrollment, and learning objectives",
  },
  { id: 3, label: "Structure", description: "Sections and sessions" },
  { id: 4, label: "Course Director", description: "Assign a Course Director" },
  { id: 5, label: "Review", description: "Review and create course" },
] as const;

/** Draft state stored in localStorage */
export interface CourseWizardDraft {
  readonly currentStep: number;
  readonly basic_info: Partial<CourseBasicInfo>;
  readonly configuration: Partial<CourseConfiguration>;
  readonly structure: Partial<CourseStructure>;
  readonly director: Partial<CourseDirectorAssignment>;
  readonly savedAt: string;
}

/** Day of week labels for UI display */
export const DAY_OF_WEEK_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/** Session type labels for UI display */
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  lecture: "Lecture",
  lab: "Laboratory",
  clinical: "Clinical",
  discussion: "Discussion",
  exam: "Exam",
};
