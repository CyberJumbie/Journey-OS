# STORY-F-8 BRIEF: Help & FAQ Pages

> **Self-contained implementation brief.** Everything needed to build this story is in this document. No external lookups required.

---

## Section 0: Lane & Priority

```yaml
story_id: STORY-F-8
old_id: S-F-39-4
epic: E-39 (Templates & Help)
feature: F-18
sprint: 16
lane: faculty
lane_priority: 3
within_lane_order: 8
size: S
depends_on: []
blocks: []
personas_served: [faculty]
```

---

## Section 1: Summary

Faculty members need a self-service Help & FAQ section within the dashboard so they can find answers to platform questions without external support. This is a **frontend-heavy, static-content** story. Content is managed as structured JSON (FAQ entries) and optional MDX (long-form help articles). The help page includes categorized documentation sections, a searchable FAQ accordion, sidebar navigation on desktop, and contextual deep links from other pages. No CMS, no database writes, no complex backend. A thin API route serves FAQ data for testability and potential future dynamic content.

**Faculty persona context (Dr. Amara Osei):** Course Director who generates exam questions, maps curricula, reviews AI-generated content, and needs quick answers about the platform's generation pipeline, review workflow, template system, item bank, and analytics dashboards. FAQ content should address her real pain points: "How do I generate questions?", "How does the Critic Agent score items?", "How do I map USMLE coverage?", "What do the quality metrics mean?"

---

## Section 2: Task Breakdown

Implementation order: Types -> Content -> Components -> Pages -> Tests

| # | Task | File(s) | Est |
|---|------|---------|-----|
| 1 | Define TypeScript interfaces for FAQ/Help data structures | `packages/types/src/help/help.types.ts`, `packages/types/src/help/index.ts` | 15m |
| 2 | Create FAQ content JSON with all 6 categories, 24+ entries | `apps/web/src/content/help/faq-data.ts` | 45m |
| 3 | Create help section content (getting started, overview) | `apps/web/src/content/help/help-sections.ts` | 30m |
| 4 | Build HelpSearch molecule (search input + results) | `apps/web/src/components/help/HelpSearch.tsx` | 30m |
| 5 | Build FAQAccordion molecule (category-grouped accordion) | `apps/web/src/components/help/FAQAccordion.tsx` | 30m |
| 6 | Build HelpSidebar organism (category nav + contextual links) | `apps/web/src/components/help/HelpSidebar.tsx` | 25m |
| 7 | Build HelpCategoryBadge atom (category pill with count) | `apps/web/src/components/help/HelpCategoryBadge.tsx` | 10m |
| 8 | Build NoResults molecule (empty search state) | `apps/web/src/components/help/NoResults.tsx` | 10m |
| 9 | Build Help main page (layout + sidebar + content area) | `apps/web/src/app/(dashboard)/help/page.tsx` | 40m |
| 10 | Build FAQ sub-page (search + accordion + category filter) | `apps/web/src/app/(dashboard)/help/faq/page.tsx` | 35m |
| 11 | Create FAQ API route for testability | `apps/web/src/app/api/help/faq/route.ts` | 20m |
| 12 | Write API tests (5 tests) | `apps/web/src/app/api/help/__tests__/faq.test.ts` | 30m |
| 13 | Export barrel files, verify TypeScript strict compliance | All files | 10m |

**Total estimated:** ~5 hours (Size S)

---

## Section 3: Data Model

All interfaces live in `packages/types/src/help/help.types.ts`. Named exports only.

```typescript
/**
 * FAQ category identifiers. Each maps to a sidebar navigation item
 * and a collapsible section in the FAQ accordion.
 */
export type FAQCategoryId =
  | 'getting-started'
  | 'generation'
  | 'review'
  | 'templates'
  | 'item-bank'
  | 'analytics';

/**
 * A single FAQ entry with question, answer, and metadata.
 * Answer supports Markdown for rich formatting (bold, code, links).
 */
export interface FAQEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string; // Markdown-formatted
  readonly category: FAQCategoryId;
  readonly tags: readonly string[]; // For search relevance
  readonly relatedLinks?: readonly RelatedLink[];
  readonly sortOrder: number;
}

/**
 * A category grouping for FAQ entries, displayed as a sidebar nav item
 * and as an accordion section header.
 */
export interface FAQCategory {
  readonly id: FAQCategoryId;
  readonly label: string;
  readonly description: string;
  readonly icon: string; // Serif symbol: ◈ ◆ ◇ ▣ ▢ ✦
  readonly sortOrder: number;
}

/**
 * A help documentation section (long-form content).
 * Used on the main help page for categorized documentation blocks.
 */
export interface HelpSection {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: string;
  readonly category: FAQCategoryId;
  readonly content: string; // Markdown body
  readonly sortOrder: number;
}

/**
 * Search result with highlighted match context.
 */
export interface HelpSearchResult {
  readonly entry: FAQEntry;
  readonly matchField: 'question' | 'answer' | 'tags';
  readonly matchScore: number; // 0-1, higher = more relevant
}

/**
 * Related link for cross-referencing between FAQ entries and help sections.
 */
export interface RelatedLink {
  readonly label: string;
  readonly href: string;
}

/**
 * API response shape for FAQ endpoints.
 */
export interface FAQListResponse {
  readonly entries: readonly FAQEntry[];
  readonly categories: readonly FAQCategory[];
  readonly totalCount: number;
}

/**
 * API query parameters for FAQ filtering.
 */
export interface FAQQueryParams {
  readonly search?: string;
  readonly category?: FAQCategoryId;
}
```

**Barrel export** (`packages/types/src/help/index.ts`):
```typescript
export type {
  FAQCategoryId,
  FAQEntry,
  FAQCategory,
  HelpSection,
  HelpSearchResult,
  RelatedLink,
  FAQListResponse,
  FAQQueryParams,
} from './help.types';
```

---

## Section 4: Database Schema

**Not applicable.** All content is static, served from TypeScript modules. No Supabase tables. No Neo4j nodes. No DualWriteService involvement. If FAQ content becomes dynamic in the future (admin-editable), that is a separate story.

---

## Section 5: API Contract

A Next.js API route serves FAQ data. This enables testability (the story requires 3-5 API tests) and allows future migration to server-fetched or CMS-backed content without changing the frontend.

### GET /api/help/faq

**Query params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | `string` | No | Client-side text search query. Matches against question, answer, and tags. Case-insensitive. |
| `category` | `FAQCategoryId` | No | Filter to a single category. |

**Response (200):**
```json
{
  "entries": [
    {
      "id": "faq-gen-1",
      "question": "How do I generate exam questions?",
      "answer": "Navigate to the **Generate** tab...",
      "category": "generation",
      "tags": ["generate", "questions", "pipeline", "workbench"],
      "relatedLinks": [
        { "label": "Generation Workbench", "href": "/generate" }
      ],
      "sortOrder": 1
    }
  ],
  "categories": [
    {
      "id": "getting-started",
      "label": "Getting Started",
      "description": "First steps with Journey OS",
      "icon": "◈",
      "sortOrder": 1
    }
  ],
  "totalCount": 24
}
```

**Error responses:**
- `400` — Invalid category value (not one of the 6 allowed IDs)

**Search logic (server-side in route handler):**
1. Normalize query: `query.toLowerCase().trim()`
2. Match against: `entry.question`, `entry.answer`, `entry.tags.join(' ')`
3. Score: question match = 1.0, tag match = 0.8, answer match = 0.5
4. Return sorted by matchScore descending, then sortOrder ascending
5. Empty search string returns all entries (unfiltered)

---

## Section 6: Frontend Spec

### 6.1 Component Hierarchy (Atomic Design)

```
PAGE: /help/page.tsx
├── TEMPLATE: DashboardShell (existing — sidebar + top bar + cream content area)
│   └── ORGANISM: HelpSidebar
│       ├── ATOM: SectionMarker (existing — dot + mono label)
│       ├── MOLECULE: HelpSearch (search input, used in sidebar on desktop)
│       └── ATOM: HelpCategoryBadge (category pill with count)
│   └── CONTENT AREA
│       ├── ATOM: Typography (heading, body text)
│       └── MOLECULE: HelpSectionCard[] (section cards linking to sub-pages)

PAGE: /help/faq/page.tsx
├── TEMPLATE: DashboardShell
│   └── ORGANISM: HelpSidebar (same, with "FAQ" active)
│   └── CONTENT AREA
│       ├── MOLECULE: HelpSearch (inline search on mobile, filters FAQ)
│       ├── MOLECULE: FAQAccordion
│       │   ├── ATOM: SectionMarker (category header)
│       │   └── ATOM: Accordion/AccordionItem (shadcn/ui)
│       └── MOLECULE: NoResults (empty state when search yields nothing)
```

### 6.2 Component Props Interfaces

```typescript
// HelpSearch.tsx (molecule)
export interface HelpSearchProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly resultCount?: number; // Shows "N results" badge
  readonly className?: string;
}

// FAQAccordion.tsx (molecule)
export interface FAQAccordionProps {
  readonly entries: readonly FAQEntry[];
  readonly categories: readonly FAQCategory[];
  readonly activeCategory?: FAQCategoryId;
  readonly searchQuery?: string; // Highlights matches in rendered text
  readonly className?: string;
}

// HelpSidebar.tsx (organism)
export interface HelpSidebarProps {
  readonly categories: readonly FAQCategory[];
  readonly entryCounts: Readonly<Record<FAQCategoryId, number>>;
  readonly activeCategory?: FAQCategoryId;
  readonly onCategorySelect: (category: FAQCategoryId | undefined) => void;
  readonly searchValue: string;
  readonly onSearchChange: (value: string) => void;
}

// HelpCategoryBadge.tsx (atom)
export interface HelpCategoryBadgeProps {
  readonly category: FAQCategory;
  readonly count: number;
  readonly isActive: boolean;
  readonly onClick: () => void;
}

// NoResults.tsx (molecule)
export interface NoResultsProps {
  readonly searchQuery: string;
  readonly onClearSearch: () => void;
}
```

### 6.3 States

| State | Trigger | UI |
|-------|---------|-----|
| **Default** | Page load | All categories visible, FAQ accordion collapsed, sidebar shows all categories with counts |
| **Category filtered** | Click category in sidebar | Only entries from that category shown, category badge highlighted with `parchment` bg |
| **Search active** | Type in search input | Results filtered in real-time, "N results" badge shown, matching entries expand, no-match categories hidden |
| **No results** | Search query matches nothing | NoResults molecule: serif symbol (◈) in circle + "No questions found for '{query}'" + "Clear search" button |
| **Category + search** | Both active | Intersection: only entries matching search AND in selected category |

### 6.4 Design Token Usage

**Surfaces (Three Sheets of Paper):**
```
Page background:         var(--bg-muted)        cream #f5f3ef
Sidebar:                 var(--bg-primary)       white #ffffff
                         border-right: 1px solid var(--border-light) #edeae4
Content cards:           var(--bg-primary)       white #ffffff (cards on cream = white)
                         border: 1px solid var(--border-light)
                         border-radius: var(--radius-2xl) 12px
Search input bg:         var(--bg-elevated)      parchment #faf9f6 (input inside white = parchment)
                         border: 1px solid var(--border) #e2dfd8
Active sidebar item:     var(--bg-elevated)      parchment #faf9f6 (on white sidebar = parchment)
FAQ answer bg:           var(--bg-elevated)      parchment #faf9f6 (nested inside white card)
```

**Typography (Type Trio):**
```
Page title "Help Center":     font-serif (Lora)     text-heading-lg (22px/700)    var(--navy-deep)
Section subtitle:              font-mono (DM Mono)   text-label-md (10px/500)      var(--text-muted) UPPERCASE
Category headers:              font-serif (Lora)      text-heading-md (16px/700)    var(--navy-deep)
FAQ question text:             font-sans (Source Sans) text-body-sm (15px/600)       var(--ink)
FAQ answer text:               font-sans (Source Sans) text-body-sm (15px/400)       var(--text-secondary)
Search placeholder:            font-sans (Source Sans) text-body-xs (14px/400)       var(--text-muted)
Sidebar category labels:       font-sans (Source Sans) text-body-xs (14px/500)       var(--text-secondary)
Entry count badges:            font-mono (DM Mono)    text-label-sm (9px/500)        var(--text-muted) UPPERCASE
"No results" message:          font-sans (Source Sans) text-body-md (16px/400)       var(--text-secondary)
```

**Spacing:**
```
Sidebar width (desktop):       240px (matches dashboard sidebar)
Sidebar padding:               var(--space-3xl) 24px vertical, var(--space-xl) 16px horizontal
Content area padding:          var(--space-4xl) 28px horizontal (desktop), var(--space-xl) 16px (mobile)
Card padding:                  var(--space-2xl) 20px to var(--space-3xl) 24px
Category gap:                  var(--space-sm) 6px
FAQ item gap:                  0 (border-separated, not gap-separated)
Search input padding:          var(--space-md) 8px vertical, var(--space-lg) 12px horizontal
Section gap:                   var(--space-2xl) 20px
```

**Borders & Radii:**
```
Cards:                         border-radius: var(--radius-2xl) 12px
Sidebar category items:        border-radius: var(--radius-md) 6px
Search input:                  border-radius: var(--radius-lg) 8px
Category badges:               border-radius: var(--radius-sm) 3px
```

**Shadows:**
```
Cards at rest:                 none (border only, per design spec rule)
Card hover:                    var(--shadow-card) 0 4px 16px rgba(0,44,118,0.05)
Search input focus:            var(--shadow-focus) 0 0 0 3px rgba(43,113,185,0.08)
                               + border-color: var(--blue-mid)
```

**Section Markers (used on every card header):**
```
● FREQUENTLY ASKED QUESTIONS     dot: 5px var(--navy-deep) + mono label
● GETTING STARTED                dot: 5px var(--green-dark) (curriculum-related sections)
```

### 6.5 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (>=1024px) | Sidebar (240px fixed) + content area. Search in sidebar. |
| Tablet (640-1023px) | No sidebar. Search inline above FAQ content. Category filter as horizontal scroll pills. |
| Mobile (<640px) | Full-width single column. Search at top. Categories as collapsible dropdown. Accordion full-width. |

### 6.6 shadcn/ui Components Required

| Component | Usage |
|-----------|-------|
| `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | FAQ question/answer pairs, grouped by category |
| `Input` | Search input field |
| `ScrollArea` | Sidebar scroll on desktop when categories overflow |
| `Badge` | Category count pills, search result count |
| `Separator` | Between category groups in accordion |
| `Button` | "Clear search" in NoResults, "Clear filters" |

### 6.7 Sidebar Navigation Pattern

Matches the dashboard sidebar from `journey-os-dashboard.jsx`:
- White background, `border-right: 1px solid var(--border-light)`
- Fixed position on desktop (240px), hidden on mobile/tablet
- Logo area at top (if standalone) or omitted (if nested inside dashboard shell)
- Category items: `padding: 10px 12px`, `border-radius: 6px`, active state = `parchment` bg + `navyDeep` text color + `font-weight: 600`
- Section marker dot (5px, `navyDeep`) before "HELP" label at top
- Bottom section: contextual links to "Contact Support", "Report a Bug"

### 6.8 Contextual Help Links

Other pages in the app can deep-link to specific FAQ sections:
```
/help/faq?category=generation        → Opens FAQ filtered to Generation category
/help/faq?category=review&search=critic → Opens filtered + searched
/help/faq#faq-gen-1                  → Scrolls to and expands specific FAQ entry
```

Implementation: Read `searchParams` in the FAQ page component, set initial state from URL params. Use `useSearchParams()` from `next/navigation`.

---

## Section 7: Files to Create

Listed in implementation order (Types -> Content -> Components -> Pages -> Tests):

```
1.  packages/types/src/help/help.types.ts          — TypeScript interfaces (Section 3)
2.  packages/types/src/help/index.ts                — Barrel export
3.  apps/web/src/content/help/faq-data.ts           — FAQ entries and categories (Section 9)
4.  apps/web/src/content/help/help-sections.ts      — Help section content
5.  apps/web/src/components/help/HelpCategoryBadge.tsx — Atom: category pill
6.  apps/web/src/components/help/HelpSearch.tsx      — Molecule: search input + count
7.  apps/web/src/components/help/FAQAccordion.tsx    — Molecule: grouped accordion
8.  apps/web/src/components/help/NoResults.tsx       — Molecule: empty search state
9.  apps/web/src/components/help/HelpSidebar.tsx     — Organism: sidebar navigation
10. apps/web/src/app/(dashboard)/help/page.tsx       — Page: help center landing
11. apps/web/src/app/(dashboard)/help/faq/page.tsx   — Page: FAQ with search + filter
12. apps/web/src/app/api/help/faq/route.ts           — API route: GET /api/help/faq
13. apps/web/src/app/api/help/__tests__/faq.test.ts  — API tests (5 tests)
```

**Files NOT created (already exist or out of scope):**
- Dashboard shell template (already exists)
- SectionMarker atom (already in design system)
- shadcn/ui Accordion, Input, ScrollArea, Badge (already installed)

---

## Section 8: Dependencies

### Package Dependencies (should already be installed in monorepo)

| Package | Usage | Location |
|---------|-------|----------|
| `@radix-ui/react-accordion` | FAQ accordion (via shadcn/ui) | `packages/ui` |
| `@radix-ui/react-scroll-area` | Sidebar scroll | `packages/ui` |
| `next` (15.x) | App Router, API routes, `useSearchParams` | `apps/web` |
| `react` (19.x) | Components | `apps/web` |
| `vitest` | API tests | `apps/web` (or `apps/server`) |

### No Additional Installs Needed

- **No MDX setup required.** This brief uses structured TypeScript modules (`faq-data.ts`, `help-sections.ts`) instead of MDX files. Markdown in answer fields is rendered with simple string replacement or a lightweight Markdown renderer if one is already in the project. If not, answers can use JSX directly.
- **No CMS.** Content is hardcoded in TypeScript, type-checked at build time.

### Internal Dependencies

| Dependency | From | Notes |
|------------|------|-------|
| `packages/types` | `help.types.ts` | Shared interfaces |
| `packages/ui` | shadcn/ui components | Accordion, Input, Badge, ScrollArea, Button, Separator |
| Dashboard shell | `apps/web` | Existing layout template wrapping the help pages |

---

## Section 9: Test Fixtures

### FAQ Categories

```typescript
// apps/web/src/content/help/faq-data.ts

import type { FAQCategory, FAQEntry } from '@journey-os/types/help';

export const FAQ_CATEGORIES: readonly FAQCategory[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    description: 'First steps with Journey OS',
    icon: '◈',
    sortOrder: 1,
  },
  {
    id: 'generation',
    label: 'Generation',
    description: 'AI-powered question generation',
    icon: '✦',
    sortOrder: 2,
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Quality review and approval workflow',
    icon: '◇',
    sortOrder: 3,
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Question and exam templates',
    icon: '◆',
    sortOrder: 4,
  },
  {
    id: 'item-bank',
    label: 'Item Bank',
    description: 'Question repository management',
    icon: '▣',
    sortOrder: 5,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Coverage, quality, and performance data',
    icon: '▢',
    sortOrder: 6,
  },
] as const;

export const FAQ_ENTRIES: readonly FAQEntry[] = [
  // ── GETTING STARTED ──────────────────────────────────────
  {
    id: 'faq-gs-1',
    question: 'How do I set up my first course in Journey OS?',
    answer: 'Navigate to **Courses** in the sidebar and click **+ New Course**. Enter the course name, code, and department. Then upload your syllabus document — Journey OS will extract learning objectives and map them to USMLE blueprint topics automatically.',
    category: 'getting-started',
    tags: ['course', 'setup', 'syllabus', 'onboarding'],
    relatedLinks: [{ label: 'Courses', href: '/courses' }],
    sortOrder: 1,
  },
  {
    id: 'faq-gs-2',
    question: 'What file formats are supported for syllabus upload?',
    answer: 'Journey OS accepts **PDF**, **DOCX**, and **plain text** files. For best results, use a structured document with clear headings for course objectives, weekly topics, and learning outcomes.',
    category: 'getting-started',
    tags: ['upload', 'syllabus', 'file', 'format', 'pdf', 'docx'],
    sortOrder: 2,
  },
  {
    id: 'faq-gs-3',
    question: 'How do I navigate the dashboard?',
    answer: 'The **sidebar** (left) provides access to all major sections: Dashboard, Courses, Generate, Assessments, Students, and Analytics. The **top bar** shows your current page and provides search. The main content area displays cards with your courses, tasks, and recent activity.',
    category: 'getting-started',
    tags: ['dashboard', 'navigation', 'sidebar', 'layout'],
    relatedLinks: [{ label: 'Dashboard', href: '/dashboard' }],
    sortOrder: 3,
  },
  {
    id: 'faq-gs-4',
    question: 'Can I customize my dashboard view?',
    answer: 'Currently, the dashboard shows a fixed layout with your active courses, upcoming tasks, recent activity, and cohort mastery overview. Customizable dashboard layouts are planned for a future release.',
    category: 'getting-started',
    tags: ['dashboard', 'customize', 'layout', 'settings'],
    sortOrder: 4,
  },

  // ── GENERATION ───────────────────────────────────────────
  {
    id: 'faq-gen-1',
    question: 'How do I generate exam questions?',
    answer: 'Go to **Generate** in the sidebar. Select a course and topic, choose the number of questions (1-20), difficulty level, and question type (Single Best Answer or Clinical Vignette). Click **Generate Questions** and the AI pipeline will produce draft items in approximately 30-45 seconds each.',
    category: 'generation',
    tags: ['generate', 'questions', 'pipeline', 'workbench', 'create'],
    relatedLinks: [{ label: 'Generation Workbench', href: '/generate' }],
    sortOrder: 1,
  },
  {
    id: 'faq-gen-2',
    question: 'How does the AI generation pipeline work?',
    answer: 'The pipeline has 10 stages: **Context Compilation** (retrieves relevant knowledge graph data and source documents), **Vignette Builder** (creates a clinical scenario), **Stem Writer** (formulates the question), **Distractor Generator** (creates plausible wrong answers with common misconceptions), **Tagger** (assigns USMLE topics, Bloom\'s level), **Dedup Detector** (checks for similar existing items), **Validator** (NBME structural rules), **Critic Agent** (6-metric quality scoring), **Graph Writer** (saves to knowledge graph), and **Review Router** (auto-approve or route to faculty review).',
    category: 'generation',
    tags: ['pipeline', 'stages', 'AI', 'process', 'vignette', 'critic'],
    sortOrder: 2,
  },
  {
    id: 'faq-gen-3',
    question: 'What does the Critic Agent score mean?',
    answer: 'The Critic Agent evaluates every generated question on **6 metrics**: clinical accuracy, distractor quality, Bloom\'s alignment, NBME structural compliance, bias check, and stem clarity. Each metric is scored 0-1. Items scoring above the auto-approve threshold (configurable, default 0.8 average) are automatically approved. Items below go to your review queue.',
    category: 'generation',
    tags: ['critic', 'quality', 'score', 'metrics', 'auto-approve', 'threshold'],
    sortOrder: 3,
  },
  {
    id: 'faq-gen-4',
    question: 'Can I control the difficulty of generated questions?',
    answer: 'Yes. On the generation form, select **Easy**, **Medium**, **Hard**, or **Mixed** difficulty. This maps to IRT difficulty parameters that constrain the AI\'s output. Advanced options also let you select specific Bloom\'s Taxonomy levels (1-6) and toggle clinical image generation.',
    category: 'generation',
    tags: ['difficulty', 'IRT', 'Bloom', 'settings', 'advanced'],
    sortOrder: 4,
  },

  // ── REVIEW ───────────────────────────────────────────────
  {
    id: 'faq-rev-1',
    question: 'How do I review generated questions?',
    answer: 'Navigate to **Assessments** > **Review Queue**. Items awaiting review show the question text, Critic Agent scores, and source provenance. You can **Approve** (moves to Item Bank), **Edit** (opens inline editor), or **Reject** (with reason, for pipeline improvement).',
    category: 'review',
    tags: ['review', 'approve', 'reject', 'edit', 'queue'],
    relatedLinks: [{ label: 'Review Queue', href: '/assessments/review' }],
    sortOrder: 1,
  },
  {
    id: 'faq-rev-2',
    question: 'What is the auto-approve threshold?',
    answer: 'Items scoring above a configurable threshold on all 6 Critic metrics are automatically approved without manual review. The default threshold is **0.8** (80%). You can adjust this in **Settings** > **Generation** > **Auto-Approve Threshold**. Setting it to 1.0 means all items require manual review.',
    category: 'review',
    tags: ['auto-approve', 'threshold', 'settings', 'quality'],
    sortOrder: 2,
  },
  {
    id: 'faq-rev-3',
    question: 'Can I edit a question after it has been approved?',
    answer: 'Yes. Approved items in the Item Bank can be edited. The item returns to "Edited" status and is re-scored by the Critic Agent. If it still meets the threshold, it stays approved. Otherwise, it returns to the review queue.',
    category: 'review',
    tags: ['edit', 'approved', 'item bank', 'modify'],
    sortOrder: 3,
  },
  {
    id: 'faq-rev-4',
    question: 'How does the Toulmin argument help with review?',
    answer: 'Each generated question includes a **Toulmin Argument** — a structured reasoning chain showing the Claim (correct answer), Data (clinical evidence), Warrant (medical reasoning), and Backing (source references). This lets you verify *why* the AI chose the correct answer without reading the full source material.',
    category: 'review',
    tags: ['Toulmin', 'argument', 'reasoning', 'provenance', 'evidence'],
    sortOrder: 4,
  },

  // ── TEMPLATES ────────────────────────────────────────────
  {
    id: 'faq-tpl-1',
    question: 'What are question templates?',
    answer: 'Templates are reusable configurations for question generation. They save your preferred settings — question type, difficulty mix, Bloom\'s distribution, topic focus — so you can quickly generate consistent batches. Templates can be shared with other faculty in your department.',
    category: 'templates',
    tags: ['template', 'configuration', 'reusable', 'settings'],
    relatedLinks: [{ label: 'Templates', href: '/templates' }],
    sortOrder: 1,
  },
  {
    id: 'faq-tpl-2',
    question: 'How do I create a question template?',
    answer: 'Go to **Templates** and click **+ New Template**. Give it a name and description, then configure: question type (SBA, Clinical Vignette), difficulty distribution, Bloom\'s level targets, topic constraints, and number of questions per batch. Save and use it whenever you generate.',
    category: 'templates',
    tags: ['create', 'template', 'new', 'configure'],
    sortOrder: 2,
  },
  {
    id: 'faq-tpl-3',
    question: 'Can I share templates with other faculty?',
    answer: 'Yes. When creating or editing a template, toggle **Share with department** to make it visible to all faculty in your department. Shared templates appear in a "Department Templates" section alongside your personal ones.',
    category: 'templates',
    tags: ['share', 'department', 'collaborate', 'faculty'],
    sortOrder: 3,
  },

  // ── ITEM BANK ────────────────────────────────────────────
  {
    id: 'faq-ib-1',
    question: 'How do I search the Item Bank?',
    answer: 'Open **Assessments** > **Item Bank**. Use the search bar to find questions by keyword. Filter by: USMLE topic (tree view with checkboxes), difficulty, creator, course, tags, date range, or quality score. Switch between grid and list views.',
    category: 'item-bank',
    tags: ['search', 'filter', 'item bank', 'repository', 'find'],
    relatedLinks: [{ label: 'Item Bank', href: '/assessments/bank' }],
    sortOrder: 1,
  },
  {
    id: 'faq-ib-2',
    question: 'How are items tagged with USMLE topics?',
    answer: 'The **Tagger** stage in the generation pipeline automatically maps each question to USMLE Content Outline topics, Physician Tasks, and Patient Demographics. Tags are derived from the knowledge graph relationships between concepts, learning objectives, and USMLE blueprint nodes.',
    category: 'item-bank',
    tags: ['USMLE', 'tags', 'topics', 'blueprint', 'mapping'],
    sortOrder: 2,
  },
  {
    id: 'faq-ib-3',
    question: 'Can I export questions from the Item Bank?',
    answer: 'Yes. Select items using the checkboxes, then click **Export**. Supported formats: **QTI** (for import into ExamSoft and other test delivery platforms), **CSV** (for spreadsheet analysis), and **PDF** (formatted exam printout).',
    category: 'item-bank',
    tags: ['export', 'QTI', 'CSV', 'PDF', 'ExamSoft'],
    sortOrder: 3,
  },

  // ── ANALYTICS ────────────────────────────────────────────
  {
    id: 'faq-an-1',
    question: 'What does the USMLE coverage heatmap show?',
    answer: 'The heatmap visualizes how well your course\'s question bank covers the USMLE Content Outline. Each cell represents a topic-system intersection. **Green** (>70%) means strong coverage, **blue** (40-70%) is moderate, **light blue** (15-40%) is emerging, and **gray** (<15%) indicates a gap requiring attention.',
    category: 'analytics',
    tags: ['coverage', 'heatmap', 'USMLE', 'gap', 'visualization'],
    relatedLinks: [{ label: 'Analytics', href: '/analytics' }],
    sortOrder: 1,
  },
  {
    id: 'faq-an-2',
    question: 'How is the "Avg Item Quality" KPI calculated?',
    answer: 'The average item quality is the mean of all 6 Critic Agent metrics across all approved items in your course: clinical accuracy, distractor quality, Bloom\'s alignment, NBME compliance, bias score, and stem clarity. A score of 0.84 means your items average 84% across all quality dimensions.',
    category: 'analytics',
    tags: ['quality', 'KPI', 'metrics', 'average', 'score'],
    sortOrder: 2,
  },
  {
    id: 'faq-an-3',
    question: 'What does the Coverage Score percentage mean?',
    answer: 'Coverage Score measures the percentage of USMLE Content Outline topics addressed by at least one approved question in your course\'s item bank. A score of 91% means 91% of relevant USMLE topics have at least one corresponding question. The goal is 100% for comprehensive board preparation alignment.',
    category: 'analytics',
    tags: ['coverage', 'score', 'percentage', 'USMLE', 'topics'],
    sortOrder: 3,
  },
  {
    id: 'faq-an-4',
    question: 'How do I interpret the cohort mastery heatmap?',
    answer: 'The cohort mastery heatmap shows aggregate student performance by topic. Each cell is color-coded: **green** (>70% mastery), **blue** (40-70%), **light blue** (15-40%), **gray** (<15%). Topics below your mastery threshold (configurable, default 60%) are flagged as needing intervention. Click any cell to see student-level breakdowns.',
    category: 'analytics',
    tags: ['mastery', 'heatmap', 'students', 'cohort', 'performance'],
    sortOrder: 4,
  },
] as const;
```

### Edge Case Fixtures (for tests)

```typescript
// In test file: apps/web/src/app/api/help/__tests__/faq.test.ts

const EDGE_CASES = {
  // Search with special characters
  specialCharsQuery: 'Bloom\'s & USMLE',
  // Search that matches tags but not question/answer text
  tagOnlyQuery: 'psychometrics', // if a tag exists but not in Q or A
  // Empty category (if one category has no entries)
  emptyCategory: 'templates' as const, // only if filtered to return 0
  // Very long search query
  longQuery: 'how do I generate questions for my pharmacology course about receptor agonists and antagonists',
  // Case sensitivity
  mixedCaseQuery: 'USMLE Coverage Heatmap',
};
```

---

## Section 10: API Test Spec (vitest)

File: `apps/web/src/app/api/help/__tests__/faq.test.ts`

```typescript
import { describe, it, expect } from 'vitest';

// Tests call the route handler directly or via a lightweight test client.
// These are unit tests of the API route handler, not integration tests.

describe('GET /api/help/faq', () => {

  it('returns all FAQ entries and categories when no filters applied', async () => {
    // GIVEN: No query parameters
    // WHEN: GET /api/help/faq
    // THEN: Response includes all entries, all 6 categories, totalCount >= 24
    // ASSERT: response.status === 200
    // ASSERT: response.body.categories.length === 6
    // ASSERT: response.body.entries.length >= 24
    // ASSERT: response.body.totalCount === response.body.entries.length
    // ASSERT: entries are sorted by category sortOrder, then entry sortOrder
  });

  it('filters entries by category', async () => {
    // GIVEN: category=generation
    // WHEN: GET /api/help/faq?category=generation
    // THEN: Only generation entries returned
    // ASSERT: response.status === 200
    // ASSERT: every entry has category === 'generation'
    // ASSERT: entries.length >= 4 (generation has 4+ entries)
    // ASSERT: categories still includes all 6 (for sidebar rendering)
  });

  it('searches across question, answer, and tags', async () => {
    // GIVEN: search=USMLE
    // WHEN: GET /api/help/faq?search=USMLE
    // THEN: Returns entries mentioning USMLE in question, answer, or tags
    // ASSERT: response.status === 200
    // ASSERT: entries.length >= 3 (multiple entries mention USMLE)
    // ASSERT: each entry contains 'USMLE' in question OR answer OR tags
    // ASSERT: results sorted by relevance (question matches first)
  });

  it('returns empty entries array for search with no matches', async () => {
    // GIVEN: search=xyznonexistent
    // WHEN: GET /api/help/faq?search=xyznonexistent
    // THEN: Empty entries, categories still present
    // ASSERT: response.status === 200
    // ASSERT: response.body.entries.length === 0
    // ASSERT: response.body.totalCount === 0
    // ASSERT: response.body.categories.length === 6
  });

  it('returns 400 for invalid category parameter', async () => {
    // GIVEN: category=invalid-category
    // WHEN: GET /api/help/faq?category=invalid-category
    // THEN: 400 error with descriptive message
    // ASSERT: response.status === 400
    // ASSERT: response.body.error includes 'Invalid category'
  });

});
```

---

## Section 11: E2E Test Spec

**Not applicable.** Help & FAQ pages are not one of the 5 critical E2E journeys. No Playwright test required.

---

## Section 12: Acceptance Criteria

| # | Criterion | Verification |
|---|-----------|-------------|
| AC-1 | Help page with categorized documentation sections | Visual: 6 category cards on help landing page, each linking to relevant content |
| AC-2 | FAQ accordion with expandable question/answer pairs | Visual: Click question expands answer with smooth animation. Click again collapses. |
| AC-3 | Categories: Getting Started, Generation, Review, Templates, Item Bank, Analytics | Data: 6 categories present in sidebar and as accordion group headers |
| AC-4 | Search functionality: client-side text search across all FAQ entries | Functional: Type "USMLE" in search, see filtered results. Clear search restores all. |
| AC-5 | Contextual help links: pages link to relevant FAQ section | Navigation: `/help/faq?category=generation` opens with Generation filter active |
| AC-6 | Content managed as static MDX or structured JSON (no CMS needed) | Code: Content in TypeScript modules, type-checked, no external CMS dependency |
| AC-7 | Responsive layout with sidebar navigation on desktop | Visual: Sidebar visible >=1024px. Hidden on mobile/tablet with inline category filter. |
| AC-8 | 3-5 API tests: FAQ list endpoint, search, category filter | Test: 5 vitest tests pass covering all API behaviors |
| AC-9 | TypeScript strict, named exports only | Code: `tsc --noEmit` passes. No `export default`. No `any` types. |

---

## Section 13: Source References

These documents were consulted to produce this brief. All relevant data has been **extracted inline** into this brief. Do not look up these files during implementation.

| Document | What Was Extracted |
|----------|--------------------|
| `.context/source/05-reference/DESIGN_SPEC.md` | Three Sheets of Paper (cream/white/parchment), color tokens, typography trio (Lora/Source Sans 3/DM Mono), type scale, spacing (4px base), border radii (3/6/8/10/12px), shadow tokens, section marker pattern, anti-patterns, surface CSS variables |
| `.context/source/05-reference/screens/journey-os-dashboard.jsx` | Sidebar pattern (240px, white bg, parchment active items, navyDeep text), top bar (frosted glass), content area (cream bg), card styling (white on cream, borderLight), responsive breakpoints (640/1024px) |
| `.context/source/04-process/CODE_STANDARDS.md` | Atomic Design 5 levels, MVC layer rules, OOP patterns (constructor DI, private fields), directory structure (`packages/ui/src/atoms/`, `molecules/`, `organisms/`), component naming |
| `.context/source/01-product/PRODUCT_BRIEF.md` | Faculty persona (Dr. Amara Osei) — pain points, workflow, success criteria. Used to write FAQ content that addresses real faculty questions about generation pipeline, coverage mapping, quality metrics, LCME evidence |
| `.context/spec/stories/S-F-39-4.md` | Original story file with acceptance criteria, implementation layers, dependencies, notes |

---

## Section 14: Environment Prerequisites

| Prerequisite | Details |
|--------------|---------|
| Next.js dev server | `pnpm dev` from `apps/web` — App Router with `(dashboard)` route group |
| TypeScript strict | `tsconfig.json` with `strict: true` in both `packages/types` and `apps/web` |
| shadcn/ui installed | Accordion, Input, ScrollArea, Badge, Button, Separator components available in `packages/ui` |
| Design tokens configured | CSS custom properties from Section 6.4 available in global stylesheet |
| Tailwind configured | Custom font sizes (`text-heading-lg`, `text-label-md`, etc.) and spacing tokens registered in `tailwind.config` |
| Vitest configured | Test runner available in `apps/web` for API route tests |

**No additional installs needed.** All dependencies are part of the existing monorepo setup.

---

## Section 15: Figma / Make Prototype

**Optional but recommended.** A quick wireframe would validate:
1. Sidebar + content area layout on desktop (240px sidebar, remaining width for content)
2. FAQ accordion behavior (single vs. multiple open, category grouping)
3. Mobile layout (inline search + collapsible category filter above accordion)

If time-constrained, skip the prototype. The dashboard reference (`journey-os-dashboard.jsx`) provides sufficient layout precedent — the help page follows the same shell pattern with a content-specific sidebar replacing the main nav sidebar.

---

## Implementation Notes

1. **No MDX complexity.** Use structured TypeScript modules for all content. Markdown in `answer` fields can be rendered with `dangerouslySetInnerHTML` after a simple Markdown-to-HTML conversion, or just use JSX strings with `<strong>`, `<code>`, etc. Do not introduce a full MDX build pipeline for this story.

2. **Search is client-side first.** The API route provides testability, but the FAQ page component can also filter locally from the imported data module for instant results. The API exists to satisfy the testing requirement and future-proof for server-side content.

3. **URL state sync.** Use `useSearchParams()` to read `?category=` and `?search=` from the URL. Push state changes to URL so deep links and browser back/forward work correctly.

4. **Scroll-to-entry.** When navigating to `/help/faq#faq-gen-1`, scroll to and programmatically expand the matching accordion item. Use `useEffect` with `window.location.hash` on mount.

5. **Content is seeded from beta support questions.** The 24 FAQ entries in Section 9 are the initial set. They cover the faculty persona's real workflow: course setup, question generation, review, templates, item bank search, and analytics interpretation. All content is informed by Dr. Amara Osei's pain points from the product brief.

6. **"Was this helpful?" feedback.** The story notes suggest considering a feedback mechanism on each FAQ entry. This is **out of scope** for this story (would require a database write). Flag as a potential follow-up story.
