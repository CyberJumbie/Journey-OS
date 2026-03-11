'use client';

/**
 * COURSE GRID -- Active courses list with coverage rings
 *
 * Displays faculty courses as rows inside a Card with color bars,
 * coverage SVG rings, and subconcept/item counts.
 * Organism level: composes Card + SectionMarker molecules.
 * Data comes via props from parent (page uses useCourses hook).
 */

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { SectionMarker } from '@/components/molecules/SectionMarker';
import type { CourseListItem } from '@/hooks/useCourses';

interface CourseGridProps {
  courses: CourseListItem[];
}

const COURSE_COLORS = [
  'var(--navy)',
  'var(--blue-mid)',
  'var(--green)',
  'var(--warning)',
  '#8B5CF6',
  '#EC4899',
];

function getCourseColor(index: number): string {
  return COURSE_COLORS[index % COURSE_COLORS.length];
}

export function CourseGrid({ courses }: CourseGridProps) {
  const router = useRouter();

  return (
    <Card variant="default" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4">
        <div>
          <SectionMarker label="My Courses" color="navy" className="mb-1" />
          <h3 className="font-serif text-base md:text-lg font-bold text-[var(--navy-deep)]">
            Active Courses
          </h3>
        </div>
        <button
          onClick={() => router.push('/courses')}
          className="font-sans text-xs font-semibold text-[var(--blue-mid)] bg-transparent border-none cursor-pointer"
        >
          View all &rarr;
        </button>
      </div>

      {courses.map((course, index) => (
        <div
          key={course.id}
          onClick={() => router.push(`/workbench?courseId=${course.id}`)}
          className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3.5 md:py-4 border-t border-[var(--border-light)] cursor-pointer transition-colors duration-150 hover:bg-[var(--parchment)]"
        >
          <div
            className="w-1 h-10 rounded-sm flex-shrink-0"
            style={{ background: getCourseColor(index) }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-sans text-sm md:text-[15px] font-semibold text-[var(--text-primary)]">
                {course.title}
              </span>
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-wider">
                {course.code}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {course.subconcept_count} concepts
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {course.item_count} items
              </span>
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}
