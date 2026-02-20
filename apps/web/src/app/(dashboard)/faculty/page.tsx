"use client";

import { useBreakpoint } from "@web/hooks/use-breakpoint";
import { KpiStrip } from "@web/components/dashboard/kpi-strip";
import { CourseCard } from "@web/components/dashboard/course-card";
import { MasteryCell } from "@web/components/dashboard/mastery-cell";
import { QuickActions } from "@web/components/dashboard/quick-actions";
import { TaskList } from "@web/components/dashboard/task-item";
import { ActivityFeed } from "@web/components/dashboard/activity-item";
import {
  mockUser,
  mockKpis,
  mockCourses,
  mockMasteryTopics,
  mockTasks,
  mockActivity,
  quickActions,
} from "@web/components/dashboard/mock-data";

const C = {
  green: "#69a338",
  blueMid: "#2b71b9",
  bluePale: "#a3d9ff",
  warning: "#fa9d33",
  borderLight: "#edeae4",
};

// Next.js App Router requires default export for pages
export default function FacultyDashboardPage() {
  const bp = useBreakpoint();
  const isMobile = bp === "mobile";
  const isDesktop = bp === "desktop";

  return (
    <>
      <KpiStrip kpis={mockKpis} userName={mockUser.name} />

      <div
        className="grid items-start"
        style={{
          gridTemplateColumns: isDesktop ? "1fr 360px" : "1fr",
          gap: isMobile ? 16 : 20,
        }}
      >
        {/* Left Column */}
        <div className="flex flex-col" style={{ gap: isMobile ? 16 : 20 }}>
          <CourseCard courses={mockCourses} />

          {/* Mastery Overview */}
          <div
            className="rounded-xl border border-border-light bg-white"
            style={{ padding: isMobile ? 16 : "20px 24px" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <div
                    className="h-[5px] w-[5px] rounded-sm"
                    style={{ background: C.green }}
                  />
                  <span
                    className="font-mono uppercase text-text-muted"
                    style={{ fontSize: 9, letterSpacing: "0.08em" }}
                  >
                    Cohort Mastery
                  </span>
                </div>
                <h3
                  className="font-serif font-bold text-navy-deep"
                  style={{ fontSize: isMobile ? 16 : 18 }}
                >
                  PHAR 501 — Topic Mastery
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {[
                  { color: C.green, label: ">70%" },
                  { color: C.blueMid, label: "40-70%" },
                  { color: C.bluePale, label: "15-40%" },
                  { color: C.borderLight, label: "<15%" },
                ].map((l, i) => (
                  <div
                    key={i}
                    className="items-center gap-1"
                    style={{ display: isMobile && i > 1 ? "none" : "flex" }}
                  >
                    <div
                      className="rounded-sm"
                      style={{ width: 8, height: 8, background: l.color }}
                    />
                    <span
                      className="font-mono text-text-muted"
                      style={{ fontSize: 8, letterSpacing: "0.04em" }}
                    >
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${isMobile ? 4 : 6}, 1fr)`,
                gap: 6,
              }}
            >
              {mockMasteryTopics.map((t, i) => (
                <div key={i}>
                  <MasteryCell value={t.mastery} label={t.name} />
                  <div
                    className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-text-muted"
                    style={{
                      fontSize: 8,
                      textAlign: "center",
                      marginTop: 4,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {t.name}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-parchment"
              style={{ padding: "12px 14px" }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-[5px] w-[5px] rounded-sm"
                  style={{ background: C.warning }}
                />
                <span className="font-sans text-[13px] text-text-secondary">
                  <strong className="text-text-primary">3 topics</strong> below
                  mastery threshold
                </span>
              </div>
              <button className="border-none bg-transparent font-sans text-xs font-semibold text-blue-mid">
                View details →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col" style={{ gap: isMobile ? 16 : 20 }}>
          <QuickActions actions={quickActions} />
          <TaskList tasks={mockTasks} />
          <ActivityFeed activities={mockActivity} />
        </div>
      </div>
    </>
  );
}
