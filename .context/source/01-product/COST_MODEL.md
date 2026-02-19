# Journey OS — Cost Model & Infrastructure Budget

**Date:** February 19, 2026  
**Scope:** Projected costs from development through Tier 3 production  
**Assumptions:** MSM single-institution pilot → 3 institutions by Tier 3

---

## AI Model Costs (Claude + Voyage)

### Per-Item Generation Cost Breakdown

| Pipeline Node | Model | Input Tokens | Output Tokens | Cost/Item |
|--------------|-------|-------------|--------------|-----------|
| context_compiler (Agentic RAG) | Haiku | ~4,000 | ~500 | $0.003 |
| vignette_builder | Sonnet | ~3,000 | ~300 | $0.012 |
| stem_writer | Sonnet | ~2,000 | ~200 | $0.008 |
| distractor_generator (Phase 1+2) | Sonnet | ~3,500 | ~600 | $0.015 |
| tagger | Haiku | ~1,500 | ~200 | $0.002 |
| validator (semantic checks) | Sonnet | ~2,000 | ~300 | $0.008 |
| critic_agent | Opus | ~4,000 | ~500 | $0.045 |
| **Subtotal per item (Claude)** | | | | **$0.093** |
| Voyage AI embedding (1024-dim) | voyage-large-2 | ~800 tokens | — | $0.001 |
| **Total per generated item** | | | | **~$0.094** |

Notes:
- Items that fail validation and retry add ~30% to cost for those items (~15% of items retry)
- Bulk generation amortizes context_compiler across items sharing the same SubConcept
- Auto-rejected items (~10%) still incur full pipeline cost

### Per-Item Ingestion Cost (Content Upload)

| Step | Model | Cost/Chunk |
|------|-------|-----------|
| Concept extraction | Haiku | $0.001 |
| LOD enrichment | Haiku | $0.001 |
| Embedding | Voyage | $0.0005 |
| **Per chunk** | | **~$0.0025** |

A typical lecture produces ~50 chunks → **~$0.13 per lecture ingested.**
A typical course has ~30 lectures → **~$3.90 per course ingested.**

### Monthly AI Spend Projections

| Phase | Activity | Volume | Monthly Cost |
|-------|----------|--------|-------------|
| **Tier 0 dev** | Testing + iteration | ~500 items/month | ~$50 |
| **Tier 1 pilot** (1 course) | Generation + ingestion | ~200 items/month + 5 uploads | ~$25 |
| **Tier 1 expanded** (10 courses) | Generation + ingestion + relinting | ~1,000 items/month | ~$120 |
| **Tier 2** (+ student practice) | Generation + adaptive (mastery queries, no AI) | ~2,000 items/month | ~$220 |
| **Tier 3** (3 institutions) | Full production | ~5,000 items/month | ~$520 |

---

## Infrastructure Costs

### Neo4j Aura

| Tier | Plan | Nodes | Monthly Cost |
|------|------|-------|-------------|
| Tier 0 | **Free** | < 200K nodes, 50K relationships | $0 |
| Tier 1 | **Free** (may hit limits) | ~10K nodes, ~50K rels | $0 |
| Tier 1 late | **Professional** (if free exceeded) | ~15K+ nodes | ~$65/month |
| Tier 2 | Professional | ~50K nodes (student mastery) | ~$65/month |
| Tier 3 | Professional or Enterprise | ~200K+ nodes | $65–$400/month |

**Trigger to upgrade from Free:** 200K nodes or 50K relationships, whichever hits first. Student mastery nodes (ConceptMastery × Students × SubConcepts) are the growth driver. 200 students × 500 concepts = 100K ConceptMastery nodes.

### Supabase

| Tier | Plan | Storage | Monthly Cost |
|------|------|---------|-------------|
| Tier 0 | **Free** | 500MB DB, 1GB storage | $0 |
| Tier 1 | **Pro** | 8GB DB, 100GB storage | $25/month |
| Tier 2 | Pro | 8GB+ (embeddings grow) | $25/month |
| Tier 3 | **Team** | Multi-institution | $599/month |

**Trigger to upgrade Free → Pro:** 500MB database limit. Embeddings are the driver: 10K chunks × 1024-dim × 4 bytes = ~40MB for vectors alone. Plus text content, assessment items, logs. Expect to hit 500MB around Sprint 5.

**Trigger to upgrade Pro → Team:** Multi-institution needs better access controls, or >8GB database.

### Embedding Storage Math

| Entity | Count (Tier 1) | Vector Size | Storage |
|--------|----------------|-------------|---------|
| content_chunk_embeddings | ~5,000 | 4KB each | ~20MB |
| concept_embeddings | ~1,000 | 4KB | ~4MB |
| question_embeddings | ~2,000 | 4KB | ~8MB |
| slo_embeddings | ~500 | 4KB | ~2MB |
| **Total vectors** | | | **~34MB** |

HNSW index overhead: ~2× vector storage = ~68MB total for vectors + indexes. Well within Supabase Pro limits.

### Hosting (Application)

| Component | Option A (Budget) | Option B (Production) |
|-----------|-------------------|----------------------|
| Next.js frontend | Vercel Free/Pro ($0–20) | Vercel Pro ($20) |
| Express backend | Railway ($5–20) | AWS ECS Fargate (~$50) |
| Inngest | Free tier (dev) → Pro ($25) | Pro ($25–50) |
| **Monthly hosting** | **$5–45** | **$95–120** |

### Python Service (Tier 2+)

| Component | Cost |
|-----------|------|
| FastAPI on Railway/Render | $5–15/month |
| GPU for GNN training (occasional) | ~$2–5/run on Lambda/RunPod |

---

## Total Monthly Cost by Phase

| Phase | AI | Neo4j | Supabase | Hosting | Inngest | Total |
|-------|-----|-------|----------|---------|---------|-------|
| **Development** | $50 | $0 | $0 | $5 | $0 | **~$55/mo** |
| **Tier 0 pilot** | $25 | $0 | $0 | $5 | $0 | **~$30/mo** |
| **Tier 1 (1 course)** | $25 | $0 | $25 | $20 | $0 | **~$70/mo** |
| **Tier 1 (10 courses)** | $120 | $0–65 | $25 | $20 | $25 | **~$190–255/mo** |
| **Tier 2 (+ students)** | $220 | $65 | $25 | $95 | $25 | **~$430/mo** |
| **Tier 3 (3 institutions)** | $520 | $200 | $599 | $120 | $50 | **~$1,490/mo** |

---

## Unit Economics

| Metric | Value |
|--------|-------|
| Cost per generated item | ~$0.09 |
| Cost per approved item (accounting for rejects/retries) | ~$0.13 |
| Cost per course ingested | ~$4 |
| Cost per student per month (Tier 2, practice) | ~$0 incremental (mastery is graph queries, no AI) |
| Break-even vs. faculty time (at $100/hr, 45 min/question) | ~$75 saved per item → **577× ROI on AI cost** |

---

## Cost Optimization Levers

1. **Model routing already optimized.** Haiku for extraction/tagging ($0.003), Sonnet for generation ($0.01–0.015), Opus only for critic ($0.045). Without routing, everything on Opus would cost ~$0.50/item.

2. **Batch embedding.** Voyage AI batch API is cheaper than single-call. Use for ingestion pipelines.

3. **Caching.** Context compiler results for the same SubConcept + Bloom can be cached for 24 hours. Cuts repeated context compilation in bulk generation.

4. **Prompt compression.** Context Refiner (Haiku) filters irrelevant chunks before expensive Sonnet calls. 4K token budget keeps generation prompts lean.

5. **Supabase self-hosting.** If Tier 3 costs become significant, self-hosted Supabase on a $50/month VPS eliminates the $599/month Team plan.

---

## Budget Approval Thresholds

| Decision | When | Approx. Cost |
|----------|------|-------------|
| Anthropic API key | Pre-Sprint 0 | ~$50/month initially |
| Voyage AI API key | Sprint 4 | ~$5/month initially |
| Supabase Free → Pro | Sprint 5 (500MB hit) | $25/month |
| Neo4j Free → Professional | Tier 1 late or Tier 2 | $65/month |
| Inngest Free → Pro | Sprint 14 (batch gen) | $25/month |
| Production hosting (Vercel + Railway/AWS) | Tier 1 pilot | $20–120/month |

---

*All costs are estimates based on current pricing as of February 2026. Claude API pricing, Voyage AI pricing, and infrastructure pricing may change. The model routing strategy (§3.8 of Architecture v10.0) is the primary cost control mechanism.*
