'use client';

import dynamic from 'next/dynamic';

const QuestWorkbenchContent = dynamic(
  () => import('./quest-workbench-content'),
  { ssr: false }
);

export default function QuestWorkbenchPage() {
  return <QuestWorkbenchContent />;
}
