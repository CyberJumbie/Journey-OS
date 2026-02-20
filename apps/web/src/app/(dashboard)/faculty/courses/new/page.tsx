"use client";

import { CourseWizard } from "@web/components/organisms/CourseWizard/CourseWizard";

/**
 * Course creation page — wraps the CourseWizard organism.
 * [STORY-F-20] Next.js App Router requires default export.
 *
 * TODO: Get userId and institutionId from auth context once available.
 * For now uses placeholder values that will be replaced by auth integration.
 */
export default function CourseCreationPage() {
  // TODO: Replace with actual auth context values
  const userId = "placeholder-user-id";
  const institutionId = "placeholder-institution-id";

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-navy-deep">
          Create New Course
        </h1>
        <p className="text-sm text-text-secondary">
          Follow the steps below to set up your course.
        </p>
      </div>
      <CourseWizard userId={userId} institutionId={institutionId} />
    </div>
  );
}
