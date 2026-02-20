import { CourseOverview } from "@web/components/course/course-overview";

export const metadata = {
  title: "Course Overview",
};

export default function InstitutionCoursesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Course Overview</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor course health, SLO coverage, and content processing across
          your institution.
        </p>
      </div>
      <CourseOverview />
    </div>
  );
}
