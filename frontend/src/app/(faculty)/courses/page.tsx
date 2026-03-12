'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  BookOpen,
  FileText,
  ArrowUpDown,
  Layers,
  Loader2,
} from 'lucide-react';
import { useCourses } from '@/hooks/useCourses';
import type { CourseListItem } from '@/hooks/useCourses';
import CourseStats from '@/components/molecules/CourseStats/CourseStats';

export default function AllCourses() {
  const router = useRouter();
  const { data: courses, isLoading, error } = useCourses();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'code' | 'items'>('title');

  const filteredCourses = (courses ?? [])
    .filter((course: CourseListItem) => {
      const q = searchQuery.toLowerCase();
      return (
        course.title.toLowerCase().includes(q) ||
        course.code.toLowerCase().includes(q)
      );
    })
    .sort((a: CourseListItem, b: CourseListItem) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'code') return a.code.localeCompare(b.code);
      return b.item_count - a.item_count;
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-[var(--blue-mid)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load courses. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">All Courses</h1>
          <p className="text-sm text-gray-600 mt-1">
            Select a course to open the Quest Workbench
          </p>
        </div>
      </div>

      {/* Stats */}
      <CourseStats
        courseCount={courses?.length ?? 0}
        itemCount={(courses ?? []).reduce((sum: number, c: CourseListItem) => sum + c.item_count, 0)}
        subconceptCount={(courses ?? []).reduce((sum: number, c: CourseListItem) => sum + c.subconcept_count, 0)}
      />

      {/* Filters and Search */}
      <div className="bg-white rounded-[--radius-xl] border border-[--border-light] p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search courses by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <ArrowUpDown className="size-4" />
                Sort by
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy('title')}>
                Course Title
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('code')}>
                Course Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy('items')}>
                Item Count
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <BookOpen className="size-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">No courses yet. Upload a syllabus to get started.</p>
          <p className="text-sm text-gray-500">
            Courses appear here once your institution has been set up.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCourses.map((course: CourseListItem) => (
            <div
              key={course.id}
              onClick={() => router.push(`/workbench?courseId=${course.id}`)}
              className="bg-white rounded-[--radius-xl] border border-[--border-light] p-5 cursor-pointer transition-all hover:border-[--blue-mid] hover:shadow-md"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="font-mono text-[10px] tracking-wider uppercase text-white bg-[var(--navy)] px-2 py-0.5 rounded">
                  {course.code}
                </span>
                {course.term && (
                  <span className="text-xs text-[--text-secondary]">{course.term}</span>
                )}
              </div>
              <h3 className="font-serif text-base font-semibold text-[var(--navy-deep)] mb-4 line-clamp-2">
                {course.title}
              </h3>
              <div className="flex items-center gap-4 text-xs text-[--text-muted]">
                <div className="flex items-center gap-1.5">
                  <Layers className="size-3.5" />
                  <span>{course.subconcept_count} concepts</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  <span>{course.item_count} items</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
