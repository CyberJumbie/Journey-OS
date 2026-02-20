# STORY-F-53: Critic Agent Service

**Epic:** E-22 (Critic Agent & Review Router)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 13
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-22-1

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need an AI critic agent that scores generated questions on 6 quality metrics so that only high-quality items reach the review queue and low-quality items are caught early.

## Acceptance Criteria
- [ ] Critic agent uses Claude Opus for 6-metric scoring
- [ ] Metrics: clinical accuracy, pedagogical alignment, distractor quality, stem clarity, Bloom fidelity, bias detection
- [ ] Each metric scored 1-5 with justification text
- [ ] Composite score computed as weighted average (weights configurable per institution)
- [ ] Critic returns `CriticResult` with per-metric scores, justifications, and composite
- [ ] Toulmin argumentation structure stored: claim, evidence, warrant, backing, qualifier, rebuttal
- [ ] Provenance chain: links critic output to source concept, SLO, and generation node
- [ ] Custom error classes: `CriticAgentError`, `ScoringTimeoutError`
- [ ] 10-14 API tests: all 6 metrics, composite calculation, weight config, Toulmin structure, timeout handling
- [ ] TypeScript strict, named exports only

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/review/critic.types.ts`, `src/review/toulmin.types.ts` |
| Service | apps/server | `src/services/review/critic-agent.service.ts`, `src/services/review/scoring.service.ts` |
| Prompt | apps/server | `src/services/review/prompts/critic-prompt.builder.ts` |
| Errors | apps/server | `src/errors/critic.errors.ts` |
| Tests | apps/server | `src/services/review/__tests__/critic-agent.test.ts`, `src/services/review/__tests__/scoring.test.ts` |

## Database Schema
No new tables. Critic results stored as JSONB within the existing question review metadata.

Writes to existing:
- `questions` table: `critic_result` JSONB column (may need migration to add)
- Neo4j: `(Question)-[:SCORED_BY]->(CriticResult)` relationship

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/review/score` | Faculty+ | Score a question with critic agent |
| GET | `/api/v1/review/:questionId/scores` | Faculty+ | Get critic scores for a question |

## Dependencies
- **Blocks:** STORY-F-56 (Review Router needs critic scores)
- **Blocked by:** STORY-F-37 (Validation engine exists)
- **Cross-epic:** STORY-F-37 (Sprint 12 validation)

## Testing Requirements
### API Tests (10-14)
1. Scores clinical accuracy metric 1-5 with justification
2. Scores pedagogical alignment metric 1-5
3. Scores distractor quality metric 1-5
4. Scores stem clarity metric 1-5
5. Scores Bloom fidelity metric 1-5
6. Scores bias detection metric 1-5
7. Computes composite as weighted average with default weights
8. Computes composite with custom institutional weights
9. Returns Toulmin structure (claim, evidence, warrant, backing, qualifier, rebuttal) per metric
10. Links provenance chain to source concept and SLO
11. Throws `ScoringTimeoutError` when LLM call exceeds timeout
12. Throws `CriticAgentError` on malformed LLM response
13. Caches critic results for identical question drafts

## Implementation Notes
- Claude Opus selected for critic role due to superior reasoning capability.
- Toulmin model: Claim (the score), Evidence (specific item features), Warrant (why feature implies quality), Backing (NBME guidelines), Qualifier (confidence), Rebuttal (counter-arguments).
- Critic prompt should be few-shot with golden examples per metric.
- Rate limiting: critic calls are expensive -- batch where possible, cache results.
- Metric weight defaults: clinical accuracy 0.25, pedagogical alignment 0.20, distractor quality 0.20, stem clarity 0.15, Bloom fidelity 0.10, bias detection 0.10.
- OOP with `#private` fields for service internals; constructor DI for LLM client and config.
- Use custom error classes only -- no raw `throw new Error()`.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
