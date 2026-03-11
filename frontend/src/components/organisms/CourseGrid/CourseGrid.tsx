'use client';

/**
 * COURSE GRID -- Active courses list with coverage rings
 *
 * Displays faculty courses as rows inside a Card with color bars,
 * coverage SVG rings, and student/item counts.
 * Organism level: composes Card + SectionMarker molecules.
 */

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { SectionMarker } from '@/components/molecules/SectionMarker';

interface Course {
  id: string;
  name: string;
  code: string;
  students: number;
  coverage: number;
  items: number;
  status: 'active' | 'draft';
  color: string;
}

interface CourseGridProps {
  courses: Course[];
}

function CoverageRing({ coverage, color }: { coverage: number; color: string }) {
  const dash = (coverage / 100) * 100.5;
  return (
    <div className="relative w-10 h-10 flex-shrink-0 hidden md:block">
      <svg width="40" height="40" viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border-light)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} 100.5`} strokeLinecap="round"
          transform="rotate(-90 20 20)"
          className="transition-[stroke-dasharray] duration-[600ms] ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-medium text-[var(--text-secondary)]">
        {coverage}
      </span>
    </div>
  );
}

function coverageColor(coverage: number): string {
  if (coverage > 80) return 'var(--green)';
  if (coverage > 60) return 'var(--blue-mid)';
  return 'var(--warning)';
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

      {courses.map((course) => (
        <div
          key={course.id}
          onClick={() => router.push(`/courses/${course.id}`)}
          className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3.5 md:py-4 border-t border-[var(--border-light)] cursor-pointer transition-colors duration-150 hover:bg-[var(--parchment)]"
        >
          <div
            className="w-1 h-10 rounded-sm flex-shrink-0"
            style={{ background: course.color }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-sans text-sm md:text-[15px] font-semibold text-[var(--text-primary)]">
                {course.name}
              </span>
              {course.status === 'draft' && (
                <span className="font-mono text-[8px] tracking-wider uppercase text-[var(--warning)] bg-[var(--warning)]/[0.07] px-1.5 py-0.5 rounded-sm">
                  DRAFT
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <span className="font-mono text-[10px] text-[var(--text-muted)] tracking-wider">
                {course.code}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {course.students} students
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {course.items} items
              </span>
            </div>
          </div>
          <CoverageRing
            coverage={course.coverage}
            color={coverageColor(course.coverage)}
          />
        </div>
      ))}
    </Card>
  );
}
