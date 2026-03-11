'use client';

/**
 * QUICK ACTIONS -- 2x2 grid of action buttons
 *
 * Common faculty actions: Generate Items, Create Exam, Map Curriculum, View Reports.
 * Each button navigates to its target route.
 * Organism level: composes Card + SectionMarker.
 */

import { useRouter } from 'next/navigation';
import { Sparkles, FileCheck, BookOpen, BarChart3, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { SectionMarker } from '@/components/molecules/SectionMarker';

interface QuickAction {
  label: string;
  Icon: LucideIcon;
  color: string;
  path: string;
}

const ACTIONS: QuickAction[] = [
  { label: 'Generate Items', Icon: Sparkles, color: 'var(--navy-deep)', path: '/generation/wizard' },
  { label: 'Create Exam', Icon: FileCheck, color: 'var(--blue-mid)', path: '/exams/assembly' },
  { label: 'Map Curriculum', Icon: BookOpen, color: 'var(--green)', path: '/courses/outcome-mapping' },
  { label: 'View Reports', Icon: BarChart3, color: 'var(--green-dark)', path: '/analytics' },
];

export function QuickActions() {
  const router = useRouter();

  return (
    <Card variant="default" className="p-4 md:p-5 lg:px-6">
      <SectionMarker label="Quick Actions" color="blue" className="mb-3.5" />
      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => {
          const Icon = a.Icon;
          return (
            <button
              key={a.label}
              onClick={() => router.push(a.path)}
              className="bg-[var(--parchment)] border border-[var(--border-light)] rounded-lg p-3.5 cursor-pointer transition-all duration-200 text-left hover:border-[var(--blue-mid)] hover:shadow-sm"
            >
              <Icon size={20} color={a.color} strokeWidth={2} className="mb-1.5" />
              <div className="font-sans text-[13px] font-semibold text-[var(--text-primary)]">
                {a.label}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
