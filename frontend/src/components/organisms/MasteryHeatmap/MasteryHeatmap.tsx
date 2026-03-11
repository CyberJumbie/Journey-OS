'use client';

/**
 * MASTERY HEATMAP -- Topic mastery grid visualization
 *
 * Displays a grid of MasteryCell atoms showing cohort mastery per topic,
 * with a color legend and summary bar.
 * Organism level: composes Card + SectionMarker + MasteryCell.
 */

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { SectionMarker } from '@/components/molecules/SectionMarker';
import { MasteryCell } from '@/components/atoms/MasteryCell';

interface MasteryTopic {
  name: string;
  mastery: number;
}

interface MasteryHeatmapProps {
  title: string;
  topics: MasteryTopic[];
  belowThresholdCount: number;
}

const LEGEND = [
  { className: 'bg-[var(--green)]', label: '>70%' },
  { className: 'bg-[var(--blue-mid)]', label: '40-70%' },
  { className: 'bg-[var(--blue-pale)]', label: '15-40%' },
  { className: 'bg-[var(--border-light)]', label: '<15%' },
] as const;

export function MasteryHeatmap({ title, topics, belowThresholdCount }: MasteryHeatmapProps) {
  const router = useRouter();

  return (
    <Card variant="default" className="p-4 md:p-5 lg:px-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <SectionMarker label="Cohort Mastery" color="green" className="mb-1" />
          <h3 className="font-serif text-base md:text-lg font-bold text-[var(--navy-deep)]">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {LEGEND.map((l, i) => (
            <div key={i} className={`items-center gap-1 ${i > 1 ? 'hidden md:flex' : 'flex'}`}>
              <div className={`w-2 h-2 rounded-sm ${l.className}`} />
              <span className="font-mono text-[8px] text-[var(--text-muted)] tracking-wider">
                {l.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
        {topics.map((t) => (
          <div key={t.name}>
            <MasteryCell value={t.mastery} label={t.name} />
            <div className="font-mono text-[8px] text-[var(--text-muted)] text-center mt-1 tracking-wider truncate">
              {t.name}
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      {belowThresholdCount > 0 && (
        <div className="mt-4 p-3 bg-[var(--parchment)] rounded-lg flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-[5px] h-[5px] rounded-[1px] bg-[var(--warning)]" />
            <span className="font-sans text-[13px] text-[var(--text-secondary)]">
              <strong className="text-[var(--text-primary)]">{belowThresholdCount} topics</strong> below mastery threshold
            </span>
          </div>
          <button
            onClick={() => router.push('/analytics')}
            className="font-sans text-xs font-semibold text-[var(--blue-mid)] bg-transparent border-none cursor-pointer"
          >
            View details &rarr;
          </button>
        </div>
      )}
    </Card>
  );
}
