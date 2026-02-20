# STORY-IA-6 Brief: Framework List Page

> **Self-contained implementation brief.** This document contains EVERYTHING needed to implement this story. Zero external lookups required.

---

## 0. Lane & Priority

```yaml
story_id: STORY-IA-6
old_id: S-IA-17-1
epic: E-17 (Framework Browser UI)
feature: F-08 (Framework Browser)
sprint: 3
lane: institutional_admin
lane_priority: 2
within_lane_order: 6
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
  - STORY-U-12 (universal) — Framework Seeding (data to display)
blocks:
  - STORY-IA-19 — Framework Search
  - STORY-IA-20 — Setup Wizard Step
  - STORY-IA-21 — Hierarchy Tree View
personas_served: [institutional_admin, superadmin]
```

## 1. Summary

**What to build:** A framework list page at `/institution/frameworks` displaying all 8 educational frameworks as cards in a grid layout. Each card shows the framework name, description, node count, hierarchy depth, and icon. Cards are sorted by node count descending. Clicking a card navigates to the hierarchy tree view (STORY-IA-21). A `FrameworkService` on the server queries Neo4j for framework statistics (node counts, hierarchy depths). The endpoint is protected by RBAC requiring `InstitutionalAdmin` or `SuperAdmin` roles.

**Parent epic:** E-17 (Framework Browser UI) under F-08 (Framework Browser). This is the entry point for exploring educational frameworks.

**User flows satisfied:**
- UF-13 (Framework Exploration) — browse available frameworks

**Personas:** Institutional Admin (primary), SuperAdmin (secondary).

**Why this story matters:** STORY-IA-6 is the gateway to framework exploration and blocks three downstream stories: IA-19 (Framework Search), IA-20 (Setup Wizard Step), and IA-21 (Hierarchy Tree View). Without it, admins cannot discover or browse the seeded educational frameworks.

## 2. Task Breakdown

| # | Task | File(s) | Action |
|---|------|---------|--------|
| 1 | Define framework summary types | `packages/types/src/frameworks/framework-summary.types.ts` | CREATE |
| 2 | Update frameworks barrel export | `packages/types/src/frameworks/index.ts` | UPDATE |
| 3 | Implement FrameworkService | `apps/server/src/services/framework/framework.service.ts` | CREATE |
| 4 | Implement FrameworkController | `apps/server/src/controllers/framework/framework.controller.ts` | CREATE |
| 5 | Register frameworks route with RBAC | `apps/server/src/index.ts` | UPDATE |
| 6 | Create FrameworkCard component | `apps/web/src/components/framework/framework-card.tsx` | CREATE |
| 7 | Create FrameworkList component | `apps/web/src/components/framework/framework-list.tsx` | CREATE |
| 8 | Create frameworks page | `apps/web/src/app/(protected)/institution/frameworks/page.tsx` | CREATE |
| 9 | Write FrameworkService tests | `apps/server/src/services/framework/__tests__/framework.service.test.ts` | CREATE |
| 10 | Write FrameworkController tests | `apps/server/src/controllers/framework/__tests__/framework.controller.test.ts` | CREATE |

## 3. Data Model (inline, complete)

### `packages/types/src/frameworks/framework-summary.types.ts`

```typescript
/**
 * Summary data for a single educational framework.
 * Displayed as a card in the framework list page.
 */
export interface FrameworkSummary {
  readonly framework_key: string;
  readonly name: string;
  readonly description: string;
  readonly node_count: number;
  readonly hierarchy_depth: number;
  readonly icon: string;
}

/**
 * Response shape for GET /api/v1/institution/frameworks.
 */
export interface FrameworkListResponse {
  readonly frameworks: readonly FrameworkSummary[];
}
```

### Framework Registry (hardcoded metadata)

The 8 frameworks and their Neo4j labels:

| Key | Name | Neo4j Label | Icon |
|-----|------|-------------|------|
| `usmle_systems` | USMLE Systems | `USMLE_System` | `stethoscope` |
| `usmle_disciplines` | USMLE Disciplines | `USMLE_Discipline` | `book-open` |
| `usmle_tasks` | USMLE Physician Tasks | `USMLE_Task` | `clipboard-list` |
| `lcme` | LCME Standards | `LCME_Standard` | `shield-check` |
| `acgme` | ACGME Competencies | `ACGME_Competency` | `award` |
| `aamc` | AAMC Competencies | `AAMC_Competency` | `graduation-cap` |
| `epa_ume` | EPA/UME Competencies | `EPA_UME_Competency` | `target` |
| `bloom_miller` | Bloom/Miller Taxonomy | `Bloom_Miller_Level` | `layers` |

This registry is defined as a constant in the FrameworkService. Node counts and hierarchy depths are queried dynamically from Neo4j.

## 4. Database Schema (inline, complete)

**No new database schema required for STORY-IA-6.**

Framework data lives in Neo4j, seeded by STORY-U-7 (USMLE) and STORY-U-12 (remaining frameworks). This story only reads from Neo4j — no writes, no Supabase tables.

### Neo4j Query Pattern

For each framework label, two queries are needed:
1. **Node count:** `MATCH (n:LABEL) RETURN count(n) AS count`
2. **Hierarchy depth:** `MATCH path = (root:LABEL)-[:HAS_TOPIC*]->(leaf:LABEL) WHERE NOT ()-[:HAS_TOPIC]->(root) AND NOT (leaf)-[:HAS_TOPIC]->() RETURN max(length(path)) + 1 AS depth`

If a framework has no hierarchical relationships, depth defaults to 1 (flat list).

## 5. API Contract (complete request/response)

### GET /api/v1/institution/frameworks

**Auth:** Bearer token required. RBAC: `AuthRole.INSTITUTIONAL_ADMIN` or `AuthRole.SUPERADMIN`.

**Request:**
```
GET /api/v1/institution/frameworks
Authorization: Bearer <jwt>
```

**200 Success:**
```json
{
  "data": {
    "frameworks": [
      {
        "framework_key": "usmle_systems",
        "name": "USMLE Systems",
        "description": "Organ systems tested on USMLE Step exams, organizing medical knowledge by body system.",
        "node_count": 200,
        "hierarchy_depth": 4,
        "icon": "stethoscope"
      },
      {
        "framework_key": "lcme",
        "name": "LCME Standards",
        "description": "Liaison Committee on Medical Education accreditation standards for medical school programs.",
        "node_count": 93,
        "hierarchy_depth": 3,
        "icon": "shield-check"
      },
      {
        "framework_key": "epa_ume",
        "name": "EPA/UME Competencies",
        "description": "Entrustable Professional Activities for Undergraduate Medical Education.",
        "node_count": 58,
        "hierarchy_depth": 2,
        "icon": "target"
      }
    ]
  },
  "error": null
}
```

**401 Unauthorized:**
```json
{
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

**403 Forbidden:**
```json
{
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

**500 Internal Error (Neo4j unreachable):**
```json
{
  "data": null,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again."
  }
}
```

## 6. Frontend Spec

### Route: `/institution/frameworks`

**Layout:** `(protected)` group layout — sidebar navigation, top bar with user info.

### Component Hierarchy
```
app/(protected)/institution/frameworks/page.tsx (Server Component — metadata only)
  └── FrameworkList (Client Component — "use client")
        ├── Loading Skeleton (grid of 8 skeleton cards)
        ├── Empty State (no frameworks seeded)
        └── Framework Card Grid
            └── FrameworkCard (one per framework)
                ├── Icon
                ├── Name
                ├── Description (truncated)
                ├── Node Count badge
                └── Hierarchy Depth badge
```

### FrameworkCard Props

```typescript
interface FrameworkCardProps {
  readonly frameworkKey: string;
  readonly name: string;
  readonly description: string;
  readonly nodeCount: number;
  readonly hierarchyDepth: number;
  readonly icon: string;
}
```

### FrameworkList Internal States

```typescript
type ListState = "loading" | "loaded" | "empty" | "error";
```

### States
1. **Loading:** Grid of 8 skeleton cards with pulsing animation
2. **Loaded:** Card grid with framework data, sorted by node_count descending
3. **Empty:** Centered message: "No frameworks have been seeded yet." with link to documentation
4. **Error:** Error banner with retry button

### Design Tokens
- Card: white bg, rounded-lg, shadow-sm, p-6, hover:shadow-md transition
- Card border: border-gray-200, hover:border-[#2b71b9]
- Icon: 40x40, text-[#2b71b9]
- Name: text-lg font-semibold text-gray-900
- Description: text-sm text-gray-600, line-clamp-2
- Badge (node count): bg-[#2b71b9]/10 text-[#2b71b9] text-xs px-2 py-1 rounded-full
- Badge (depth): bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full
- Grid: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6

### Navigation
- Clicking a card navigates to `/institution/frameworks/:frameworkKey` (STORY-IA-21)
- Cards use Next.js `Link` component for client-side navigation

## 7. Files to Create (exact paths, implementation order)

| # | Layer | Path | Action | Description |
|---|-------|------|--------|-------------|
| 1 | Types | `packages/types/src/frameworks/framework-summary.types.ts` | CREATE | FrameworkSummary, FrameworkListResponse |
| 2 | Types | `packages/types/src/frameworks/index.ts` | UPDATE | Add framework-summary exports |
| 3 | Service | `apps/server/src/services/framework/framework.service.ts` | CREATE | FrameworkService querying Neo4j |
| 4 | Controller | `apps/server/src/controllers/framework/framework.controller.ts` | CREATE | FrameworkController wrapping service |
| 5 | App | `apps/server/src/index.ts` | UPDATE | Register GET /api/v1/institution/frameworks |
| 6 | Molecule | `apps/web/src/components/framework/framework-card.tsx` | CREATE | FrameworkCard component |
| 7 | Organism | `apps/web/src/components/framework/framework-list.tsx` | CREATE | FrameworkList with fetch + grid |
| 8 | View | `apps/web/src/app/(protected)/institution/frameworks/page.tsx` | CREATE | Server component with metadata |
| 9 | Tests | `apps/server/src/services/framework/__tests__/framework.service.test.ts` | CREATE | Service unit tests |
| 10 | Tests | `apps/server/src/controllers/framework/__tests__/framework.controller.test.ts` | CREATE | Controller unit tests |

## 8. Dependencies

### Story Dependencies

| Story | Lane | Status | What It Provides |
|-------|------|--------|------------------|
| STORY-U-6 | universal | DONE | RbacMiddleware, AuthRole enum |
| STORY-U-12 | universal | PENDING | Framework seeding — data to display (USMLE already seeded by U-7) |

### NPM Packages (all already installed)

| Package | Version | Purpose |
|---------|---------|---------|
| `neo4j-driver` | ^5.x | Neo4j queries for framework stats |
| `express` | ^5.2.1 | Request/Response types |
| `vitest` | ^4.0.18 | Test runner |
| `next` | 16.1.6 | App Router, Link component |
| `react` | 19.2.3 | UI |
| `@journey-os/types` | workspace:* | Shared type definitions |

### Existing Files Required

| File | What It Provides |
|------|------------------|
| `packages/types/src/auth/auth.types.ts` | `ApiResponse` envelope type |
| `apps/server/src/middleware/rbac.middleware.ts` | `RbacMiddleware` with `require()` |
| `apps/server/src/middleware/auth.middleware.ts` | `AuthMiddleware` for JWT verification |
| `apps/server/src/config/neo4j.config.ts` | `Neo4jClientConfig` for driver access |
| `apps/server/src/errors/base.errors.ts` | `JourneyOSError` base class |
| `apps/server/src/index.ts` | Express app |

## 9. Test Fixtures (inline)

### Mock Framework Data

```typescript
import type { FrameworkSummary } from "@journey-os/types";

export const MOCK_FRAMEWORKS: readonly FrameworkSummary[] = [
  {
    framework_key: "usmle_systems",
    name: "USMLE Systems",
    description: "Organ systems tested on USMLE Step exams.",
    node_count: 200,
    hierarchy_depth: 4,
    icon: "stethoscope",
  },
  {
    framework_key: "lcme",
    name: "LCME Standards",
    description: "LCME accreditation standards for medical schools.",
    node_count: 93,
    hierarchy_depth: 3,
    icon: "shield-check",
  },
  {
    framework_key: "epa_ume",
    name: "EPA/UME Competencies",
    description: "Entrustable Professional Activities for UME.",
    node_count: 58,
    hierarchy_depth: 2,
    icon: "target",
  },
];
```

### Mock Neo4j Session

```typescript
export function mockNeo4jSession() {
  return {
    run: vi.fn(),
    close: vi.fn(),
  };
}

export function mockNeo4jDriver() {
  const session = mockNeo4jSession();
  return {
    driver: {
      session: vi.fn().mockReturnValue(session),
    },
    session,
  };
}
```

### Mock Express Objects

```typescript
import { Request, Response } from "express";

export function mockRequest(overrides?: Partial<Request>): Partial<Request> {
  return {
    method: "GET",
    headers: { authorization: "Bearer mock-jwt" },
    user: { id: "user-1", role: "institutional_admin", institution_id: "inst-1" },
    ...overrides,
  };
}

export function mockResponse(): Partial<Response> & { statusCode: number; body: unknown } {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: null,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(data: unknown) {
      res.body = data;
      return res as Response;
    },
  };
  return res;
}
```

## 10. API Test Spec (vitest — PRIMARY)

### `apps/server/src/services/framework/__tests__/framework.service.test.ts`

```
describe("FrameworkService")
  describe("getFrameworkList")
    it("returns array of FrameworkSummary for all 8 frameworks")
    it("queries Neo4j for node count per framework label")
    it("queries Neo4j for hierarchy depth per framework label")
    it("sorts frameworks by node_count descending")
    it("returns hierarchy_depth 1 for frameworks with no relationships")
    it("returns node_count 0 for frameworks with no nodes seeded")
    it("includes name, description, and icon from registry")
    it("closes Neo4j session after query completes")
    it("closes Neo4j session even when query fails")
    it("throws InternalError when Neo4j driver is unavailable")
```

### `apps/server/src/controllers/framework/__tests__/framework.controller.test.ts`

```
describe("FrameworkController")
  describe("listFrameworks")
    it("returns 200 with FrameworkListResponse for institutional_admin")
    it("returns 200 with FrameworkListResponse for superadmin")
    it("response body matches ApiResponse<FrameworkListResponse> shape")
    it("frameworks array is sorted by node_count descending")
    it("returns 500 INTERNAL_ERROR when service throws")
```

**Total: ~15 test cases** (exceeds minimum).

## 11. E2E Test Spec (Playwright — CONDITIONAL)

**Not applicable for this story.** The framework list is a read-only display page. E2E testing will be deferred to STORY-IA-21 (Hierarchy Tree View) when the full framework exploration journey (list + tree) is complete.

## 12. Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Framework list page exists at `/institution/frameworks` | Manual: navigate to page |
| AC-2 | All 8 framework cards displayed in a responsive grid | Manual: visual check |
| AC-3 | Each card shows name, description, node count, hierarchy depth, icon | Manual: visual check |
| AC-4 | Cards sorted by node count descending | Test: assert order in response |
| AC-5 | Clicking a card navigates to `/institution/frameworks/:frameworkKey` | Manual: click card |
| AC-6 | Loading skeleton shown during initial fetch | Manual: throttle network |
| AC-7 | Empty state shown when no frameworks are seeded | Test: mock empty response |
| AC-8 | Error state with retry button on fetch failure | Manual: disconnect network |
| AC-9 | RBAC: only InstitutionalAdmin and SuperAdmin can access | Test: other roles get 403 |
| AC-10 | `GET /api/v1/institution/frameworks` returns correct ApiResponse envelope | Test: assert shape |
| AC-11 | Neo4j session is properly closed after each request | Test: verify session.close() called |
| AC-12 | JS `#private` fields used (not TS `private`) | Code review |
| AC-13 | Constructor DI: Neo4j driver injected into FrameworkService | Code review |
| AC-14 | Custom error classes only (no raw throw new Error()) | Code review |
| AC-15 | 10+ API tests pass | Test suite: >=15 tests in vitest |

## 13. Source References

| Claim | Source | Section |
|-------|--------|---------|
| 8 educational frameworks | ARCHITECTURE_v10.md | Knowledge graph structure |
| USMLE seeded with 227 nodes across 4 levels | STORY-U-7 implementation | USMLESeeder |
| RBAC with AuthRole enum | STORY-U-6 implementation | RbacMiddleware.require() |
| Neo4j SCREAMING_SNAKE_CASE for labels with acronym prefix | CLAUDE.md | Architecture Rules |
| Framework browser route /institution/frameworks | ARCHITECTURE_v10.md | Frontend route structure |
| ApiResponse envelope: { data, error, meta? } | API_CONTRACT_v1.md | Conventions |
| Custom error classes only | CLAUDE.md | Architecture Rules |
| JS #private fields, constructor DI | CLAUDE.md | Architecture Rules (OOP) |
| Named exports only | CLAUDE.md | Architecture Rules |
| Neo4j env vars optional in zod, validated at instantiation | CLAUDE.md | Monorepo Conventions |

## 14. Environment Prerequisites

### Services Required

| Service | Purpose | Required |
|---------|---------|----------|
| Neo4j | Framework node counts and hierarchy depth queries | For manual testing only (mocked in tests) |

### Environment Variables

No new environment variables. Neo4j config is already set up:

**Server (`apps/server/.env`):**
- `NEO4J_URI` — already configured (optional in zod schema)
- `NEO4J_USER` — already configured
- `NEO4J_PASSWORD` — already configured

### Dev Setup

```bash
# From monorepo root
pnpm install
pnpm --filter @journey-os/types build   # build types first
pnpm --filter @journey-os/server test   # run server tests
```

## 15. Implementation Notes

### FrameworkService Design

```typescript
// apps/server/src/services/framework/framework.service.ts
import { Driver, Session } from "neo4j-driver";
import type { FrameworkSummary, FrameworkListResponse } from "@journey-os/types";

interface FrameworkRegistryEntry {
  readonly key: string;
  readonly name: string;
  readonly description: string;
  readonly label: string;
  readonly icon: string;
  readonly relationship: string;
}

const FRAMEWORK_REGISTRY: readonly FrameworkRegistryEntry[] = [
  {
    key: "usmle_systems",
    name: "USMLE Systems",
    description: "Organ systems tested on USMLE Step exams, organizing medical knowledge by body system.",
    label: "USMLE_System",
    icon: "stethoscope",
    relationship: "HAS_TOPIC",
  },
  {
    key: "usmle_disciplines",
    name: "USMLE Disciplines",
    description: "Medical disciplines and specialties assessed across USMLE Step examinations.",
    label: "USMLE_Discipline",
    icon: "book-open",
    relationship: "HAS_TOPIC",
  },
  {
    key: "usmle_tasks",
    name: "USMLE Physician Tasks",
    description: "Core physician tasks and competencies evaluated in USMLE assessments.",
    label: "USMLE_Task",
    icon: "clipboard-list",
    relationship: "HAS_TOPIC",
  },
  {
    key: "lcme",
    name: "LCME Standards",
    description: "Liaison Committee on Medical Education accreditation standards for medical school programs.",
    label: "LCME_Standard",
    icon: "shield-check",
    relationship: "HAS_TOPIC",
  },
  {
    key: "acgme",
    name: "ACGME Competencies",
    description: "Accreditation Council for Graduate Medical Education core competency domains.",
    label: "ACGME_Competency",
    icon: "award",
    relationship: "HAS_TOPIC",
  },
  {
    key: "aamc",
    name: "AAMC Competencies",
    description: "Association of American Medical Colleges competency framework for medical education.",
    label: "AAMC_Competency",
    icon: "graduation-cap",
    relationship: "HAS_TOPIC",
  },
  {
    key: "epa_ume",
    name: "EPA/UME Competencies",
    description: "Entrustable Professional Activities for Undergraduate Medical Education.",
    label: "EPA_UME_Competency",
    icon: "target",
    relationship: "HAS_TOPIC",
  },
  {
    key: "bloom_miller",
    name: "Bloom/Miller Taxonomy",
    description: "Combined Bloom's cognitive taxonomy and Miller's clinical competence pyramid.",
    label: "Bloom_Miller_Level",
    icon: "layers",
    relationship: "HAS_TOPIC",
  },
];

export class FrameworkService {
  readonly #driver: Driver;

  constructor(driver: Driver) {
    this.#driver = driver;
  }

  async getFrameworkList(): Promise<FrameworkListResponse> {
    const session: Session = this.#driver.session();

    try {
      const frameworks: FrameworkSummary[] = [];

      for (const entry of FRAMEWORK_REGISTRY) {
        const countResult = await session.run(
          `MATCH (n:${entry.label}) RETURN count(n) AS count`
        );
        const nodeCount = countResult.records[0]?.get("count")?.toNumber() ?? 0;

        let hierarchyDepth = 1;
        if (nodeCount > 0) {
          const depthResult = await session.run(
            `MATCH path = (root:${entry.label})-[:${entry.relationship}*]->(leaf:${entry.label})
             WHERE NOT ()-[:${entry.relationship}]->(root)
             AND NOT (leaf)-[:${entry.relationship}]->()
             RETURN max(length(path)) + 1 AS depth`
          );
          const rawDepth = depthResult.records[0]?.get("depth");
          hierarchyDepth = rawDepth ? rawDepth.toNumber() : 1;
        }

        frameworks.push({
          framework_key: entry.key,
          name: entry.name,
          description: entry.description,
          node_count: nodeCount,
          hierarchy_depth: hierarchyDepth,
          icon: entry.icon,
        });
      }

      // Sort by node_count descending
      frameworks.sort((a, b) => b.node_count - a.node_count);

      return { frameworks };
    } finally {
      await session.close();
    }
  }
}
```

### FrameworkController Design

```typescript
// apps/server/src/controllers/framework/framework.controller.ts
import { Request, Response } from "express";
import type { ApiResponse, FrameworkListResponse } from "@journey-os/types";
import { FrameworkService } from "../../services/framework/framework.service";

export class FrameworkController {
  readonly #frameworkService: FrameworkService;

  constructor(frameworkService: FrameworkService) {
    this.#frameworkService = frameworkService;
  }

  async listFrameworks(_req: Request, res: Response): Promise<void> {
    try {
      const data = await this.#frameworkService.getFrameworkList();

      const body: ApiResponse<FrameworkListResponse> = {
        data,
        error: null,
      };
      res.status(200).json(body);
    } catch {
      const body: ApiResponse<null> = {
        data: null,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred. Please try again." },
      };
      res.status(500).json(body);
    }
  }
}
```

### Route Registration (in index.ts)

```typescript
// Add AFTER auth middleware in apps/server/src/index.ts:
import { FrameworkController } from "./controllers/framework/framework.controller";
import { FrameworkService } from "./services/framework/framework.service";

// Only register if Neo4j is available
if (neo4jConfig) {
  const frameworkService = new FrameworkService(neo4jConfig.driver);
  const frameworkController = new FrameworkController(frameworkService);

  app.get(
    "/api/v1/institution/frameworks",
    authMiddleware.handle,
    rbacMiddleware.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.SUPERADMIN),
    (req, res) => frameworkController.listFrameworks(req, res),
  );
}
```

### FrameworkCard Component Design

```typescript
// apps/web/src/components/framework/framework-card.tsx
"use client";

import Link from "next/link";

interface FrameworkCardProps {
  readonly frameworkKey: string;
  readonly name: string;
  readonly description: string;
  readonly nodeCount: number;
  readonly hierarchyDepth: number;
  readonly icon: string;
}

export function FrameworkCard({
  frameworkKey,
  name,
  description,
  nodeCount,
  hierarchyDepth,
}: FrameworkCardProps) {
  return (
    <Link href={`/institution/frameworks/${frameworkKey}`}>
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition hover:border-[#2b71b9] hover:shadow-md">
        <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{description}</p>
        <div className="mt-4 flex gap-2">
          <span className="rounded-full bg-[#2b71b9]/10 px-2 py-1 text-xs text-[#2b71b9]">
            {nodeCount} nodes
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
            {hierarchyDepth} levels
          </span>
        </div>
      </div>
    </Link>
  );
}
```
