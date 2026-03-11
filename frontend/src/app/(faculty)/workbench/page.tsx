'use client';

/**
 * P1-026 + P2-008: Workbench page — renders QuestWorkbench with CopilotKit.
 *
 * Dynamic import with ssr: false is REQUIRED because CopilotKit hooks
 * (useCopilotReadable, CopilotChat) fail during Next.js static prerendering.
 *
 * Reads from URL search params:
 * - Generate mode: /workbench?courseId=medi-531
 * - Review mode:   /workbench?mode=review&itemId={id}&courseId=medi-531
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const QuestWorkbench = dynamic(
  () => import('@/components/organisms/QuestWorkbench'),
  { ssr: false },
);

function WorkbenchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = searchParams.get('courseId');
  const mode = searchParams.get('mode');
  const itemId = searchParams.get('itemId');

  useEffect(() => {
    if (!courseId) {
      router.replace('/courses');
    }
  }, [courseId, router]);

  if (!courseId) {
    return null;
  }

  const isReviewMode = mode === 'review' && !!itemId;

  return (
    <QuestWorkbench
      courseId={courseId}
      mode={isReviewMode ? 'review' : 'generate'}
      reviewItemId={isReviewMode ? itemId : undefined}
    />
  );
}

export default function WorkbenchPage() {
  return (
    <Suspense fallback={<WorkbenchPageLoading />}>
      <WorkbenchPageContent />
    </Suspense>
  );
}

function WorkbenchPageLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
      <p className="font-[family-name:var(--font-body)] text-sm text-[var(--gray-600)]">
        Loading workbench...
      </p>
    </div>
  );
}
