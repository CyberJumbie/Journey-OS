'use client';

import { KPIBookmark } from '@/components/organisms/KPIBookmark';
import { CourseGrid } from '@/components/organisms/CourseGrid';
import { MasteryHeatmap } from '@/components/organisms/MasteryHeatmap';
import { QuickActions } from '@/components/organisms/QuickActions';
import { ActivityFeed } from '@/components/organisms/ActivityFeed';
import { MOCK_KPIS, MOCK_COURSES, MOCK_MASTERY, MOCK_TASKS, MOCK_ACTIVITY } from './mock-data';

export default function DashboardPage() {
  return (
    <>
      <KPIBookmark
        userName="Adeyemi"
        summary="3 courses active · 2 items need review · coverage on track"
        kpis={MOCK_KPIS}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 md:gap-5 items-start">
        {/* Left column */}
        <div className="flex flex-col gap-4 md:gap-5">
          <CourseGrid courses={MOCK_COURSES} />
          <MasteryHeatmap
            title="PHAR 501 — Topic Mastery"
            topics={MOCK_MASTERY}
            belowThresholdCount={3}
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4 md:gap-5">
          <QuickActions />
          <ActivityFeed tasks={MOCK_TASKS} activities={MOCK_ACTIVITY} />
        </div>
      </div>
    </>
  );
}
