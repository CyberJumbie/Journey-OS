"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Pencil, BookOpen } from "lucide-react";
import type { CourseDetailView } from "@journey-os/types";
import { CourseHierarchyTree } from "./course-hierarchy-tree";

interface FacultyCourseDetailProps {
  readonly courseId: string;
  readonly currentUserId?: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green/10 text-green-dark",
  draft: "bg-warning/10 text-warning",
  archived: "bg-warm-gray/20 text-text-muted",
};

export function FacultyCourseDetail({
  courseId,
  currentUserId,
}: FacultyCourseDetailProps) {
  const [data, setData] = useState<CourseDetailView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/v1/courses/${courseId}/view`);
        const json = (await res.json()) as {
          data?: CourseDetailView;
          error?: { code: string; message: string };
        };

        if (!res.ok) {
          setError(json.error?.message ?? "Failed to load course");
          return;
        }

        setData(json.data ?? null);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    void fetchDetail();
  }, [courseId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={`skeleton-${String(i)}`}
            className="h-32 animate-pulse rounded-xl border border-border-light bg-parchment"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
        <Link
          href="/faculty/courses"
          className="mt-2 inline-block text-sm font-medium text-red-700 underline"
        >
          Back to courses
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const isCourseDirector =
    currentUserId != null && data.course_director?.id === currentUserId;

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/faculty/courses"
        className="inline-flex items-center gap-1 font-sans text-sm text-blue-mid hover:text-navy-deep"
      >
        <ArrowLeft size={14} />
        All Courses
      </Link>

      {/* Course Info Card */}
      <div className="rounded-xl border border-border-light bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-3">
              <span className="font-mono text-xs tracking-wider text-text-muted">
                {data.code}
              </span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider ${STATUS_STYLES[data.status] ?? STATUS_STYLES.archived}`}
              >
                {data.status}
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-navy-deep">
              {data.name}
            </h1>
            {data.description && (
              <p className="mt-2 max-w-prose font-sans text-sm text-text-secondary">
                {data.description}
              </p>
            )}
          </div>

          {isCourseDirector && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-border-light px-3 py-1.5 font-sans text-sm text-text-secondary transition-colors hover:bg-parchment"
            >
              <Pencil size={14} />
              Edit
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-6 border-t border-border-light pt-4">
          <DetailField label="Program" value={data.program_name ?? "\u2014"} />
          <DetailField
            label="Academic Year"
            value={data.academic_year ?? "\u2014"}
          />
          <DetailField label="Semester" value={data.semester ?? "\u2014"} />
          <DetailField
            label="Credit Hours"
            value={
              data.credit_hours != null ? String(data.credit_hours) : "\u2014"
            }
          />
        </div>
      </div>

      {/* Course Director Card */}
      {data.course_director && (
        <div className="rounded-xl border border-border-light bg-white p-6">
          <h2 className="mb-3 font-mono text-[0.5625rem] uppercase tracking-wider text-text-muted">
            Course Director
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-parchment font-serif text-sm font-bold text-navy-deep">
              {data.course_director.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-text-primary">
                {data.course_director.full_name}
              </p>
              <a
                href={`mailto:${data.course_director.email}`}
                className="flex items-center gap-1 font-sans text-xs text-blue-mid hover:text-navy-deep"
              >
                <Mail size={10} />
                {data.course_director.email}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Hierarchy Tree */}
      <div className="rounded-xl border border-border-light bg-white p-6">
        <h2 className="mb-4 font-mono text-[0.5625rem] uppercase tracking-wider text-text-muted">
          Course Structure
        </h2>
        <div className="rounded-lg bg-parchment p-4">
          <CourseHierarchyTree sections={data.hierarchy} />
        </div>
      </div>

      {/* SLO Placeholder */}
      <div className="rounded-xl border border-border-light bg-white p-6">
        <h2 className="mb-3 font-mono text-[0.5625rem] uppercase tracking-wider text-text-muted">
          Student Learning Outcomes
        </h2>
        <div className="flex items-center gap-2 rounded-lg bg-parchment px-4 py-6 text-center">
          <BookOpen size={16} className="mx-auto text-text-muted" />
        </div>
        <p className="mt-2 text-center font-sans text-xs text-text-muted">
          Student Learning Outcomes will appear here once configured.
        </p>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[0.5625rem] uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 font-sans text-sm text-text-primary">{value}</dd>
    </div>
  );
}
