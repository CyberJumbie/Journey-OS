# Journey OS

AI-powered competency-based medical education platform for Morehouse School of Medicine.

**Status:** Pre-production. All architecture specified. Zero production code. Start at Epic 1.1.

---

## Start Here

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env templates
cp .env.example .env.local
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env.local

# 3. Fill in real values in backend/.env.local (Neo4j, Supabase, Anthropic, Voyage keys)

# 4. Open Claude Code in this directory
# Claude will read .claude/CLAUDE.md automatically

# 5. See what to build next
/next

# 6. Start building
/story P1-001
```

---

## Architecture

```
frontend/     → Next.js 15, Atomic Design, Vercel
backend/      → Express MVC, LangGraph.js, OOP patterns, Railway
python/       → FastAPI microservices (Phase 4+), Railway
packages/     → Shared TypeScript types
seeder/       → Neo4j seed scripts (one-shot)
```

Full details: `docs/FOLDER_STRUCTURE.md`

## Build Order (Phase 1)

Epic 1.1 (Weeks 1–2): P1-001 → P1-002 → P1-003 → P1-004 → P1-005 → P1-006 → P1-007 → P1-008

Epic 1.2 (Weeks 3–4): P1-009 → P1-014 → P1-010 → P1-011 → P1-012 → P1-013 → P1-015

Epic 1.3 (Weeks 5–6): P1-016 → P1-017 → P1-018 → P1-019 → P1-020 → P1-021 → P1-022 → P1-023

Epic 1.4 (Weeks 7–8): P1-024 → P1-025 → P1-026 → P1-027 → P1-028 → P1-029

## Key Files

| File | Purpose |
|------|---------|
| `.claude/CLAUDE.md` | Project constitution — Claude reads this first |
| `docs/FOLDER_STRUCTURE.md` | Where every file goes |
| `docs/stories/` | Story files with ACs + context packets |
| `docs/solutions/` | Reusable implementation patterns (SOL-NNN) |
| `BACKLOG.md` | All 29 Phase 1 stories scored and sorted |
| `SESSION_STATE.md` | Current build state |

## Claude Code Commands

```
/next          → what to build right now
/story P1-001  → load story + context packet
/plan          → generate implementation plan
/implement     → build it
/verify        → run smoke tests
/review        → audit against 10 rules
/compound      → extract patterns, update docs
/commit        → push + PR
/clear         → end session, save state
```
