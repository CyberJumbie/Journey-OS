'use client';

import { useState } from 'react';
import type { ItemStatus } from '@journey-os/shared-types';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAssessmentItems, type ItemFilters } from '@/hooks/useAssessmentItems';
import QuestionRow from '@/components/molecules/QuestionRow';
import FilterBar from './FilterBar';

interface QuestionTableProps {
  initialCourseId?: string;
  initialStatus?: ItemStatus;
}

const PAGE_SIZE = 20;

export default function QuestionTable({ initialCourseId, initialStatus }: QuestionTableProps) {
  const [courseId, setCourseId] = useState<string | undefined>(initialCourseId);
  const [status, setStatus] = useState<ItemStatus | undefined>(initialStatus);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filters: ItemFilters = { courseId, status, page, limit: PAGE_SIZE };
  const { data, isLoading, error } = useAssessmentItems(filters);

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const handleCourseChange = (value: string | undefined) => {
    setCourseId(value);
    setPage(1);
  };

  const handleStatusChange = (value: ItemStatus | undefined) => {
    setStatus(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border-light)] p-4">
        <FilterBar
          courseId={courseId}
          status={status}
          onCourseChange={handleCourseChange}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border-light)] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-[var(--blue-mid)]" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Failed to load items. Please try again.</p>
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="size-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No assessment items found.</p>
            <p className="text-sm text-gray-500 mt-1">
              Generate questions in the Quest Workbench to see them here.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--cream)] border-b border-[var(--border-light)]">
                  <tr>
                    <th className="px-4 py-3 text-xs font-mono uppercase text-[var(--gray-600)]">Vignette</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase text-[var(--gray-600)]">Stem</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase text-[var(--gray-600)] text-center">Bloom</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase text-[var(--gray-600)]">System</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase text-[var(--gray-600)]">Status</th>
                    <th className="px-4 py-3 text-xs font-mono uppercase text-[var(--gray-600)]">Date</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <QuestionRow
                      key={item.id}
                      vignette={item.vignette}
                      stem={item.stem}
                      bloomLevel={item.bloom_level}
                      usmleSystem={item.usmle_system}
                      status={item.status}
                      createdAt={item.created_at}
                      options={item.options ?? []}
                      expanded={expandedId === item.id}
                      onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-light)]">
              <p className="text-sm text-[var(--gray-600)]">
                {data.total} item{data.total !== 1 ? 's' : ''} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-sm text-[var(--gray-600)]">
                  Page {page} of {totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
