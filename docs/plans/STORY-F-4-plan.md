# Plan: STORY-F-4 — Template Model & CRUD

## Tasks (from brief, with refinements)

| # | Task | File Path | Notes |
|---|------|-----------|-------|
| 1 | TypeScript types | `packages/types/src/template/template.types.ts` | All interfaces, const arrays, DTOs. Follow notification.types.ts pattern: Row type + DTO + Request shapes + ListQuery + ListResponse |
| 2 | Types barrel export | `packages/types/src/template/index.ts` | `export * from "./template.types"` |
| 3 | Types root barrel | `packages/types/src/index.ts` (modify) | Add `export * from "./template"` |
| 4 | Rebuild types package | `tsc -b packages/types/tsconfig.json` | CRITICAL: must run before any server code touches new types |
| 5 | Custom error classes | `apps/server/src/errors/template.error.ts` | 3 classes: `TemplateNotFoundError`, `TemplatePermissionError`, `TemplateVersionNotFoundError` |
| 6 | Errors barrel update | `apps/server/src/errors/index.ts` (modify) | Add export line. **Re-read after edit** to guard against hook stripping |
| 7 | Domain model | `apps/server/src/models/template.model.ts` | JS `#private` fields, public getters, `canBeAccessedBy()`, `canBeEditedBy()`, `assertOwnership()`, `createVersionSnapshot()`, `update()`, `toDTO()`, `toNeo4jProperties()`, `static fromRow()` |
| 8 | Repository | `apps/server/src/repositories/template.repository.ts` | Dual-write pattern: Supabase first → Neo4j second → sync_status. Methods: `create`, `findById`, `findAccessible`, `update`, `delete`, `createVersion`, `findVersions`, `updateNeo4jId`. All writes use `.select().single()` |
| 9 | Service | `apps/server/src/services/template/template.service.ts` | Business logic: ownership checks, sharing-level access, versioning (snapshot before update), duplicate logic. Constructor DI: `TemplateRepository` + `Driver | null` |
| 10 | Controller | `apps/server/src/controllers/template/template.controller.ts` | 8 handlers: create, list, getById, update, delete, duplicate, getVersions. Zod validation. Double-cast for `req.user`. `#handleError` with instanceof checks |
| 11 | Route registration | `apps/server/src/index.ts` (modify) | Wire repo → service → controller → `app.post/get/put/delete` with `rbac.require(AuthRole.FACULTY)`. Register AFTER existing routes |
| 12 | Supabase migration | `templates` + `template_versions` tables + RLS + indexes | Via Supabase MCP `apply_migration` |
| 13 | Service tests | `apps/server/src/tests/template/template.service.test.ts` | 10 tests per brief Section 10.1 |
| 14 | Controller tests | `apps/server/src/tests/template/template.controller.test.ts` | 8 tests per brief Section 10.2 |

## Implementation Order

```
Types (1-4) → Errors (5-6) → Migration (12) → Model (7) → Repository (8) → Service (9) → Controller (10) → Routes (11) → Service Tests (13) → Controller Tests (14)
```

Migration moves earlier because the repository references the table schema; having the DDL applied first validates assumptions.

## Patterns to Follow

| Pattern | Reference |
|---------|-----------|
| Repository (Supabase + dual-write) | `apps/server/src/repositories/course.repository.ts` — JS `#private` field, `TABLE` const, `.select().single()` on writes, `.maybeSingle()` on reads, `#toDTO()` mapper, `updateNeo4jId()` method |
| Service (dual-write) | `apps/server/src/services/course/course.service.ts` — `#tryNeo4jCreate`, `#tryNeo4jUpdate`, `console.warn` on Neo4j failure (graceful degradation) |
| Controller (error handling) | `apps/server/src/controllers/course/course.controller.ts` — double-cast `(req as unknown as Record<string, unknown>).user`, param narrowing `typeof id !== "string"`, `#handleError` with instanceof chain |
| Mock factory | `docs/solutions/supabase-mock-factory.md` — separate mock objects per chain stage |
| Pagination | `docs/solutions/admin-paginated-list-pattern.md` — `Promise.all([dataQuery, countQuery])` |
| Error classes | `apps/server/src/errors/notification.error.ts` — extends `JourneyOSError`, custom code strings |
| Transactional writes | `docs/solutions/supabase-transactional-rpc-pattern.md` — update + version insert is multi-table, but since version is append-only and template update can succeed independently, sequential writes are acceptable here (no RPC needed) |

## Testing Strategy

### API Tests (18 total)
- **Service tests (10):** create with defaults, difficulty validation, owner access, non-owner private denied, same-institution shared access, version snapshot on update, non-owner update denied, non-owner delete denied, duplicate ownership, list filtering
- **Controller tests (8):** POST 201, POST 400 validation, GET 200 pagination, GET 404 not found, PUT 403 non-owner, DELETE 204 success, POST duplicate 201, GET versions

### E2E: No — backend-only story. E2E comes with STORY-F-14.

## Figma Make
- [x] Code directly (backend-only, no UI)

## Risks / Edge Cases

1. **Barrel file stripping** — CLAUDE.md warns PostToolUse eslint hook strips "unused" exports from barrel files. Must re-read and verify after every barrel edit.
2. **Difficulty distribution float precision** — `Math.abs(sum - 1.0) < 0.001` tolerance needed (not strict equality).
3. **`shared_course` without `course_id`** — Brief says treat as `private` if `scope_config.course_id` is missing when sharing_level is `shared_course`.
4. **Neo4j graceful degradation** — If Neo4j driver is null or write fails, sync_status stays `pending`. Service must not throw.
5. **Version snapshot atomicity** — The update flow is: (1) snapshot current state as version, (2) apply update. If step 2 fails after step 1, an orphan version exists. Acceptable trade-off — versions are immutable append-only records.
6. **Type rebuild** — Must run `tsc -b packages/types/tsconfig.json` after creating types, before any server code references them.

## Acceptance Criteria (verbatim from brief)

- [ ] Template model: `name`, `description`, `question_type`, `difficulty_distribution`, `bloom_levels`, `scope_config`, `prompt_overrides`, `metadata`
- [ ] CRUD operations: create, read, update, delete with ownership checks
- [ ] Sharing: templates can be `private`, `shared_course`, `shared_institution`, `public`
- [ ] Duplicate template: copy an existing template as starting point
- [ ] Template versioning: edit creates new version, previous versions accessible
- [ ] DualWriteService: Supabase `templates` table + Neo4j `Template` node
- [ ] Ownership: creator is owner; shared templates are read-only to non-owners
- [ ] Custom error classes: `TemplateNotFoundError`, `TemplatePermissionError`
- [ ] 10-14 API tests: CRUD operations, sharing levels, ownership checks, versioning, dual-write
- [ ] TypeScript strict, named exports only
