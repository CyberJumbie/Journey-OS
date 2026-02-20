import { FacultyCourseList } from "@web/components/course/faculty-course-list";

// Next.js App Router requires default export for pages
export default function FacultyCoursesPage() {
  return (
    <>
      <div className="mb-6">
        <div className="mb-1 flex items-center gap-2">
          <div className="h-[5px] w-[5px] rounded-sm bg-navy-deep" />
          <span
            className="font-mono uppercase text-text-muted"
            style={{ fontSize: 9, letterSpacing: "0.08em" }}
          >
            Course Management
          </span>
        </div>
        <h1 className="font-serif text-2xl font-bold text-navy-deep">
          Courses
        </h1>
      </div>

      <FacultyCourseList />
    </>
  );
}
