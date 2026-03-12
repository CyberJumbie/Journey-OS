'use client';

import type { ItemStatus } from '@journey-os/shared-types';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface QuestionRowOption {
  id: string;
  label: string;
  option_text: string | null;
  is_correct: boolean;
  distractor_rationale: string | null;
}

interface QuestionRowProps {
  vignette: string | null;
  stem: string | null;
  bloomLevel: number | null;
  usmleSystem: string | null;
  status: ItemStatus;
  createdAt: string;
  options: QuestionRowOption[];
  expanded: boolean;
  onToggle: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  pending_review: 'bg-amber-100 text-amber-700',
  retired: 'bg-gray-200 text-gray-500',
};

function truncate(text: string | null, max: number): string {
  if (!text) return '--';
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

export default function QuestionRow({
  vignette, stem, bloomLevel, usmleSystem, status,
  createdAt, options, expanded, onToggle,
}: QuestionRowProps) {
  const dateStr = new Date(createdAt).toLocaleDateString();
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-[var(--parchment)] transition-colors border-b border-[var(--border-light)]"
      >
        <td className="px-4 py-3 text-sm text-[var(--ink)] max-w-[300px]">
          {truncate(vignette, 100)}
        </td>
        <td className="px-4 py-3 text-sm text-[var(--gray-600)] max-w-[240px]">
          {truncate(stem, 80)}
        </td>
        <td className="px-4 py-3 text-center">
          <Badge variant="outline" className="font-mono text-xs">
            {bloomLevel ?? '--'}
          </Badge>
        </td>
        <td className="px-4 py-3 text-xs text-[var(--gray-600)]">
          {usmleSystem ?? '--'}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[status] ?? ''}`}>
            {status}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-[var(--gray-600)]">{dateStr}</td>
        <td className="px-4 py-3">
          <Chevron className="size-4 text-[var(--gray-600)]" />
        </td>
      </tr>
      {expanded && (
        <tr className="bg-white border-b border-[var(--border-light)]">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-mono uppercase text-[var(--gray-600)] mb-1">Vignette</p>
                <p className="font-serif text-sm leading-relaxed text-[var(--ink)]">{vignette ?? '--'}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-[var(--gray-600)] mb-1">Stem</p>
                <p className="font-sans text-sm font-semibold text-[var(--ink)]">{stem ?? '--'}</p>
              </div>
              <div>
                <p className="text-xs font-mono uppercase text-[var(--gray-600)] mb-1">Options</p>
                <ul className="space-y-1">
                  {options.map((opt) => (
                    <li key={opt.id} className="flex items-start gap-2 text-sm">
                      <span className={`font-mono font-semibold ${opt.is_correct ? 'text-green-700' : 'text-[var(--gray-600)]'}`}>
                        {opt.label}.
                      </span>
                      <span className={opt.is_correct ? 'text-green-700 font-medium' : 'text-[var(--ink)]'}>
                        {opt.option_text ?? '--'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
