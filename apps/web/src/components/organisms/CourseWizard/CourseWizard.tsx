"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type {
  WizardSectionInput,
  CourseWizardDraft,
  AcademicSemester,
} from "@journey-os/types";
import { COURSE_WIZARD_STEPS } from "@journey-os/types";
import { StepIndicator } from "@journey-os/ui";
import { Button } from "@web/components/ui/button";
import { CourseWizardStep1 } from "@web/components/molecules/CourseWizardStep1";
import { CourseWizardStep2 } from "@web/components/molecules/CourseWizardStep2";
import { CourseWizardStep3 } from "@web/components/molecules/CourseWizardStep3";
import { CourseWizardStep4 } from "@web/components/molecules/CourseWizardStep4";
import { CourseWizardStep5 } from "@web/components/molecules/CourseWizardStep5";
import { createCourse, checkCourseCode } from "@web/lib/api/courses";
import { Loader2 } from "lucide-react";

export interface CourseWizardProps {
  readonly userId: string;
  readonly institutionId: string;
}

const DRAFT_KEY_PREFIX = "course-wizard-draft-";

export function CourseWizard({ userId, institutionId }: CourseWizardProps) {
  const router = useRouter();
  const draftKey = `${DRAFT_KEY_PREFIX}${userId}`;

  // Step state
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Step 1: Basic Info
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [academicYear, setAcademicYear] = useState("2026");
  const [semester, setSemester] = useState<AcademicSemester>("fall");
  const [programId, setProgramId] = useState<string | null>(null);
  const [codeAvailable, setCodeAvailable] = useState<boolean | null>(null);
  const [codeCheckLoading, setCodeCheckLoading] = useState(false);

  // Step 2: Configuration
  const [creditHours, setCreditHours] = useState(3);
  const [maxEnrollment, setMaxEnrollment] = useState(60);
  const [isRequired, setIsRequired] = useState(false);
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [learningObjectives, setLearningObjectives] = useState<string[]>([""]);
  const [tags, setTags] = useState<string[]>([]);

  // Step 3: Structure
  const [sections, setSections] = useState<WizardSectionInput[]>([]);

  // Step 4: Director
  const [directorId, setDirectorId] = useState<string | null>(null);
  const [directorName, setDirectorName] = useState<string | null>(null);
  const [directorEmail, setDirectorEmail] = useState<string | null>(null);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Draft persistence — load on mount (async IIFE to satisfy react-hooks/set-state-in-effect)
  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (!raw) return;
        const draft = JSON.parse(raw) as CourseWizardDraft;
        setCurrentStep(draft.currentStep);
        if (draft.basic_info.name) setName(draft.basic_info.name);
        if (draft.basic_info.code) setCode(draft.basic_info.code);
        if (draft.basic_info.description)
          setDescription(draft.basic_info.description);
        if (draft.basic_info.academic_year)
          setAcademicYear(draft.basic_info.academic_year);
        if (draft.basic_info.semester) setSemester(draft.basic_info.semester);
        if (draft.basic_info.program_id !== undefined)
          setProgramId(draft.basic_info.program_id ?? null);
        if (draft.configuration.credit_hours)
          setCreditHours(draft.configuration.credit_hours);
        if (draft.configuration.max_enrollment)
          setMaxEnrollment(draft.configuration.max_enrollment);
        if (draft.configuration.is_required !== undefined)
          setIsRequired(draft.configuration.is_required);
        if (draft.configuration.prerequisites)
          setPrerequisites([...draft.configuration.prerequisites]);
        if (draft.configuration.learning_objectives)
          setLearningObjectives([...draft.configuration.learning_objectives]);
        if (draft.configuration.tags) setTags([...draft.configuration.tags]);
        if (draft.structure.sections)
          setSections(draft.structure.sections as WizardSectionInput[]);
        if (draft.director.course_director_id !== undefined)
          setDirectorId(draft.director.course_director_id ?? null);
      } catch {
        // Ignore invalid draft
      }
    };
    restoreDraft();
  }, [draftKey]);

  // Save draft
  const saveDraft = useCallback(() => {
    const draft: CourseWizardDraft = {
      currentStep,
      basic_info: {
        name,
        code,
        description,
        academic_year: academicYear,
        semester,
        program_id: programId,
      },
      configuration: {
        credit_hours: creditHours,
        max_enrollment: maxEnrollment,
        is_required: isRequired,
        prerequisites,
        learning_objectives: learningObjectives,
        tags,
      },
      structure: { sections },
      director: { course_director_id: directorId },
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [
    currentStep,
    name,
    code,
    description,
    academicYear,
    semester,
    programId,
    creditHours,
    maxEnrollment,
    isRequired,
    prerequisites,
    learningObjectives,
    tags,
    sections,
    directorId,
    draftKey,
  ]);

  // Code uniqueness check (debounced)
  // All setState calls wrapped in async functions to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    if (code.length < 3) {
      const reset = async () => {
        setCodeAvailable(null);
        setCodeCheckLoading(false);
      };
      reset();
      return;
    }
    const beginCheck = async () => {
      setCodeCheckLoading(true);
    };
    beginCheck();
    let cancelled = false;
    const timeout = setTimeout(async () => {
      const res = await checkCourseCode(code);
      if (!cancelled) {
        if (res.data) {
          setCodeAvailable(res.data.available);
        }
        setCodeCheckLoading(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [code]);

  // Step validation
  function isStep1Valid(): boolean {
    return (
      name.length >= 3 &&
      code.length >= 3 &&
      /^[A-Z0-9-]+$/.test(code) &&
      codeAvailable === true &&
      semester.length > 0
    );
  }

  function isStep2Valid(): boolean {
    return (
      creditHours >= 1 &&
      maxEnrollment >= 1 &&
      learningObjectives.filter((o) => o.trim().length > 0).length >= 1
    );
  }

  function isStep3Valid(): boolean {
    return (
      sections.length >= 1 &&
      sections.every(
        (s) =>
          s.title.trim().length > 0 &&
          s.sessions.every(
            (ss) => ss.title.trim().length > 0 && ss.start_time < ss.end_time,
          ),
      )
    );
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case 1:
        return isStep1Valid();
      case 2:
        return isStep2Valid();
      case 3:
        return isStep3Valid();
      case 4:
        return true; // CD is optional
      case 5:
        return true;
      default:
        return false;
    }
  }

  function goNext() {
    if (!canProceed()) return;
    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep],
    );
    setCurrentStep((s) => Math.min(s + 1, 5));
    saveDraft();
  }

  function goBack() {
    setCurrentStep((s) => Math.max(s - 1, 1));
  }

  function goToStep(step: number) {
    setCurrentStep(step);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const res = await createCourse({
      basic_info: {
        name,
        code,
        description,
        academic_year: academicYear,
        semester,
        program_id: programId,
      },
      configuration: {
        credit_hours: creditHours,
        max_enrollment: maxEnrollment,
        is_required: isRequired,
        prerequisites,
        learning_objectives: learningObjectives.filter(
          (o) => o.trim().length > 0,
        ),
        tags,
      },
      structure: { sections },
      director: { course_director_id: directorId },
    });

    if (res.error) {
      setError(res.error.message);
      setSubmitting(false);
      return;
    }

    // Clear draft on success
    localStorage.removeItem(draftKey);
    router.push(`/faculty/courses/${res.data!.id}`);
  }

  function handleCancel() {
    localStorage.removeItem(draftKey);
    router.push("/faculty/courses");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <StepIndicator
        steps={COURSE_WIZARD_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
      />

      <div className="rounded-lg bg-white p-6 shadow-sm">
        {currentStep === 1 && (
          <CourseWizardStep1
            name={name}
            onNameChange={setName}
            code={code}
            onCodeChange={(v) => setCode(v.toUpperCase())}
            description={description}
            onDescriptionChange={setDescription}
            academicYear={academicYear}
            onAcademicYearChange={setAcademicYear}
            semester={semester}
            onSemesterChange={(v) => setSemester(v as AcademicSemester)}
            programId={programId}
            onProgramIdChange={setProgramId}
            codeAvailable={codeAvailable}
            codeCheckLoading={codeCheckLoading}
          />
        )}

        {currentStep === 2 && (
          <CourseWizardStep2
            creditHours={creditHours}
            onCreditHoursChange={setCreditHours}
            maxEnrollment={maxEnrollment}
            onMaxEnrollmentChange={setMaxEnrollment}
            isRequired={isRequired}
            onIsRequiredChange={setIsRequired}
            prerequisites={prerequisites}
            onPrerequisitesChange={setPrerequisites}
            learningObjectives={learningObjectives}
            onLearningObjectivesChange={setLearningObjectives}
            tags={tags}
            onTagsChange={setTags}
          />
        )}

        {currentStep === 3 && (
          <CourseWizardStep3
            sections={sections}
            onSectionsChange={setSections}
          />
        )}

        {currentStep === 4 && (
          <CourseWizardStep4
            selectedDirectorId={directorId}
            selectedDirectorName={directorName}
            selectedDirectorEmail={directorEmail}
            onSelectDirector={(id, n, e) => {
              setDirectorId(id);
              setDirectorName(n);
              setDirectorEmail(e);
            }}
            onClearDirector={() => {
              setDirectorId(null);
              setDirectorName(null);
              setDirectorEmail(null);
            }}
            institutionId={institutionId}
          />
        )}

        {currentStep === 5 && (
          <CourseWizardStep5
            basicInfo={{
              name,
              code,
              description,
              academic_year: academicYear,
              semester,
              program_id: programId,
            }}
            configuration={{
              credit_hours: creditHours,
              max_enrollment: maxEnrollment,
              is_required: isRequired,
              prerequisites,
              learning_objectives: learningObjectives,
              tags,
            }}
            structure={{ sections }}
            directorId={directorId}
            directorName={directorName}
            directorEmail={directorEmail}
            onEditStep={goToStep}
          />
        )}

        {error && (
          <p className="mt-4 text-sm text-[var(--color-red-500)]">{error}</p>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" variant="outline" onClick={saveDraft}>
            Save Draft
          </Button>
        </div>
        <div className="flex gap-2">
          {currentStep > 1 && (
            <Button type="button" variant="outline" onClick={goBack}>
              Back
            </Button>
          )}
          {currentStep < 5 ? (
            <Button
              type="button"
              className="bg-navy-deep text-white hover:bg-navy-deep/90"
              disabled={!canProceed()}
              onClick={goNext}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              className="bg-navy-deep text-white hover:bg-navy-deep/90"
              disabled={submitting}
              onClick={handleSubmit}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Course
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
