# Journey OS — Deployment & Infrastructure Guide

**Date:** February 19, 2026  
**Reference:** Architecture v10.0, Cost Model

---

## Environments

| Environment | Purpose | When Created |
|-------------|---------|-------------|
| **local** | Developer machine via Docker Compose | Pre-Sprint 0 |
| **preview** | Per-PR ephemeral (Vercel preview deploys) | Pre-Sprint 0 |
| **staging** | Shared integration testing, real services | Sprint 3 |
| **production** | Live pilot with MSM faculty | Tier 1 pilot launch |

---

## Infrastructure Topology

```
                         ┌──────────────┐
                         │   Vercel      │
                         │   Next.js 15  │
                         │   (frontend)  │
                         └──────┬───────┘
                                │ HTTPS
                                ▼
                    ┌───────────────────────┐
                    │  Railway / AWS ECS     │
                    │  Express Server        │
                    │  ┌─────────────────┐  │
                    │  │ CopilotKit      │  │──── SSE (AG-UI events)
                    │  │ Runtime         │  │
                    │  ├─────────────────┤  │
                    │  │ LangGraph.js    │  │──── Generation pipeline
                    │  │ (14 nodes)      │  │
                    │  ├─────────────────┤  │
                    │  │ Socket.io       │  │──── WebSocket (rooms, notifications)
                    │  ├─────────────────┤  │
                    │  │ REST API        │  │──── HTTP
                    │  └─────────────────┘  │
                    └───┬──────┬──────┬─────┘
                        │      │      │
               ┌────────┘      │      └────────┐
               ▼               ▼               ▼
       ┌──────────────┐ ┌───────────┐ ┌──────────────┐
       │ Supabase     │ │ Neo4j     │ │ Inngest      │
       │ (hosted)     │ │ Aura      │ │ (hosted)     │
       │ PostgreSQL   │ │ (hosted)  │ │ Background   │
       │ pgvector     │ │ Graph DB  │ │ Jobs         │
       │ Auth         │ └───────────┘ └──────────────┘
       │ Storage      │
       │ Realtime     │        ┌──────────────┐
       └──────────────┘        │ Anthropic    │
                               │ Claude API   │
                               ├──────────────┤
                               │ Voyage AI    │
                               │ Embeddings   │
                               └──────────────┘
```

Tier 2 adds:
```
       ┌──────────────┐
       │ Railway       │
       │ Python FastAPI│──── IRT calibration, GNN training
       │ (Tier 2 only)│
       └──────────────┘
```

---

## Environment Variables

### Express Server (`apps/server/.env`)

```bash
# Server
NODE_ENV=production|staging|development
PORT=3001
CORS_ORIGIN=https://journey-os.vercel.app

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only, never exposed to client
SUPABASE_DB_URL=postgresql://postgres:xxx@db.xxxxx.supabase.co:5432/postgres

# Neo4j
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...

# AI
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=voyage-...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Socket.io
SOCKET_IO_CORS_ORIGIN=https://journey-os.vercel.app

# CopilotKit
COPILOTKIT_PUBLIC_API_KEY=...  # If using CopilotKit Cloud (optional)
```

### Next.js Frontend (`apps/web/.env.local`)

```bash
# Public (exposed to browser)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=https://api.journey-os.com
NEXT_PUBLIC_SOCKET_URL=https://api.journey-os.com
NEXT_PUBLIC_COPILOTKIT_PUBLIC_API_KEY=...

# Server-side only (Next.js API routes, if any)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### kg-seeder (`services/kg-seeder/.env`)

```bash
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=...
```

### Secrets Management

- **Development:** `.env` files (gitignored)
- **Staging/Production:** Platform-native secrets (Vercel Environment Variables, Railway Variables)
- **CI/CD:** GitHub Actions Secrets
- **Never in code:** API keys, database passwords, service role keys

---

## CI/CD Pipeline (GitHub Actions)

### On Push to Any Branch

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck          # Zero errors
      - run: pnpm lint                # Zero warnings
      - run: pnpm build               # All packages build
      - run: pnpm test                # All unit + integration tests
```

### On Push to `main`

```yaml
name: Deploy Staging
on:
  push:
    branches: [main]
jobs:
  deploy:
    needs: check
    steps:
      - # Vercel auto-deploys frontend from main
      - # Railway auto-deploys server from main (staging env)
      - # Run E2E tests against staging
      - run: pnpm exec playwright test --project=staging
```

### On Release Tag

```yaml
name: Deploy Production
on:
  push:
    tags: ['v*']
jobs:
  deploy:
    steps:
      - # Promote staging → production (Railway)
      - # Vercel production deploy
      - # Run smoke tests against production
      - # Notify team via Slack/Discord
```

### Database Migrations

```yaml
name: Migrate
on:
  workflow_dispatch:
    inputs:
      environment: { type: choice, options: [staging, production] }
jobs:
  migrate:
    steps:
      - run: pnpm supabase db push --linked  # Supabase migrations
      - run: pnpm kg:seed                      # Neo4j seeder (idempotent)
      - run: pnpm kg:validate                  # Validation gates
```

---

## Local Development Setup

### Prerequisites

- Node.js 20 LTS
- pnpm 8+
- Docker Desktop (for local Supabase + Neo4j)
- Python 3.12+ (Tier 2 only)

### First-Time Setup

```bash
# Clone and install
git clone https://github.com/your-org/journey-os.git
cd journey-os
pnpm install

# Copy env templates
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local

# Start local services
docker compose up -d    # Supabase local, Neo4j local

# Seed the graph
pnpm kg:seed
pnpm kg:validate        # Must pass

# Run everything
pnpm dev                # Turborepo: starts web + server concurrently
```

### Docker Compose (Local Stack)

```yaml
# docker-compose.yml
services:
  supabase-db:
    image: supabase/postgres:15.1.1.61
    ports: ["5432:5432"]
    environment:
      POSTGRES_PASSWORD: postgres
    volumes:
      - supabase-data:/var/lib/postgresql/data

  supabase-studio:
    image: supabase/studio:latest
    ports: ["3000:3000"]
    environment:
      SUPABASE_URL: http://supabase-kong:8000
      STUDIO_PG_META_URL: http://supabase-meta:8080

  neo4j:
    image: neo4j:5.15-community
    ports: ["7474:7474", "7687:7687"]
    environment:
      NEO4J_AUTH: neo4j/localpassword
      NEO4J_PLUGINS: '["apoc"]'
    volumes:
      - neo4j-data:/data

  inngest-dev:
    image: inngest/inngest:latest
    ports: ["8288:8288"]
    command: inngest dev -u http://host.docker.internal:3001/api/inngest

volumes:
  supabase-data:
  neo4j-data:
```

---

## Deployment Checklist (First Production Deploy)

### Before Deploy

- [ ] All environment variables set in Vercel + Railway
- [ ] Supabase project created (Pro plan if > 500MB)
- [ ] Neo4j Aura instance created
- [ ] Anthropic API key provisioned with spending limit
- [ ] Voyage AI API key provisioned
- [ ] Inngest account created, event key configured
- [ ] Custom domain configured (Vercel + Railway)
- [ ] SSL certificates active

### Deploy Steps

1. Tag release: `git tag v1.0.0 && git push --tags`
2. Verify Vercel production deploy succeeds
3. Verify Railway production deploy succeeds
4. Run `pnpm kg:seed` against production Neo4j
5. Run `pnpm kg:validate` — all checks must pass
6. Run Supabase migrations: `pnpm supabase db push`
7. Smoke test: login → upload syllabus → generate one question
8. Verify Socket.io connection (notifications appear)
9. Verify SSE stream (workbench STATE_DELTA renders)

### Post-Deploy Monitoring

- **Vercel:** Built-in analytics for frontend performance
- **Railway:** Logs + metrics for server health
- **Supabase:** Dashboard for DB size, API requests, auth events
- **Neo4j Aura:** Console for query performance, node counts
- **Inngest:** Dashboard for job success/failure rates
- **Anthropic:** Usage dashboard for token consumption + costs
- **Application:** `generation_logs` table for pipeline timing + costs per item

---

## Scaling Triggers

| Signal | Action | When |
|--------|--------|------|
| Express response time > 500ms p95 | Scale Railway to 2 instances | Tier 1 |
| Neo4j query time > 100ms | Upgrade Aura plan or add indexes | Tier 1 |
| Supabase DB > 6GB | Consider Team plan or self-host | Tier 2 |
| Concurrent generation sessions > 20 | Add Express instances behind load balancer | Tier 2 |
| Anthropic rate limits hit | Request rate limit increase or add request queuing | Tier 2 |
| 3+ institutions | Evaluate multi-region deployment | Tier 3 |

---

*This guide covers development through Tier 2. Tier 3 multi-institution deployment will require a dedicated infrastructure review covering data residency, tenant isolation, and regional compliance.*
