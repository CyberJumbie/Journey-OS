# UF-31: Student Adaptive Practice Session

**Feature:** F-19 (Adaptive Practice)
**Persona:** Student — Marcus Williams
**Goal:** Launch an adaptive practice session that targets weakest concepts, answer questions with real-time mastery updates, and review concept-level results

## Preconditions
- Logged in as student role (`apps/student`)
- At least one enrolled course with extracted SubConcepts exists
- Item bank has ≥ 50 calibrated items (IRT parameters: difficulty, discrimination, guessing)
- ConceptMastery nodes exist for student (created on first practice or enrollment)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | /login | Enter student credentials, click Sign In | Redirected to /dashboard |
| 2 | /dashboard | Click "Start Practice" or "Weak Areas" quick-start | Navigate to /practice |
| 3 | /practice | Select practice mode: Adaptive (default), Course-specific, or Weak Areas | Mode selected, configuration panel updates |
| 4 | /practice | Configure session: select course/concept set, session length (10/20/30 items) | Configuration confirmed |
| 5 | /practice | Click "Start Session" | POST /api/v1/practice/start → session created, redirected to /practice/session |
| 6 | /practice/session | Read question stem, review answer options (A–E), timer visible | Question displayed with Template E (Focus) layout |
| 7 | /practice/session | Select answer, click "Submit" | POST /api/v1/practice/:id/answer → answer recorded |
| 8 | /practice/session | View immediate feedback: correct/incorrect, correct answer highlighted, Toulmin-structured explanation, misconception flag if applicable | Feedback panel slides in with mastery update visualization (progress bar shift) |
| 9 | /practice/session | Click "Next Question" | Next adaptively-selected item displayed (Fisher Information + centrality weighting) |
| 10 | /practice/session | Repeat steps 6–9 for remaining items | Session progresses, mastery updates after each answer |
| 11 | /practice/session | Complete final item → "Session Complete" | Redirected to /practice/review |
| 12 | /practice/review | View session summary: items attempted, accuracy %, mastery changes per concept | GET /api/v1/practice/:id/results → score strip + concept breakdown |
| 13 | /practice/review | Click on a concept to see item-level detail | Drill-down shows individual questions, correct answers, explanations |
| 14 | /practice/review | Click "Practice Weak Areas" or "Return to Dashboard" | Navigate to /practice (weak areas pre-selected) or /dashboard |

## Error Paths
- **Insufficient items**: If item pool < minimum for selected config, show "Not enough calibrated items for this topic. Try broadening your selection." and disable Start
- **Session timeout**: If student is inactive > 30 minutes, auto-save progress and prompt to resume or end session
- **Network failure mid-question**: Retry submission with exponential backoff; if 3 failures, save answer locally and sync on reconnect
- **Empty mastery state**: First-time student gets initial θ = 0 (average), system selects medium-difficulty items to calibrate
- **Unauthorized**: If JWT expired mid-session, redirect to /login with return URL to resume session

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| POST | /api/v1/practice/start | Step 5 — create practice session with config |
| POST | /api/v1/practice/:id/answer | Step 7 — submit each answer (triggers BKT update pipeline) |
| GET | /api/v1/practice/:id/results | Step 12 — fetch session summary and mastery changes |
| GET | /api/v1/students/me/mastery | Step 3 — load current mastery for weak area identification |

## Test Scenario (Playwright outline)
Login as: student test account (Marcus Williams)
Steps:
1. Navigate to /practice
2. Select Adaptive mode, default course, 10 items
3. Click Start Session
4. Answer 10 questions (select option A for each)
5. Verify feedback appears after each answer
6. Complete session, verify results page shows
Assertions:
- Practice session created (API 201)
- Each answer submission returns mastery update
- Results page shows 10 items attempted
- Mastery change values displayed (positive or negative)
- Concept breakdown table has ≥ 1 row

## Source References
- PRODUCT_BRIEF.md § Marcus Williams ("tells me I'm weak in Renal Pharmacology, gives me 10 targeted questions")
- ARCHITECTURE_v10.md § 10.3 (Adaptive Practice — Fisher Information, BKT pipeline)
- ARCHITECTURE_v10.md § 10.5 (Post-Question Review)
- ARCHITECTURE_v10.md § 13.2 (Practice Flow)
- ARCHITECTURE_v10.md § 15.2 (Event-Driven Mastery Update — < 500ms pipeline)
- DESIGN_SPEC.md § 5.1 Group D (StudentPractice, StudentQuestionView, StudentResults)
- NODE_REGISTRY_v1.md § Layer 5 (Student, ConceptMastery, HAS_MASTERY, FOR_CONCEPT)
