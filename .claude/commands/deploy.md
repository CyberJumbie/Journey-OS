---
description: Deploy Journey OS. Three environments — local (always), dev (completed features/epics), production (CD from main).
argument-hint: "[local | dev | prod]"
allowed-tools: Bash, Read
---

# Journey OS — Deployment Guide

## Environment Overview

```
LOCAL          →  DEV                    →  PRODUCTION
pnpm dev          Vercel Preview             Vercel Production
Every story       Completed feature/epic     CD on main merge
localhost:3000    journey-os-dev.vercel.app  journey-os.vercel.app
Manual            Auto on push to dev        Auto on push to main
```

**When to use each:**
- **local** — every story, all the time. `/verify` uses local.
- **dev** — after a story is approved via `/review` and merged to dev. Also after epic exit criteria are met.
- **production** — happens automatically when dev is merged to main. Only merge to main when an epic is fully validated on dev.

---

## LOCAL — Verify Before Any Deployment

```bash
# Start both apps
pnpm dev

# In another terminal — confirm health
curl http://localhost:3001/api/health | jq .
# Expected: { "status": "ok", "version": "...", "neo4j": "ok", "supabase": "ok" }

# Run story smoke test
npx ts-node scripts/validate-graph.ts

# TypeScript + lint clean
pnpm run typecheck && pnpm run lint
```

If local is not green → fix it before deploying anywhere.

---

## DEV — Deploy a Completed Feature or Epic

Dev deploys automatically when code is merged to the `dev` branch via PR.
The CD pipeline handles it: `validate` job passes → `deploy-dev` job fires → Vercel preview deploys.

**To trigger a dev deploy:**
```bash
# 1. Merge your feat branch to dev (via PR — never direct push)
gh pr merge feat/P1-XXX --squash --delete-branch

# 2. CI runs automatically — check it
gh run watch

# 3. Get the dev URL
vercel ls | grep dev | head -3
# OR check GitHub Actions output for the preview URL
```

**Verify the dev deployment:**
```bash
DEV_URL="https://journey-os-dev.vercel.app"

# Health
curl -s $DEV_URL/api/health | jq .

# Auth (replace with test credentials)
curl -s -X POST $DEV_URL/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@msm.edu","password":"testpass123"}' | jq '.user.role'

# Primary endpoint for the story just deployed
curl -s -H "Authorization: Bearer $DEV_JWT" $DEV_URL/api/v1/[resource] | jq .
```

**When to promote dev → production:**
- When an epic's exit criteria are confirmed working on dev
- Not after every story — after a meaningful milestone
- Epic 1.1 exit: Neo4j 560 nodes + CopilotKit STATE_DELTA confirmed on dev
- Epic 1.2 exit: One real syllabus ingested, chunks + embeddings confirmed on dev

---

## PRODUCTION — CD from Main Branch

Production deploys automatically when `dev` is merged to `main`.
**Never push directly to main.** Always merge via PR from dev.

**To release to production:**
```bash
# 1. Confirm dev environment is fully validated for this epic
# 2. Open PR: dev → main
gh pr create --base main --head dev --title "Release: Epic 1.X exit criteria met"

# 3. PR is blocked until:
#    - validate job passes (lint + type-check + build)
#    - protect-main job confirms head branch is dev

# 4. Merge the PR (squash commit with version tag)
gh pr merge --squash

# 5. This triggers deploy-production job automatically
# 6. If smoke fails: auto-rollback issue is opened in GitHub
```

**Monitor the production deployment:**
```bash
# Watch the CI run
gh run list --branch main --limit 3
gh run watch [run-id]

# Confirm production health after deploy
curl -s https://journey-os.vercel.app/api/health | jq .
```

**If production is broken post-deploy:**
```bash
# Run /restore for the failed-deploy scenario
# OR manually rollback via Vercel dashboard → Deployments → promote previous
```

---

## Environment Variables per Environment

| Variable | Local | Dev | Production |
|---|---|---|---|
| `NEO4J_URI` | `.env.local` | Vercel env (preview) | Vercel env (production) |
| `SUPABASE_URL` | `.env.local` | Vercel env (preview) | Vercel env (production) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | dev server URL | prod server URL |

**Dev and production can share the same databases** (Supabase + Neo4j) or use separate instances.
Recommendation: shared Supabase + Neo4j for Phase 1, split in Phase 3+ when data volume matters.

---

## Git Branch → Environment Map

```
feat/P1-XXX   →  local only (never deployed to Vercel)
    ↓ PR
dev           →  auto-deploy to Vercel Preview (dev environment)
    ↓ PR (after epic validation)
main          →  auto-deploy to Vercel Production (CD)
```

---

## Python Services (Phase 4+)

When `python/mip-solver/` or `python/irt-service/` are built, they deploy separately:
- **Local:** `cd python/mip-solver && uvicorn app.main:app --reload --port 8001`
- **Dev/Prod:** Docker container on Railway, Fly.io, or separate Vercel serverless function
- The Express server calls them via `http://mip-solver:8001` (internal) or configured `MIP_SERVICE_URL` env var

A separate CI workflow for Python services will be added in P4-006.
