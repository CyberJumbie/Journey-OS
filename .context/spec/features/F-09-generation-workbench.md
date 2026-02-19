# F-09: Generation Workbench

## Description
The primary interface for faculty to generate AI-powered medical assessment items. A split-screen layout (45% chat / 55% context panel) powered by a 14-node LangGraph.js pipeline communicating through AG-UI protocol via CopilotKit over SSE. Three modes — generate (single question), bulk (batch via Inngest), and review — all route through `/generate`. Faculty describe what they need conversationally, the AI generates draft questions using Evidence-Centered Design principles, and faculty refine through iterative chat.

## Personas
- **Faculty**: Single question generation, conversational refinement, template use.
- **Faculty (Course Director)**: All faculty capabilities + bulk generation + review queue management.
- **Institutional Admin**: All capabilities across courses.

## Screens
- `GenerationSpecWizard.tsx` — Template A, step-by-step generation parameter setup
- `GenQuestionsSyllabus.tsx` — Template A, generate from syllabus context
- `GenQuestionsTopic.tsx` — Template A, generate from topic/concept
- `GenerateTest.tsx` — Template A, full exam generation with blueprint strip
- `GenerateQuiz.tsx` — Template A, quick quiz generation
- `GenerateHandout.tsx` — Template A, study handout generation
- `BatchProgress.tsx` — Template A, bulk generation progress strip

### Workbench Components (within split-screen)
- `<WorkbenchPage>` — Root container
- `<SplitPane>` — Resizable 45/55 split
- `<ChatPanel>` — CopilotChat with ExtractedParams chips
- `<ContextPanel>` — Auto-switching context views
- `<ModeSwitcher>` — Generate / Bulk / Review tabs
- `<StageProgressOverlay>` — Pipeline node progress
- Context views: `<SyllabusView>`, `<QuestionPreview>`, `<BulkQueueView>`, `<CoverageMapView>`
- Question components: `<VignetteDisplay>`, `<StemDisplay>`, `<OptionRow>`, `<ToulminChain>`, `<SourceProvenance>`, `<ValidationSummary>`, `<DiffHighlight>`

## Data Domains
- **LangGraph.js**: 14-node pipeline (11 generation + 3 review) on Express
- **AG-UI/CopilotKit**: STATE_DELTA (question preview streaming), TEXT_MESSAGE (chat), TOOL_CALL (pipeline progress), interrupts (human-in-the-loop)
- **Supabase**: `assessment_items` (vignette, stem, status, toulmin JSONB, critic_scores, sync_status), `options` (5 per item), `question_embeddings`, `generation_logs`
- **Neo4j**: `(:AssessmentItem)` skinny node with edges: `[:ASSESSES]->(:SLO)`, `[:TARGETS]->(:SubConcept)`, `[:AT_BLOOM]->(:BloomLevel)`, `[:AT_MILLER]->(:MillerLevel)`, `[:INSTANTIATES]->(:TaskShell)`, `[:SOURCED_FROM]->(:ContentChunk)`
- **Inngest**: `journey/batch.requested`, `journey/batch.item.generate`, `journey/batch.complete`
- **Socket.io**: Batch complete notifications, room-based presence
- **API**: `POST /api/v1/generate`, `POST /api/v1/generate/bulk`, `GET /api/v1/generate/batch/:id`, `GET /api/v1/generate/history`

## Performance Targets
| Metric | Target |
|--------|--------|
| Time to first chat token | < 500ms |
| Vignette streaming start | < 3s |
| Full question generation | < 45s |
| Context panel update | < 100ms from STATE_DELTA |
| SSE reconnection | < 2s |

## Dependencies
- **F-04**: Course Management (generation targets a course)
- **F-05**: Content Upload (content chunks for RAG context)
- **F-06**: Concept Extraction (SubConcepts for TARGETS edges)
- **F-07**: Learning Objectives (SLOs for ASSESSES edges)
- **F-08**: Framework Management (Bloom, USMLE tagging)

## Source References
- WORKBENCH_SPEC_v2.md (complete workbench specification)
- ARCHITECTURE_v10.md § 3.5 (dual real-time: SSE + Socket.io)
- ARCHITECTURE_v10.md § 5 (WorkbenchState schema)
- ROADMAP_v2_3.md § Sprint 6 (LangGraph.js + basic generation)
- ROADMAP_v2_3.md § Sprint 7 (full workbench UI)
- DESIGN_SPEC.md § 4.5 Template E (Focus Mode — question detail)
- DESIGN_SPEC.md § 5.1 Group F (7 generation screens)
- API_CONTRACT_v1.md § Generation endpoints
- PRODUCT_BRIEF.md § Job 1 (Assessment Automation)
