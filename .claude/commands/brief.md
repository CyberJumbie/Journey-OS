Generate a FULLY self-contained context packet for story $ARGUMENTS.

Usage: /brief STORY-ID (e.g., /brief STORY-IA-4)

This is the most important command in the framework. The brief must contain
EVERYTHING Claude Code needs to implement the story without ANY additional
lookups or /design-query calls.

Use RLM (REPL + sub-LLM calls) to extract all details from source docs.

## Required Sections (all 16 mandatory)

### 0. Lane & Priority (NEW)
```yaml
story_id: STORY-IA-4
lane: institutional_admin
lane_priority: 2
within_lane_order: 4
depends_on:
  - STORY-U-2 (universal) — Auth + RBAC middleware
  - STORY-IA-3 (institutional_admin) — Institution settings page
blocks:
  - STORY-IA-6 — Course creation with KG link
  - STORY-IA-9 — Student roster management
personas_served: [institutional_admin]
```

### 1. Summary
What to build, parent epic/feature, user flows satisfied, personas involved.

### 2. Task Breakdown
Numbered atomic tasks with exact file paths.

### 3. Data Model (inline, complete)
Full TypeScript interfaces — EXTRACTED from schema docs, not "see §3."

### 4. Database Schema (inline, complete)
SQL or Cypher — EXTRACTED from schema docs.

### 5. API Contract (complete request/response)
All endpoints with request/response shapes, error responses, and role access.

### 6. Frontend Spec
Component hierarchy, props interfaces, all states, design tokens.

### 7. Files to Create (exact paths, implementation order)

### 8. Dependencies
Stories that must complete first (with lane + status).
NPM packages. Existing files needed.

### 9. Test Fixtures (inline)
JSON seed data for tests — valid and invalid examples.

### 10. API Test Spec (vitest — PRIMARY)
CRUD + validation + authorization + data integrity tests.

### 11. E2E Test Spec (Playwright — CONDITIONAL)
Only if this story is part of a critical user journey.

### 12. Acceptance Criteria
Numbered, testable, specific.

### 13. Source References
Every claim traced to [DOC § Section].

### 14. Environment Prerequisites
Services required, seed data, dev servers.

### 15. Figma Make Prototype (Optional)
Whether to prototype first or code directly.

Save to .context/spec/stories/STORY-$ARGUMENTS-BRIEF.md
