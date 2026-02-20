# STORY-F-55: Self-Correction Retry

**Epic:** E-21 (Validation & Dedup Engine)
**Feature:** F-10 (Quality Review Pipeline)
**Sprint:** 12
**Lane:** faculty (P3)
**Size:** M
**Old ID:** S-F-21-2

---

## User Story
As a **Faculty member (Dr. Amara Osei)**, I need the system to automatically retry LLM generation up to 2 times when validation rules fail so that minor issues are self-corrected without manual intervention.

## Acceptance Criteria
- [ ] Self-correction service accepts a `QuestionDraft` + `ValidationResult` with errors
- [ ] Constructs a correction prompt including violation details and original draft
- [ ] Up to 2 retry attempts before marking as `needs_manual_review`
- [ ] Each retry re-runs full validation suite on corrected output
- [ ] Retry metadata tracked: attempt count, violations per attempt, correction diff
- [ ] Only `error`-severity violations trigger retries (warnings pass through)
- [ ] Circuit breaker: if same rule fails on all retries, flag rule + question for human review
- [ ] Custom error class: `SelfCorrectionError`
- [ ] 8-12 API tests: successful correction, max retries exhausted, partial fix, circuit breaker, metadata tracking
- [ ] TypeScript strict, named exports only

## Reference Screens
**None** -- backend-only story.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Types | packages/types | `src/validation/correction.types.ts` |
| Service | apps/server | `src/services/validation/self-correction.service.ts` |
| Prompt | apps/server | `src/services/validation/correction-prompt.builder.ts` |
| Errors | apps/server | `src/errors/correction.errors.ts` |
| Tests | apps/server | `src/services/validation/__tests__/self-correction.test.ts` |

## Database Schema
No new tables. Correction metadata stored as JSONB on the existing `questions` table:

```sql
-- May need to add column via migration:
-- ALTER TABLE questions ADD COLUMN correction_metadata jsonb DEFAULT NULL;
```

Correction metadata shape:
```json
{
  "attempts": [
    {
      "attempt_number": 1,
      "violations_before": ["RULE_001", "RULE_005"],
      "violations_after": ["RULE_005"],
      "correction_diff": "...",
      "token_usage": 1250
    }
  ],
  "final_status": "validated" | "needs_manual_review",
  "circuit_breaker_rules": ["RULE_005"]
}
```

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/validation/correct` | Internal | Trigger self-correction on a question draft |
| GET | `/api/v1/questions/:id/corrections` | Faculty+ | Get correction history for a question |

## Dependencies
- **Blocks:** STORY-F-53 (Critic agent builds on validated items)
- **Blocked by:** STORY-F-37 (Validation engine exists)
- **Cross-epic:** None

## Testing Requirements
### API Tests (8-12)
1. Successful correction on first retry resolves all violations
2. Successful correction on second retry resolves remaining violations
3. Max retries exhausted marks question as `needs_manual_review`
4. Only error-severity violations trigger retries; warnings pass through
5. Correction prompt includes violation details and original draft
6. Retry re-runs full validation suite on corrected output
7. Retry metadata tracks attempt count and violations per attempt
8. Circuit breaker flags rule when same rule fails on all retries
9. Correction diff tracked between attempts
10. Token usage tracked per correction attempt
11. Throws `SelfCorrectionError` on LLM call failure

## Implementation Notes
- Correction prompt includes specific rule violations and their suggestions from the validation result.
- LLM call uses same provider as generation pipeline (Claude via LangChain).
- Track token usage per correction attempt for cost monitoring.
- Retry delay: immediate (no backoff needed since these are independent LLM calls).
- State transition: `draft` -> `correcting` -> `validated` or `needs_manual_review`.
- OOP with `#private` fields; constructor DI for LLM client, validation service.
- Use custom error classes only -- no raw `throw new Error()`.
- Before writing migration DDL, run `list_tables` via Supabase MCP to verify actual table/column names.
