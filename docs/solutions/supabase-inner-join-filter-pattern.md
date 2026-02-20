---
name: supabase-inner-join-filter-pattern
tags: [supabase, query, join, filter, inner-join]
story: STORY-IA-7
date: 2026-02-20
---
# Supabase Inner-Join Filter Pattern

## Problem
Some tables don't have a direct FK to the entity you want to filter by.
For example, `sessions` has `section_id` but no `course_id`. To filter
sessions by course, you must join through `sections`.

## Solution
Use `!inner` join syntax in the `.select()` string and filter on the
joined table's columns via `.eq("joined_table.column", value)`.

```typescript
// Filter sessions by course_id (sessions → sections → courses)
const { data, error } = await supabase
  .from("sessions")
  .select("id, title, day_of_week, start_time, end_time, week_number, section:sections!inner(title, course_id)")
  .eq("sections.course_id", courseId)
  .eq("week_number", weekNumber);
```

Key details:
- `sections!inner` performs an INNER JOIN — rows without a matching section are excluded.
- The alias `section:sections!inner(...)` returns the joined row as a nested `section` object.
- `.eq("sections.course_id", courseId)` filters on the joined table's column.
- Apply all `.eq()` filters BEFORE `.order()` and `.range()` (terminal methods).

## Getting max value through a join
```typescript
// Get max week_number for a course's sessions
const { data } = await supabase
  .from("sessions")
  .select("week_number, section:sections!inner(course_id)")
  .eq("sections.course_id", courseId)
  .order("week_number", { ascending: false })
  .limit(1)
  .maybeSingle();

const totalWeeks = data?.week_number ?? 0;
```

## When to Use
- Any query where the target table lacks a direct FK to the filter entity.
- Common in hierarchical schemas: Institution > Program > Course > Section > Session.

## When NOT to Use
- The target table has a direct FK to the filter column — just use `.eq()` directly.
- You need a LEFT JOIN (use `sections(...)` without `!inner`).

## Source Reference
[STORY-IA-7 § ScheduleService.getWeeklySchedule], [STORY-F-11 § hierarchy schema]
