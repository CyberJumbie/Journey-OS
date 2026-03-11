'use client';

/**
 * KPI BOOKMARK -- Navy-deep welcome strip with 4 StatCards
 *
 * Top section of faculty dashboard. Contains greeting, summary text,
 * generate button, and 4 inverted StatCards with sparklines.
 * Organism level: composes StatCard molecules + WovenField atom.
 */

import { useRouter } from 'next/navigation';
import { WovenField } from '@/components/atoms/WovenField';
import { StatCard } from '@/components/molecules/StatCard';

interface KPI {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  sparkline: number[];
}

interface KPIBookmarkProps {
  userName: string;
  summary: string;
  kpis: KPI[];
}

export function KPIBookmark({ userName, summary, kpis }: KPIBookmarkProps) {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden bg-[var(--navy-deep)] rounded-xl p-5 md:p-7 mb-5 md:mb-6">
      <WovenField color="#ffffff" opacity={0.05} density={12} />
      <div className="relative z-[1]">
        {/* Greeting row */}
        <div className="flex items-start justify-between flex-wrap gap-3 mb-5 md:mb-6">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="font-mono text-[9px] text-[var(--blue-pale)] tracking-widest uppercase opacity-70">
                FACULTY OVERVIEW
              </span>
            </div>
            <h2 className="font-serif text-xl md:text-2xl font-bold text-white leading-tight">
              Good afternoon, {userName}
            </h2>
            <p className="font-sans text-sm text-[var(--blue-pale)] opacity-80 mt-1">
              {summary}
            </p>
          </div>
          <button
            onClick={() => router.push('/generation/wizard')}
            className="hidden md:block font-sans text-[13px] font-semibold bg-white/[0.12] text-white border border-white/[0.15] rounded-md px-[18px] py-[9px] cursor-pointer transition-all duration-200 backdrop-blur-sm hover:bg-white/[0.18]"
          >
            + Generate Items
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-3.5">
          {kpis.map((k) => (
            <StatCard
              key={k.label}
              label={k.label}
              value={k.value}
              change={k.change}
              trend={k.trend}
              variant="inverted"
              sparkline={k.sparkline}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
