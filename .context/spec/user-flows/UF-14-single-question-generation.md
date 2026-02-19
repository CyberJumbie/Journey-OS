# UF-14: Single Question Generation

**Feature:** F-09 (Generation Workbench)
**Persona:** Faculty — Dr. Amara Osei
**Goal:** Generate a single AI-powered assessment item via the conversational workbench, review the draft, and refine through iterative chat

## Preconditions
- Faculty is logged in, assigned to a course
- Course has uploaded content with embedded chunks (F-05)
- SubConcepts extracted and some verified (F-06)
- SLOs exist for the course (F-07)
- Frameworks seeded (F-08)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/dashboard` (FacultyDashboard) | Click "Generate" in sidebar | Navigate to `/generate` |
| 2 | `/generate` (WorkbenchPage) | See split-screen: 45% chat panel (left), 55% context panel (right) | Mode switcher shows "Generate" active |
| 3 | `/generate` (ChatPanel) | Type: "Generate a question about atherosclerosis for week 3" | Message sent to LangGraph.js pipeline via SSE |
| 4 | `/generate` (ChatPanel) | AI responds: "I'll generate a clinical vignette about atherosclerosis..." | TEXT_MESSAGE streamed via AG-UI protocol |
| 5 | `/generate` (ContextPanel) | Context panel auto-switches to SyllabusView | Relevant content chunks highlighted, SubConcepts shown |
| 6 | `/generate` (ChatPanel) | Pipeline processes: extract params → select concepts → generate vignette → create stem + options | StageProgressOverlay shows node progression |
| 7 | `/generate` (ContextPanel) | Context panel switches to QuestionPreview | STATE_DELTA streams question parts: vignette, stem, 5 options |
| 8 | `/generate` (QuestionPreview) | See full question: clinical vignette, stem, 5 options (1 correct, 4 distractors) | VignetteDisplay, StemDisplay, OptionRow components render |
| 9 | `/generate` (QuestionPreview) | See Toulmin chain: claim, data, warrant, backing, rebuttal | ToulminChain component with evidence links |
| 10 | `/generate` (QuestionPreview) | See source provenance: which content chunks informed the question | SourceProvenance component with chunk links |
| 11 | `/generate` (QuestionPreview) | See validation summary: 30 rules checked, pass/fail per rule | ValidationSummary component |
| 12 | `/generate` (ChatPanel) | Type: "Make the vignette longer and add lab values" | Refinement request sent |
| 13 | `/generate` (QuestionPreview) | Updated question streams with DiffHighlight showing changes | Changed sections highlighted |
| 14 | `/generate` (ChatPanel) | Type: "Looks good, approve it" | Question status → `approved`, saved to assessment_items |
| 15 | `/generate` (ContextPanel) | See CoverageMapView briefly showing updated USMLE coverage | Coverage impact visible |

## Error Paths
- **No content for topic**: Step 3 — AI responds: "I don't have content about [topic] in this course. Upload relevant materials first."
- **Generation timeout (>45s)**: Step 6 — "Generation is taking longer than expected. Continue waiting?" with cancel option
- **SSE disconnection**: Step 6 — Auto-reconnect within 2s, progress resumes from last stage
- **Validation failures**: Step 11 — AI auto-corrects (up to 2 retries), if still failing: "This question has [N] issues. Review manually?"
- **Critic score too low**: Step 11 — "Quality score below threshold. Would you like me to regenerate or refine?"
- **No SLOs for topic**: Step 6 — "No learning objectives match this topic. Generate anyway?" (question won't have ASSESSES edge)

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| POST | `/api/v1/generate` | Step 3 — initiate generation (SSE response) |
| GET | `/api/v1/generate` (SSE stream) | Steps 4-11 — AG-UI events (STATE_DELTA, TEXT_MESSAGE, TOOL_CALL) |
| POST | `/api/v1/items/:id/review` | Step 14 — approve question |
| GET | `/api/v1/courses/:id/coverage` | Step 15 — updated coverage data |

## Test Scenario (Playwright outline)
Login as: Faculty
Steps:
1. Navigate to `/generate`
2. Type generation request in chat
3. Wait for question to appear in context panel (may need longer timeout)
4. Verify question has vignette, stem, 5 options
5. Approve the question
Assertions:
- `assessment_items` record created with `status: approved`
- Neo4j `(:AssessmentItem)` node exists with edges: ASSESSES, TARGETS, AT_BLOOM
- Question has Toulmin chain populated
- Source provenance links to real content chunks

## Source References
- WORKBENCH_SPEC_v2.md (complete workbench specification)
- ARCHITECTURE_v10.md § 3.5 (SSE + Socket.io dual real-time)
- ARCHITECTURE_v10.md § 5 (WorkbenchState schema)
- DESIGN_SPEC.md § 5.1 Group F (generation screens)
- PRODUCT_BRIEF.md § Job 1 (Assessment Automation)
- ROADMAP_v2_3.md § Sprint 6-7 (LangGraph.js + workbench UI)
