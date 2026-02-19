# E-11: Content Processing Pipeline

**Feature:** F-05
**Estimated Sprints:** 1
**Sprint Assignment:** Sprint 4

## Definition of Done
- Inngest pipeline: parse → clean → chunk (800 tokens, 100-token overlap) → embed (Voyage AI, 1024-dim)
- Real-time processing progress via SSE
- Dual-write processed chunks to Supabase + Neo4j
- Error handling with retry for transient failures
- Processing status visible in UI (pending → processing → complete → error)

## User Flows Enabled
- UF-09: Content Upload & Processing — fully enabled

## Story Preview
- Story: Inngest content pipeline — parse/clean/chunk/embed steps
- Story: Voyage AI embedding integration — 1024-dim embeddings for chunks
- Story: Processing progress UI — real-time status via SSE
- Story: Dual-write chunks — Supabase + Neo4j content nodes

## Source References
- F-05 feature definition
- UF-09 user flow
