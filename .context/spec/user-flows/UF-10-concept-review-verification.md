# UF-10: Concept Review & Verification

**Feature:** F-06 (Concept Extraction & Knowledge Graph)
**Persona:** Faculty (Course Director) — Dr. Amara Osei
**Goal:** Review AI-extracted SubConcepts from course content, approve/reject/merge them, and promote TEACHES edges to TEACHES_VERIFIED

## Preconditions
- Content uploaded and processed (F-05)
- AI extraction has run (Inngest pipeline after embedding)
- Unverified SubConcepts exist with `[:TEACHES]` edges (not yet `[:TEACHES_VERIFIED]`)

## Happy Path
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| 1 | `/courses/:id` (CourseDashboard) | See "Unverified Concepts" badge (e.g., "12 pending review") | Click to navigate to review queue |
| 2 | `/courses/:id/concepts/review` (SubConceptReviewQueue) | See queue of extracted SubConcepts: name, definition, source chunk, confidence score | List sorted by confidence (lowest first) |
| 3 | `/courses/:id/concepts/review` | Click on a SubConcept row | Expand detail: full definition, LOD URI, source content chunk highlighted, related existing concepts |
| 4 | `/courses/:id/concepts/review` (detail) | See source provenance: which ContentChunk this was extracted from | Original text highlighted with concept annotation |
| 5 | `/courses/:id/concepts/review` (detail) | Click "Approve" | SubConcept verified, `[:TEACHES]` edge upgraded to `[:TEACHES_VERIFIED]`, removed from queue |
| 6 | `/courses/:id/concepts/review` | Next concept auto-loaded | Queue count decremented |
| 7 | `/courses/:id/concepts/review` (detail) | For a duplicate: click "Merge" | Merge modal: select existing SubConcept to merge into |
| 8 | `/courses/:id/concepts/review` (merge modal) | Search existing concepts, select target | Duplicate removed, edges transferred to target concept, queue updated |
| 9 | `/courses/:id/concepts/review` (detail) | For irrelevant concept: click "Reject" | SubConcept marked rejected, `[:TEACHES]` edge removed |
| 10 | `/courses/:id/concepts/review` | All concepts reviewed | "All concepts reviewed!" success state, return to course dashboard |

### Alternative: Syllabus Editor View
| Step | Screen/Page | Action | Expected Result |
|------|-------------|--------|-----------------|
| B1 | `/courses/:id/syllabus` (SyllabusEditor) | See annotated syllabus with extracted concepts highlighted inline | Color-coded: green (verified), yellow (pending), red (rejected) |
| B2 | `/courses/:id/syllabus` | Click a highlighted concept | Inline popup with approve/reject/merge actions |
| B3 | `/courses/:id/syllabus` | Approve inline | Highlight turns green, TEACHES_VERIFIED edge created |

## Error Paths
- **No concepts to review**: Step 2 — "No pending concepts. Upload more content or wait for extraction."
- **Merge target not found**: Step 7 — "No similar concepts found. Create as new?" option
- **Concurrent review conflict**: Step 5 — "This concept was already reviewed by [other reviewer]. Refresh to see current state."
- **Extraction still running**: Step 1 — "Extraction in progress... [X] concepts found so far" with live counter

## APIs Called
| Method | Endpoint | When |
|--------|----------|------|
| GET | `/api/v1/courses/:id/subconcepts?status=pending` | Step 2 — fetch unverified concepts |
| GET | `/api/v1/subconcepts/:id` | Step 3 — fetch concept detail with source |
| POST | `/api/v1/subconcepts/:id/verify-teaches` | Step 5 — approve (TEACHES → TEACHES_VERIFIED) |
| POST | `/api/v1/subconcepts/:id/merge` | Step 8 — merge into target concept |
| POST | `/api/v1/subconcepts/:id/reject` | Step 9 — reject concept |

## Test Scenario (Playwright outline)
Login as: Faculty (Course Director)
Steps:
1. Navigate to course with pending concepts
2. Open concept review queue
3. Approve first concept
4. Reject second concept
5. Verify queue count updates
Assertions:
- Approved concept: Neo4j edge is `TEACHES_VERIFIED` (not `TEACHES`)
- Rejected concept: `TEACHES` edge removed
- Queue count decremented by 2

## Source References
- ARCHITECTURE_v10.md § 2.1 (dedup threshold 0.92)
- NODE_REGISTRY_v1.md § Layer 3 (SubConcept, TEACHES, TEACHES_VERIFIED)
- ROADMAP_v2_3.md § Sprint 5 (concept extraction)
- PRODUCT_BRIEF.md § Tier 0 ("Faculty can see extracted concepts")
- Journey-OS-Seeding-Blueprint-v1_1.md § LOD enrichment
