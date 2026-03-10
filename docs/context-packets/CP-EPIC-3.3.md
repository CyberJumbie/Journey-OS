# CP-EPIC-3.3 — Faculty Dashboard + Coverage Visualization (Weeks 21–22)
**Stories:** P3-011 · P3-012 · P3-013 · P3-014
**Auto-loaded by:** `/story P3-01N` where N = 1–4

---

## What This Epic Builds

Wires the faculty dashboard to real data, builds the D3 force-directed coverage map (new screen, not in prototype), wires the per-course detail view, and applies the full design system across all screens.

**Exit gate:** Dashboard shows real-time coverage state. D3 coverage map renders with colored nodes. Design system consistently applied.

---

## Prerequisites

- P3-007: USMLE heatmap data available
- P3-008: Gap priorities available
- P3-009: PageRank scores on SubConcept nodes
- P2-021: Generation history available

---

## Dashboard API Response

Endpoint: `GET /api/v1/dashboard`

```typescript
// Must match 06_SCREEN_BACKEND_MAP.md exactly
interface FacultyDashboardResponse {
  stats: {
    total_items: number;
    approved_items: number;
    approval_rate: number;      // 0.0–1.0
    coverage_score: number;     // avg coverage pct across courses (0–100)
    active_students: number;    // hardcode 0 until Phase 5
    sparklines: number[][];     // [[7-day trend for items], [7-day trend for approvals]]
    changes: string[];          // ["+12 this week", "+5% approval rate"]
  };
  courses: {
    id: string; code: string; name: string;
    coverage: number; question_count: number; status: string;
  }[];
  recent_activity: {
    id: string; type: 'generated' | 'approved' | 'rejected';
    description: string; course_code: string; created_at: string;
  }[];
  top_gaps: {
    system: string; discipline: string; priorityScore: number; itemCount: number;
  }[];
}
```

Backend implementation strategy — single JOIN query:
```typescript
// dashboard.service.ts
async getDashboardData(userId: string): Promise<FacultyDashboardResponse> {
  const [stats, courses, activity, gaps] = await Promise.all([
    this.analyticsRepo.getItemStats(userId),
    this.courseRepo.getCoursesForUser(userId),
    this.generationLogRepo.getRecentActivity(userId, 10),
    this.analyticsRepo.getTopGaps(5),
  ]);
  // Assemble and return
}
```

---

## D3 Force Graph Implementation

```typescript
// frontend/src/components/organisms/ForceGraph/ForceGraph.tsx

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

export function ForceGraph({ data }: { data: CoverageGraphData }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current!.clientWidth;
    const height = svgRef.current!.clientHeight;

    // Node color by question count
    const colorScale = (count: number) => {
      if (count >= 2) return '#69a338';   // green — covered
      if (count === 1) return '#f59e0b';  // amber — partial
      return '#d32f2f';                   // red — gap
    };

    // Node size by pagerank
    const sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(data.nodes, d => d.pagerank) || 1])
      .range([4, 20]);

    // Force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(60))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => sizeScale(d.pagerank) + 2));

    // Render edges
    const link = svg.append('g').selectAll('line')
      .data(data.edges)
      .enter().append('line')
      .attr('stroke', '#d1d5db').attr('stroke-width', 1);

    // Render nodes
    const node = svg.append('g').selectAll('circle')
      .data(data.nodes)
      .enter().append('circle')
      .attr('r', d => sizeScale(d.pagerank))
      .attr('fill', d => colorScale(d.questionCount))
      .attr('stroke', '#fff').attr('stroke-width', 1.5)
      .call(d3.drag()   // drag to explore
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded));

    // Tick update
    simulation.on('tick', () => {
      link.attr('x1', d => (d.source as any).x)
          .attr('y1', d => (d.source as any).y)
          .attr('x2', d => (d.target as any).x)
          .attr('y2', d => (d.target as any).y);
      node.attr('cx', d => (d as any).x)
          .attr('cy', d => (d as any).y);
    });

    return () => simulation.stop();
  }, [data]);

  return <svg ref={svgRef} width="100%" height="600px" />;
}
```

Coverage graph API endpoint:
```cypher
// GET /api/v1/analytics/coverage-graph
MATCH (sc:SubConcept)
OPTIONAL MATCH (sc)-[:MAPS_TO]->(sys:USMLE_System)
OPTIONAL MATCH (ai:AssessmentItem {status: 'approved'})-[:TARGETS]->(sc)
RETURN
  sc.uuid AS id,
  sc.name AS name,
  coalesce(sc.pagerank, 0.1) AS pagerank,
  count(DISTINCT ai) AS questionCount,
  coalesce(sys.name, 'Unknown') AS usmleSystem
ORDER BY sc.pagerank DESC
LIMIT 500   // cap at 500 nodes for performance
```

---

## Design Token CSS Variables

```css
/* frontend/src/styles/tokens.css */
:root {
  /* Surfaces */
  --surface-background: #f5f3ef;
  --surface-panel:      #faf9f6;
  --surface-content:    #ffffff;
  --surface-inverted:   #002c76;

  /* Brand */
  --color-navy:   #002c76;
  --color-blue:   #2b71b9;
  --color-green:  #69a338;
  --color-red:    #d32f2f;
  --color-amber:  #f59e0b;

  /* Text */
  --color-text-primary:   #002c76;
  --color-text-secondary: #4b5563;
  --color-border:         #d1d5db;

  /* Typography */
  --font-heading: 'Lora', serif;
  --font-body:    'Source Sans 3', sans-serif;
  --font-mono:    'DM Mono', monospace;

  /* Layout */
  --sidebar-width-collapsed: 72px;
  --sidebar-width-expanded:  240px;
  --content-max-width:       1200px;
}
```

---

## New Files (Epic 3.3)

```
frontend/src/hooks/useDashboard.ts
frontend/src/hooks/useCoverageGraph.ts
frontend/src/hooks/useCourseDetail.ts
frontend/src/components/templates/DashboardTemplate/DashboardTemplate.tsx
frontend/src/components/organisms/Sidebar/Sidebar.tsx
frontend/src/components/organisms/AppHeader/AppHeader.tsx
frontend/src/components/organisms/ForceGraph/ForceGraph.tsx
frontend/src/components/molecules/ConceptTooltip/ConceptTooltip.tsx
frontend/src/components/organisms/ConceptDetailPanel/ConceptDetailPanel.tsx
frontend/src/styles/tokens.css
frontend/src/app/(faculty)/analytics/coverage-map/page.tsx
backend/src/controllers/dashboard.controller.ts
backend/src/services/dashboard.service.ts
backend/src/routes/dashboard.routes.ts
backend/src/controllers/course-detail.controller.ts
```

---

## Smoke Tests

```bash
# 1. Dashboard data loads
curl "localhost:3001/api/v1/dashboard" -H "Authorization: Bearer $JWT" | jq '{stats, courses: (.courses | length), top_gaps: (.top_gaps | length)}'
# Expected: stats non-null, ≥1 course, 5 top_gaps

# 2. Coverage map renders
# Navigate to /analytics/coverage-map
# Check: colored nodes appear (red for gaps), tooltip on hover, drag-to-explore works

# 3. Course detail
curl "localhost:3001/api/v1/courses/medi-531/detail" -H "Authorization: Bearer $JWT" | jq '{coverage_percentage, weeks: (.weeks | length)}'
# Expected: coverage_percentage 0–100, weeks array non-empty

# 4. Design system
# Inspect any page: --surface-background applied to body, Lora on h1/h2, DM Mono on badges
```
