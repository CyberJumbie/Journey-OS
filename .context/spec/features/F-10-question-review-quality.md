# F-10: Question Review & Quality

## Description
Every generated question passes through a quality pipeline: the Critic Agent (Claude Opus) scores on 6 metrics, the Review Router auto-approves, auto-rejects, or routes to faculty review. Faculty review questions in the workbench review mode with full graph context, Toulmin argumentation chain, and source provenance. Three automation levels: Full Auto, Checkpoints, Manual. This ensures no AI-generated content enters the item bank without appropriate quality gates.

## Personas
- **Faculty (Course Director)**: Manages review queue, approves/edits/rejects questions, configures automation level.
- **Faculty**: Reviews own generated questions (not others').
- **Institutional Admin**: Reviews across all courses, monitors quality metrics.

## Screens
- `QuestionReviewList.tsx` — Template A, filterable list of questions by status (pending, approved, rejected)
- `FacultyReviewQueue.tsx` — Template A, queue count strip, prioritized review list
- `ItemDetail.tsx` — Template E (Focus), full question with Toulmin chain, source provenance, critic scores
- `QuestionDetailView.tsx` — Template E (Focus), read-only question view with analytics
- `AIRefinement.tsx` — Template E (Focus), AI-assisted question editing
- `ConversationalRefine.tsx` — Template E (Focus), chat-based iterative refinement
- `QuestionHistory.tsx` — Template A, generation history with pipeline traces

## Data Domains
- **LangGraph.js Review Nodes**: `load_review_question` (node 12), `apply_edit` (node 13), `revalidate` (node 14)
- **Critic Agent**: 6 metrics (composite score), Opus model
- **Supabase**: `assessment_items.status` (draft, pending_review, approved, rejected, archived), `assessment_items.critic_scores` (JSONB), `assessment_items.toulmin` (JSONB: claim, data, warrant, backing, rebuttal, qualifier)
- **Validation**: 30 rules (22 NBME + 8 extended), up to 2 self-correction retries
- **Dedup**: 0.85 flag / 0.95 auto-reject thresholds via pgvector HNSW
- **API**: `POST /api/v1/items/:id/review` (approve/edit/reject), `GET /api/v1/items/review-queue`

## Dependencies
- **F-09**: Generation Workbench (questions must be generated first)

## Source References
- WORKBENCH_SPEC_v2.md § 7.1 (pipeline nodes 9-11: critic, graph_writer, review_router)
- WORKBENCH_SPEC_v2.md § 7.1 (review nodes 12-14)
- ROADMAP_v2_3.md § Sprint 12 (tagger + dedup + validator)
- ROADMAP_v2_3.md § Sprint 13 (critic agent + review mode)
- ARCHITECTURE_v10.md § 2.1 (dedup thresholds)
- PRODUCT_BRIEF.md § Tier 1 metrics (Critic auto-handle ≥ 60%)
- DESIGN_SPEC.md § 5.1 Group G (7 review screens)
