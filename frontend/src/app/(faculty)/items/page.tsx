'use client';

import { useSearchParams } from 'next/navigation';
import type { ItemStatus } from '@journey-os/shared-types';
import QuestionTable from '@/components/organisms/QuestionTable';

export default function ItemsPage() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId') ?? undefined;
  const status = (searchParams.get('status') as ItemStatus) ?? undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--ink)]">Question Bank</h1>
        <p className="text-sm text-[var(--gray-600)] mt-1">
          Browse and filter all generated assessment items
        </p>
      </div>
      <QuestionTable initialCourseId={courseId} initialStatus={status} />
    </div>
  );
}
