---
name: aggregation-dashboard-rpc-pattern
tags: [dashboard, supabase, rpc, aggregation, parallel, recharts]
story: STORY-SA-9
date: 2026-02-20
---
# Aggregation Dashboard via Parallel RPC Functions

## Problem
Dashboard detail views need data from multiple tables (metrics, breakdowns,
timelines, charts). Sequential queries are slow. Some tables may not exist
yet in early development phases. Inline aggregation SQL in service code is
hard to maintain and test.

## Solution
1. Create dedicated Postgres RPC functions for each aggregation query.
2. Call all RPC functions in parallel via `Promise.all()`.
3. Wrap each call in try/catch to return safe defaults (0, [], null) when
   the underlying table doesn't exist yet.
4. For chart data (monthly trends), fill missing months with `value: 0`
   to produce continuous series for Recharts.

```typescript
// Service method — parallel aggregation with graceful degradation
async getDetail(entityId: string): Promise<EntityDetail> {
  // 1. Fetch the primary record (fail hard if not found)
  const { data, error } = await this.#supabase
    .from("entities")
    .select("*")
    .eq("id", entityId)
    .single();

  if (error || !data) throw new EntityNotFoundError(entityId);

  // 2. Run aggregation queries in parallel
  const [metrics, breakdown, timeline, trends] = await Promise.all([
    this.#getMetrics(entityId),
    this.#getBreakdown(entityId),
    this.#getTimeline(entityId),
    this.#getMonthlyTrends(entityId),
  ]);

  return { ...data, metrics, breakdown, timeline, trends };
}

// Each aggregation method wraps in try/catch
async #getMetrics(entityId: string): Promise<Metrics> {
  try {
    const { data, error } = await this.#supabase.rpc(
      "get_metrics_by_entity",
      { p_entity_id: entityId },
    );
    if (error) return DEFAULT_METRICS;
    return mapMetrics(data);
  } catch {
    return DEFAULT_METRICS; // Table may not exist yet
  }
}
```

```sql
-- RPC function with SECURITY DEFINER for aggregation
CREATE OR REPLACE FUNCTION get_user_breakdown_by_institution(
  p_institution_id UUID
) RETURNS TABLE(role TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
    SELECT p.role, COUNT(*) as count
    FROM profiles p
    WHERE p.institution_id = p_institution_id
    GROUP BY p.role
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```typescript
// Monthly trend gap-filling for continuous charts
#fillMissingMonths(data: MonthlyTrend[]): MonthlyTrend[] {
  const months: MonthlyTrend[] = [];
  const dataMap = new Map(data.map((d) => [d.month, d.value]));
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month, value: dataMap.get(month) ?? 0 });
  }

  return months;
}
```

## When to Use
- Any detail/dashboard page that aggregates data from 3+ tables.
- When some data sources may not exist yet (early development).
- When chart data needs continuous time series.

## When NOT to Use
- Simple CRUD views with data from a single table.
- When all tables are guaranteed to exist and have data.
- When aggregation can be done with a single Supabase query + joins.

## Source Reference
[STORY-SA-9 § Institution Detail View — 7 RPC functions, parallel execution]
