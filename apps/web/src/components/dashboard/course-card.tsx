"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";

const C = {
  green: "#69a338",
  blueMid: "#2b71b9",
  warning: "#fa9d33",
  parchment: "#faf9f6",
  borderLight: "#edeae4",
  textPrimary: "#1b232a",
  textMuted: "#718096",
  textSecondary: "#4a5568",
};

interface Course {
  name: string;
  code: string;
  students: number;
  coverage: number;
  items: number;
  status: "active" | "draft";
  color: string;
}

interface CourseCardProps {
  courses: Course[];
}

export function CourseCard({ courses }: CourseCardProps) {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";

  return (
    <div className="overflow-hidden rounded-xl border border-border-light bg-white">
      <div
        style={{
          padding: isMobile ? "16px 16px 12px" : "20px 24px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div className="mb-1 flex items-center gap-2">
            <div className="h-[5px] w-[5px] rounded-sm bg-navy-deep" />
            <span
              className="font-mono uppercase text-text-muted"
              style={{ fontSize: 9, letterSpacing: "0.08em" }}
            >
              My Courses
            </span>
          </div>
          <h3
            className="font-serif font-bold text-navy-deep"
            style={{ fontSize: isMobile ? 16 : 18 }}
          >
            Active Courses
          </h3>
        </div>
        <button className="border-none bg-transparent font-sans text-xs font-semibold text-blue-mid">
          View all →
        </button>
      </div>

      {courses.map((course, i) => (
        <div
          key={i}
          className="cursor-pointer border-t border-border-light transition-colors hover:bg-parchment"
          style={{
            padding: isMobile ? "14px 16px" : "16px 24px",
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 12 : 16,
          }}
        >
          <div
            style={{
              width: 4,
              height: 40,
              borderRadius: 2,
              background: course.color,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mb-[3px] flex items-center gap-2">
              <span
                className="font-sans font-semibold text-text-primary"
                style={{ fontSize: isMobile ? 14 : 15 }}
              >
                {course.name}
              </span>
              {course.status === "draft" && (
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 8,
                    color: C.warning,
                    letterSpacing: "0.08em",
                    background: `${C.warning}12`,
                    padding: "2px 6px",
                    borderRadius: 3,
                  }}
                >
                  DRAFT
                </span>
              )}
            </div>
            <div
              className="flex flex-wrap items-center"
              style={{ gap: isMobile ? 8 : 16 }}
            >
              <span
                className="font-mono text-text-muted"
                style={{ fontSize: 10, letterSpacing: "0.04em" }}
              >
                {course.code}
              </span>
              <span className="text-xs text-text-muted">
                {course.students} students
              </span>
              <span className="text-xs text-text-muted">
                {course.items} items
              </span>
            </div>
          </div>

          {!isMobile && (
            <div
              style={{
                position: "relative",
                width: 40,
                height: 40,
                flexShrink: 0,
              }}
            >
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke={C.borderLight}
                  strokeWidth="3"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  fill="none"
                  stroke={
                    course.coverage > 80
                      ? C.green
                      : course.coverage > 60
                        ? C.blueMid
                        : C.warning
                  }
                  strokeWidth="3"
                  strokeDasharray={`${(course.coverage / 100) * 100.5} 100.5`}
                  strokeLinecap="round"
                  transform="rotate(-90 20 20)"
                  style={{ transition: "stroke-dasharray 0.6s ease" }}
                />
              </svg>
              <span
                className="font-mono text-text-secondary"
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 500,
                }}
              >
                {course.coverage}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
