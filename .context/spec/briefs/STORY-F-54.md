# STORY-F-54: Auto-Tagging Service

**Epic:** E-21 (Validation & Dedup Engine)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 12
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-21-4

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need questions to be automatically tagged with framework mappings, Bloom's taxonomy level, and difficulty so that items are categorized consistently without manual effort.

## Acceptance Criteria
- [ ] Auto-tag assigns USMLE system, discipline, and competency framework tags
- [ ] Bloom's taxonomy level derived from stem verb analysis + LLM classification
- [ ] Difficulty assignment: easy/medium/hard based on concept depth, distractor quality, clinical reasoning level
- [ ] Tags written to both Supabase (question metadata) and Neo4j (relationship edges)
- [ ] DualWriteService pattern: Supabase first -> Neo4j second -> sync_status
- [ ] Tagging runs after validation + dedup pass
- [ ] Tag confidence score included (0-1 float) for each assigned tag
- [ ] Override capability: faculty can manually adjust auto-assigned tags
- [ ] Custom error class: `TaggingServiceError`
- [ ] 10-14 API tests: framework tagging, Bloom assignment, difficulty rating, dual-write sync, confidence scores, manual override
- [ ] TypeScript strict, named exports only

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/validation/tagging.types.ts` |
| Repository | apps/server | `src/repositories/question-tag.repository.ts` |
| Service | apps/server | `src/services/validation/auto-tagging.service.ts`, `src/services/validation/bloom-classifier.service.ts` |
| Errors | apps/server | `src/errors/tagging.errors.ts` |
| Tests | apps/server | `src/services/validation/__tests__/auto-tagging.test.ts`, `src/services/validation/__tests__/bloom-classifier.test.ts` |

## Database Schema

### Supabase -- `question_tags` table
| Column | Type | Constraints |
|--------|------|-------------|
| `id` | uuid | PK, default gen_random_uuid() |
| `question_id` | uuid | NOT NULL, FK -> questions |
| `tag_type` | varchar(50) | NOT NULL, CHECK IN ('usmle_system', 'usmle_discipline', 'bloom_level', 'difficulty') |
| `tag_value` | varchar(255) | NOT NULL |
| `confidence` | float | NOT NULL, CHECK (confidence >= 0 AND confidence <= 1) |
| `source` | varchar(20) | NOT NULL, DEFAULT 'auto', CHECK IN ('auto', 'manual') |
| `created_at` | timestamptz | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | NOT NULL, DEFAULT now() |

### Neo4j Relationships
```
(Question)-[:TAGGED_WITH {confidence: float, source: string}]->(USMLE_System)
(Question)-[:TAGGED_WITH {confidence: float, source: string}]->(USMLE_Discipline)
(Question)-[:AT_BLOOM_LEVEL {confidence: float}]->(BloomLevel)
(Question)-[:DIFFICULTY_RATED {confidence: float}]->(DifficultyLevel)
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/questions/:id/auto-tag` | Faculty+ | Run auto-tagging on a question |
| PATCH | `/api/v1/questions/:id/tags` | Faculty+ | Override auto-assigned tags |
| GET | `/api/v1/questions/:id/tags` | Faculty+ | Get all tags for a question |

## Dependencies
- **Blocks:** STORY-F-57 (Import pipeline uses auto-tagging), STORY-F-68 (Item bank needs tagged items)
- **Blocked by:** STORY-F-37 (Validation engine exists)
- **Cross-epic:** STORY-F-57 (Sprint 17 import pipeline), STORY-F-68 (Sprint 18 item bank)

## Testing Requirements
### API Tests (10-14)
1. Assigns USMLE system tag with confidence score
2. Assigns USMLE discipline tag with confidence score
3. Classifies Bloom's level from stem verb analysis
4. Classifies Bloom's level via LLM when verb analysis is ambiguous
5. Assigns difficulty rating based on concept depth heuristic
6. Writes tags to Supabase `question_tags` table
7. Creates Neo4j relationships with confidence scores
8. DualWriteService sets sync_status = 'synced' on success
9. Low confidence tags (< 0.7) include `low_confidence_tag` warning
10. Manual override updates tag source to 'manual'
11. Override re-writes both Supabase and Neo4j
12. Throws `TaggingServiceError` on LLM classification failure
13. Batch tagging processes multiple questions

## Implementation Notes
- Bloom verb mapping: Remember (define, list), Understand (explain, describe), Apply (calculate, demonstrate), Analyze (differentiate, compare), Evaluate (critique, justify), Create (design, construct).
- Framework tags use SCREAMING_SNAKE_CASE Neo4j labels (e.g., `USMLE_System`).
- Difficulty heuristic: number of reasoning steps, clinical vs. basic science, distractor similarity to correct answer.
- Tag confidence < 0.7 should add `low_confidence_tag` warning for reviewer attention.
- DualWriteService pattern: Supabase first -> Neo4j second -> sync_status = 'synced'.
- OOP with `#private` fields; constructor DI for LLM client, Supabase client, Neo4j client.
- Use `.select().single()` on ALL Supabase write operations.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
