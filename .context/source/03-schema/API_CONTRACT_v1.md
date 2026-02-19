# Journey OS — API Contract Specification v1.0

**Date:** February 19, 2026  
**Purpose:** Every REST endpoint, request/response shape, error code, and auth requirement in one document. Frontend engineers code against this. Backend engineers implement to this.  
**Reference:** Architecture v10.0, SUPABASE_DDL v1.0

---

## Conventions

- Base URL: `/api/v1`
- Auth: Bearer JWT (Supabase Auth) in `Authorization` header
- All responses: `{ data, error, meta }` envelope
- Dates: ISO 8601
- IDs: UUID v4
- Pagination: `?page=1&limit=20` → `meta: { page, limit, total, total_pages }`
- Role enforcement: middleware checks JWT `role` claim

---

## Auth & Users

### `POST /api/v1/auth/me`
**Auth:** Any authenticated  
**Response:**
```json
{
  "data": {
    "id": "uuid",
    "email": "faculty@msm.edu",
    "role": "faculty",
    "is_course_director": true,
    "institution_id": "uuid",
    "institution_name": "Morehouse School of Medicine",
    "display_name": "Dr. Jamal Carter",
    "onboarding_complete": true
  }
}
```

### `GET /api/v1/users` 
**Auth:** institutional_admin, superadmin  
**Query:** `?role=faculty&page=1&limit=20`

### `PATCH /api/v1/users/:id`
**Auth:** institutional_admin, superadmin  
**Body:** `{ role, is_course_director, display_name }`

---

## Institutions & Waitlist

### `POST /api/v1/waitlist`
**Auth:** None (public)  
**Body:** `{ institution_name, domain, contact_name, contact_email, description }`

### `GET /api/v1/waitlist`
**Auth:** superadmin  
**Query:** `?status=pending`

### `POST /api/v1/waitlist/:id/approve`
**Auth:** superadmin  
**Response:** Creates institution, sends invitation email

### `GET /api/v1/institutions`
**Auth:** superadmin  

### `GET /api/v1/institutions/:id`
**Auth:** institutional_admin (own), superadmin

---

## Courses

### `GET /api/v1/courses`
**Auth:** faculty, institutional_admin  
**Query:** `?phase=preclinical&year=2025-2026`  
**Response:** Courses with coverage stats
```json
{
  "data": [{
    "id": "uuid",
    "code": "MEDI531",
    "name": "Organ Systems I",
    "phase": "Pre-clerkship",
    "block": "Organ Systems",
    "ilo_count": 12,
    "slo_count": 48,
    "coverage_pct": 0.73,
    "item_count": 156
  }]
}
```

### `POST /api/v1/courses`
**Auth:** faculty (is_course_director), institutional_admin  
**Body:** `{ code, name, block_id, credits, type, description }`

### `GET /api/v1/courses/:id`
**Auth:** faculty  
**Response:** Full course with structure, ILOs, sections, coverage

### `GET /api/v1/courses/:id/ilos`
**Auth:** faculty  
**Response:** ILOs with framework mappings
```json
{
  "data": [{
    "id": "uuid",
    "description": "Explain the pathophysiology of atherosclerosis",
    "frameworks": {
      "lcme": ["7.2"],
      "acgme": ["medical_knowledge"],
      "ume": ["mk_3"],
      "epa": [2]
    },
    "slo_count": 6,
    "coverage_pct": 0.83
  }]
}
```

### `GET /api/v1/courses/:id/slos`
**Auth:** faculty  
**Query:** `?session_id=uuid&unmapped=true`

---

## Content Upload & Processing

### `POST /api/v1/courses/:courseId/upload`
**Auth:** faculty  
**Body:** `multipart/form-data` with `file` + `{ document_type, session_id? }`  
**Response:**
```json
{
  "data": {
    "upload_id": "uuid",
    "filename": "Atherosclerosis_Lecture.pptx",
    "status": "parsing",
    "inngest_run_id": "run_xxx"
  }
}
```

### `GET /api/v1/uploads/:id/status`
**Auth:** faculty  
**Response:**
```json
{
  "data": {
    "id": "uuid",
    "status": "embedding",
    "stages": {
      "parse": "complete",
      "clean": "complete",
      "chunk": "complete",
      "embed": "in_progress",
      "extract": "pending",
      "dual_write": "pending"
    },
    "chunk_count": 47,
    "concept_count": null
  }
}
```

### `GET /api/v1/content-chunks`
**Auth:** faculty  
**Query:** `?course_id=uuid&session_id=uuid&page=1&limit=50`

---

## Concepts & Learning Objectives

### `GET /api/v1/subconcepts`
**Auth:** faculty  
**Query:** `?course_id=uuid&search=atherosclerosis&usmle_system=cardiovascular`

### `GET /api/v1/subconcepts/:id`
**Auth:** faculty  
**Response:** Full SubConcept with LOD, relationships, coverage
```json
{
  "data": {
    "id": "uuid",
    "name": "Atherosclerotic Plaque Formation",
    "umls_cui": "C0004153",
    "lod_enriched": true,
    "usmle_systems": ["Cardiovascular"],
    "usmle_disciplines": ["Pathology"],
    "prerequisites": ["uuid1", "uuid2"],
    "related_concepts": ["uuid3"],
    "misconceptions": ["Confuses stable vs unstable plaque"],
    "content_chunks": 5,
    "assessment_items": 12,
    "coverage_pct": 0.8
  }
}
```

### `POST /api/v1/subconcepts/:id/verify-teaches`
**Auth:** faculty  
**Body:** `{ chunk_id, action: "verify" | "reject" }`  
**Effect:** Upgrades TEACHES → TEACHES_VERIFIED or deletes TEACHES

### `POST /api/v1/slos`
**Auth:** faculty  
**Body:** `{ text, session_id, bloom_level }`

### `POST /api/v1/slos/:id/fulfill`
**Auth:** faculty  
**Body:** `{ ilo_id }`  
**Effect:** Creates SLO -[:FULFILLS]-> ILO

### `POST /api/v1/ilos/:id/map-framework`
**Auth:** faculty (is_course_director)  
**Body:** `{ framework_type: "acgme" | "lcme" | "epa" | "ume", framework_code: "..." }`

---

## Generation

### `POST /api/v1/generate`
**Auth:** faculty  
**Body:**
```json
{
  "mode": "single",
  "course_id": "uuid",
  "session_id": "uuid",
  "params": {
    "bloom_level": 4,
    "subconcept_id": "uuid",
    "format": "single_best_answer"
  },
  "automation_level": "checkpoints"
}
```
**Response:** SSE stream of AG-UI events (STATE_DELTA, TEXT_MESSAGE, etc.)

### `POST /api/v1/generate/bulk`
**Auth:** faculty (is_course_director)  
**Body:**
```json
{
  "course_id": "uuid",
  "targets": [
    { "subconcept_id": "uuid", "bloom_level": 3, "count": 2 },
    { "subconcept_id": "uuid", "bloom_level": 5, "count": 1 }
  ],
  "parallelism": 5
}
```
**Response:** `{ batch_id, inngest_run_id, total_items }`

### `GET /api/v1/generate/batch/:batchId`
**Auth:** faculty  
**Response:** Batch status with per-item progress

### `GET /api/v1/generate/history`
**Auth:** faculty  
**Query:** `?course_id=uuid&page=1&limit=20`

---

## Assessment Items

### `GET /api/v1/items`
**Auth:** faculty  
**Query:** `?status=approved&bloom=4&usmle_system=cardiovascular&page=1&limit=20`

### `GET /api/v1/items/:id`
**Auth:** faculty  
**Response:** Full item with options, Toulmin, Critic scores, sources, coverage chain

### `POST /api/v1/items/:id/review`
**Auth:** faculty  
**Body:** `{ action: "approve" | "reject" | "edit", notes?: string, edits?: { ... } }`

### `GET /api/v1/items/:id/coverage-chain`
**Auth:** faculty  
**Response:** Full chain from item to all framework endpoints

---

## Gap Detection & Analytics

### `GET /api/v1/gaps/usmle-heatmap`
**Auth:** faculty  
**Query:** `?course_id=uuid`  
**Response:**
```json
{
  "data": {
    "systems": ["Cardiovascular", "Respiratory", ...],
    "disciplines": ["Anatomy", "Pathology", ...],
    "cells": [
      { "system": "Cardiovascular", "discipline": "Pathology", "item_count": 12, "coverage": 0.8 },
      { "system": "Renal", "discipline": "Pharmacology", "item_count": 0, "coverage": 0.0 }
    ]
  }
}
```

### `GET /api/v1/gaps/usmle-topics`
**Auth:** faculty  
**Query:** `?system=Cardiovascular`  
**Response:** USMLE_Topic nodes with SubConcept coverage counts

### `GET /api/v1/analytics/dashboard`
**Auth:** faculty  
**Response:** Activity feed, generation stats, coverage summary, gap alerts

---

## Notifications

### `GET /api/v1/notifications`
**Auth:** Any authenticated  
**Query:** `?unread=true&page=1&limit=20`

### `PATCH /api/v1/notifications/:id/read`
**Auth:** Owner

---

## Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request body |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | Role insufficient for action |
| 403 | `CROSS_INSTITUTION` | RLS violation — accessing another institution's data |
| 404 | `NOT_FOUND` | Entity does not exist |
| 409 | `DUPLICATE` | Entity already exists (dedup) |
| 422 | `GENERATION_FAILED` | Pipeline failed after retries |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `NEO4J_UNAVAILABLE` | Knowledge graph unreachable |
| 502 | `CLAUDE_UNAVAILABLE` | AI model unreachable |

---

*This API contract is the single source of truth for all HTTP endpoints. Frontend and backend teams code against this document. Changes require version bumps.*
