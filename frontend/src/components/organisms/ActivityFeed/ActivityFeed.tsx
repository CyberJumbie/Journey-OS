'use client';

/**
 * ACTIVITY FEED -- Recent activity timeline + upcoming tasks
 *
 * Two cards in the right column: tasks with priority dots and
 * a timeline of recent events with typed icons.
 * Organism level: composes Card + SectionMarker.
 */

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { SectionMarker } from '@/components/molecules/SectionMarker';

/* ---------- Types ---------- */

interface Task {
  title: string;
  due: string;
  priority: 'high' | 'medium' | 'low';
  course: string;
}

interface Activity {
  type: 'generated' | 'review' | 'alert' | 'student';
  text: string;
  time: string;
  icon: string;
}

interface ActivityFeedProps {
  tasks: Task[];
  activities: Activity[];
}

/* ---------- Sub-components ---------- */

function priorityColor(p: Task['priority']): string {
  if (p === 'high') return 'var(--danger)';
  if (p === 'medium') return 'var(--warning)';
  return 'var(--border-light)';
}

function activityBg(type: Activity['type']): string {
  if (type === 'alert') return 'bg-[var(--warning)]/10';
  if (type === 'student') return 'bg-[var(--blue-mid)]/10';
  return 'bg-[var(--navy-deep)]/[0.04]';
}

function activityColor(type: Activity['type']): string {
  if (type === 'alert') return 'text-[var(--warning)]';
  if (type === 'student') return 'text-[var(--blue-mid)]';
  return 'text-[var(--navy-deep)]';
}

/* ---------- Main ---------- */

export function ActivityFeed({ tasks, activities }: ActivityFeedProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {/* Upcoming Tasks */}
      <Card variant="default" className="p-4 md:p-5 lg:px-6">
        <div className="flex items-center justify-between mb-3.5">
          <SectionMarker label="Upcoming Tasks" color="navy" />
          <span className="font-mono text-[10px] text-[var(--text-muted)]">{tasks.length}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {tasks.map((t, i) => (
            <div
              key={i}
              onClick={() => router.push('/questions/review')}
              className="p-2.5 rounded-lg bg-[var(--parchment)] border border-transparent cursor-pointer transition-all duration-150 hover:border-[var(--blue-mid)] first:border-[var(--border-light)]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-sans text-[13px] font-medium text-[var(--text-primary)] leading-[1.4]">
                  {t.title}
                </span>
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                  style={{ background: priorityColor(t.priority) }}
                />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">
                  {t.course}
                </span>
                <span
                  className={`font-sans text-[11px] ${t.due === 'Today' ? 'text-[var(--danger)] font-semibold' : 'text-[var(--text-muted)]'}`}
                >
                  {t.due}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card variant="default" className="p-4 md:p-5 lg:px-6">
        <div className="flex items-center justify-between mb-3.5">
          <SectionMarker label="Recent Activity" color="green-dark" />
          <button
            onClick={() => router.push('/analytics')}
            className="font-sans text-xs font-semibold text-[var(--blue-mid)] bg-transparent border-none cursor-pointer"
          >
            View all &rarr;
          </button>
        </div>
        <div className="flex flex-col">
          {activities.map((a, i) => (
            <div
              key={i}
              className={`flex gap-2.5 py-2.5 ${i > 0 ? 'border-t border-[var(--border-light)]' : ''}`}
            >
              <div
                className={`w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center font-serif text-xs ${activityBg(a.type)} ${activityColor(a.type)}`}
              >
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[13px] text-[var(--text-secondary)] leading-[1.45] mb-0.5">
                  {a.text}
                </p>
                <span className="font-mono text-[9px] text-[var(--text-muted)] tracking-wider">
                  {a.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
