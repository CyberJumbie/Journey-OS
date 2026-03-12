'use client';

import type { ItemStatus } from '@journey-os/shared-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCourses, type CourseListItem } from '@/hooks/useCourses';

interface FilterBarProps {
  courseId: string | undefined;
  status: ItemStatus | undefined;
  onCourseChange: (value: string | undefined) => void;
  onStatusChange: (value: ItemStatus | undefined) => void;
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending_review', label: 'Pending Review' },
];

export default function FilterBar({
  courseId, status, onCourseChange, onStatusChange,
}: FilterBarProps) {
  const { data: courses } = useCourses();

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select
        value={courseId ?? 'all'}
        onValueChange={(v) => onCourseChange(v === 'all' ? undefined : v)}
      >
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="All Courses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Courses</SelectItem>
          {(courses ?? []).map((c: CourseListItem) => (
            <SelectItem key={c.id} value={c.id}>{c.code} - {c.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={status ?? 'all'}
        onValueChange={(v) => onStatusChange(v === 'all' ? undefined : v as ItemStatus)}
      >
        <SelectTrigger className="w-full sm:w-[180px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
