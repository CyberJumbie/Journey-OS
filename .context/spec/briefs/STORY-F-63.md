# STORY-F-63: Question Detail Review View

**Epic:** E-23 (Faculty Review UI)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 13
**Lane:** faculty (P3)
**Size:** L
**Old ID:** S-F-23-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need a detailed review view that displays the question, Toulmin argumentation, provenance chain, and critic scores so that I can make informed approval decisions with full context.

## Acceptance Criteria
- [ ] Full question display: vignette, stem, answer choices (correct highlighted), rationale
- [ ] Toulmin argumentation panel: claim, evidence, warrant, backing, qualifier, rebuttal for each metric
- [ ] Critic score breakdown: 6 metrics with individual scores, justifications, and composite
- [ ] Provenance panel: source concept, SLO, course, generation pipeline node trace
- [ ] Metadata panel: framework tags, Bloom level, difficulty, auto-tag confidence scores
- [ ] Dedup results: similar items listed with similarity scores (if any flagged)
- [ ] Validation results: any warnings that passed through (non-blocking)
- [ ] Side-by-side comparison mode with flagged duplicate
- [ ] Responsive layout with collapsible panels
- [ ] 12-16 API tests: detail endpoint, Toulmin structure, provenance chain, metadata assembly
- [ ] TypeScript strict, named exports only

## Reference Screens
> Refactor these prototype files for production. See `.context/spec/maps/SCREEN-STORY-MAP.md` for full mapping.

| Prototype File | Production Target | Refactor Notes |
|---------------|-------------------|----------------|
| `pages/questions/QuestionDetailView.tsx` | `apps/web/src/app/(protected)/review/[questionId]/page.tsx` | Replace sidebar + main content grid layout with responsive collapsible panels; replace Card/CardContent with design-token-styled sections; extract question display, citations, and metadata into separate organisms; replace shadcn `Collapsible` with proper collapsible panel pattern; add Toulmin argumentation panel (not in prototype); add provenance chain panel (not in prototype); add critic score breakdown (replace simple quality score); convert `export default` to page default export; convert react-router `useParams`/`Link` to Next.js equivalents |
| `pages/questions/QuestionHistory.tsx` | `apps/web/src/components/review/question-history.tsx` | Extract version history timeline into reusable organism; replace inline hex colors (`#FFC645`, `#FFB020`) with design tokens; convert version comparison to side-by-side diff component; replace `export default` with named export; replace react-router navigation with Next.js `useRouter` |
| `pages/faculty/QuestWorkbench.tsx` (QuestionPreview, OptionRow, Toulmin section) | `apps/web/src/components/review/question-display.tsx`, `apps/web/src/components/review/toulmin-panel.tsx` | Extract `QuestionPreview` and `OptionRow` into production `QuestionDisplay` organism; extract Toulmin argument chain rendering into `ToulminPanel` organism; replace ALL inline `style={{}}` with Tailwind design tokens; replace `C.navyDeep`, `C.green`, `C.parchment` color constants with CSS custom properties; replace `serif`/`sans`/`mono` font constants with Tailwind font classes |

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/review/detail.types.ts` |
| Controller | apps/server | `src/controllers/review/review-detail.controller.ts` |
| Service | apps/server | `src/services/review/review-detail.service.ts` |
| View | apps/web | `src/app/(protected)/review/[questionId]/page.tsx`, `src/components/review/question-display.tsx`, `src/components/review/toulmin-panel.tsx`, `src/components/review/provenance-panel.tsx`, `src/components/review/critic-score-card.tsx`, `src/components/review/dedup-comparison.tsx`, `src/components/review/question-history.tsx` |
| Hooks | apps/web | `src/hooks/use-review-detail.ts` |
| Tests | apps/server | `src/controllers/review/__tests__/review-detail.controller.test.ts`, `src/services/review/__tests__/review-detail.service.test.ts` |

## Database Schema
No new tables. Reads from existing tables:

```sql
-- Question detail with all metadata:
SELECT q.*, rq.priority, rq.critic_composite_score
FROM questions q
LEFT JOIN review_queue rq ON rq.question_id = q.id
WHERE q.id = :questionId;

-- Critic scores from question metadata (JSONB column or separate table)
-- Toulmin structure from critic_result JSONB
-- Tags from question_tags table
-- Provenance from Neo4j graph traversal
```

Neo4j provenance chain:
```
MATCH (q:Question {id: $questionId})-[:COVERS]->(sc:SubConcept)-[:PART_OF]->(c:Concept),
      (sc)-[:MAPS_TO]->(slo:SLO)-[:OFFERED_BY]->(course:Course)
RETURN q, sc, c, slo, course
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/review/:questionId/detail` | Faculty+ | Get full question detail with Toulmin, provenance, scores |
| GET | `/api/v1/review/:questionId/history` | Faculty+ | Get version history for question |
| GET | `/api/v1/review/:questionId/duplicates` | Faculty+ | Get similar/duplicate items with scores |

## Dependencies
- **Blocks:** None
- **Blocked by:** STORY-F-58 (Review queue page exists to navigate from)
- **Cross-epic:** STORY-F-53 (Critic scores), STORY-F-39 (Dedup results), STORY-F-54 (Tags)

## Testing Requirements
### API Tests (12-16)
1. GET detail returns full question with vignette, stem, options, rationale
2. Detail includes correct answer highlighted
3. Toulmin structure present for each of 6 critic metrics
4. Toulmin includes all 6 fields: claim, evidence, warrant, backing, qualifier, rebuttal
5. Critic score breakdown with 6 individual scores and composite
6. Provenance chain includes source concept, SLO, and course
7. Metadata includes framework tags with confidence scores
8. Metadata includes Bloom level and difficulty
9. Dedup results include similar items with similarity scores
10. Validation warnings included in response
11. History endpoint returns version list with diffs
12. 404 for non-existent question
13. 403 for question not in reviewer's scope
14. Detail assembles data from both Supabase and Neo4j

## Implementation Notes
- Toulmin panel is the key differentiator -- makes AI reasoning transparent and auditable.
- Provenance chain built from Neo4j graph traversal: Question -> Concept -> SLO -> Course.
- Collapsible panels: default state shows question + scores; expanded shows Toulmin + provenance.
- Color-code metric scores: green (4-5), yellow (3-3.9), red (1-2.9) -- use design tokens for all colors.
- Consider print-friendly layout for faculty who want to review offline.
- `QuestionDisplay` organism: renders vignette in parchment card, stem in serif font, options A-E with correct answer highlighted. Follows NBME item format.
- `ToulminPanel` organism: renders each Toulmin field (claim, evidence, warrant, backing, qualifier, rebuttal) in a structured card. Labels in mono font, content in sans.
- `ProvenancePanel` organism: visual chain from Question -> SubConcept -> SLO -> Course. Could be a simple breadcrumb or mini graph.
- `CriticScoreCard` molecule: individual metric with score badge, justification text, and color coding.
- `DedupComparison` organism: side-by-side view when a similar item is flagged. Highlight differences.
- Wrap independent Supabase + Neo4j queries in `Promise.all` -- never sequential when independent.
- Use `@web/*` path alias for all web app imports.
- Before writing any queries, run `list_tables` via Supabase MCP to verify actual table/column names.
