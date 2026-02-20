# STORY-ST-1 Brief: FastAPI Service Scaffold

## 0. Lane & Priority

```yaml
story_id: STORY-ST-1
old_id: S-ST-40-1
lane: student
lane_priority: 4
within_lane_order: 1
sprint: 31
size: M
depends_on:
  - STORY-U-6 (universal) — RBAC Middleware ✅ DONE
blocks:
  - STORY-ST-3 — BKT Mastery Estimation
  - STORY-ST-4 — IRT Item Calibration
  - STORY-ST-10 — Adaptive Item Selection
personas_served: [developer]
epic: E-40 (BKT & IRT Engine)
feature: F-19 (Adaptive Practice)
user_flow: UF-32 (Adaptive Practice Session)
```

## 1. Summary

Build a **production-ready Python/FastAPI service** in `packages/python-api` that serves as the runtime for all IRT and BKT adaptive learning algorithms. This scaffold provides health check, JWT authentication (validating Supabase tokens), CORS, structured logging, error handling, Neo4j async driver, and Supabase client. It will be reused by E-44 (Risk Prediction Engine) in Sprint 37.

Key constraints:
- **JWT validation must match Supabase token format** — same `AuthTokenPayload` shape as Express server
- **OOP patterns adapted for Python** — private fields via `_` prefix (Python convention), constructor DI
- **Neo4j async driver** — `neo4j.AsyncGraphDatabase` with connection pooling
- **Docker-ready** — multi-stage Dockerfile for dev and production
- **uv for dependency management** — modern, fast Python package manager with lock file

## 2. Task Breakdown

1. **Project structure** — Initialize `packages/python-api/` with `pyproject.toml`, `uv.lock`, `Dockerfile`, `.env.example`
2. **Configuration** — `packages/python-api/src/config/settings.py` with pydantic-settings `Settings` class loading `.env`
3. **Error classes** — `packages/python-api/src/errors/base.py` with `JourneyOSError`, `AuthenticationError`, `ForbiddenError`, `ValidationError`, `NotFoundError`
4. **Logging** — `packages/python-api/src/config/logging.py` with structured JSON logging and correlation ID middleware
5. **JWT middleware** — `packages/python-api/src/middleware/auth.py` validating Supabase JWTs, extracting `AuthTokenPayload`
6. **CORS middleware** — `packages/python-api/src/config/cors.py` matching Express server CORS config
7. **Neo4j client** — `packages/python-api/src/config/neo4j.py` with async connection pool and health check
8. **Supabase client** — `packages/python-api/src/config/supabase.py` with `supabase-py` initialization
9. **Health endpoint** — `packages/python-api/src/routes/health.py` with `GET /health` returning service status + dependency checks
10. **App factory** — `packages/python-api/src/main.py` assembling all middleware, routes, and error handlers
11. **Error handler middleware** — `packages/python-api/src/middleware/error_handler.py` converting exceptions to `ApiResponse` envelope
12. **Docker** — `packages/python-api/Dockerfile` with multi-stage build (dev + prod)
13. **pytest setup** — `packages/python-api/tests/conftest.py` with auth fixtures, test client, mock Neo4j/Supabase
14. **OpenAPI** — Auto-generated at `/docs` by FastAPI (no extra work, verify it renders)

## 3. Data Model

```python
# packages/python-api/src/models/auth.py

from enum import StrEnum
from pydantic import BaseModel, Field


class AuthRole(StrEnum):
    """Must mirror packages/types/src/auth/roles.types.ts AuthRole enum."""
    SUPERADMIN = "superadmin"
    INSTITUTIONAL_ADMIN = "institutional_admin"
    FACULTY = "faculty"
    ADVISOR = "advisor"
    STUDENT = "student"


ROLE_HIERARCHY: dict[AuthRole, int] = {
    AuthRole.SUPERADMIN: 100,
    AuthRole.INSTITUTIONAL_ADMIN: 80,
    AuthRole.FACULTY: 60,
    AuthRole.ADVISOR: 40,
    AuthRole.STUDENT: 20,
}


class AuthTokenPayload(BaseModel):
    """JWT payload extracted from Supabase Auth JWT.
    Must mirror packages/types/src/auth/auth.types.ts AuthTokenPayload.
    """
    sub: str
    email: str
    role: AuthRole
    institution_id: str
    is_course_director: bool
    aud: str
    exp: int
    iat: int


class ApiError(BaseModel):
    code: str
    message: str


class ApiResponse(BaseModel):
    """Standard API response envelope.
    Must mirror packages/types/src/auth/auth.types.ts ApiResponse<T>.
    """
    data: dict | list | None = None
    error: ApiError | None = None
    meta: dict | None = None
```

```python
# packages/python-api/src/models/health.py

from pydantic import BaseModel


class DependencyStatus(BaseModel):
    status: str  # "ok" | "error"
    latency_ms: float | None = None
    error: str | None = None


class HealthResponse(BaseModel):
    status: str  # "ok" | "degraded" | "error"
    version: str
    timestamp: str
    uptime_seconds: float
    dependencies: dict[str, DependencyStatus]
```

## 4. Database Schema

No new tables or migrations. This story creates the Python runtime only.

**Neo4j connection** reads existing nodes:
```cypher
-- Health check query (verify connectivity)
RETURN 1 AS ok
```

**Supabase connection** reads existing tables:
```sql
-- Health check query (verify connectivity)
SELECT 1 AS ok;
```

## 5. API Contract

### GET /health (Public — no auth)

**Success Response (200):**
```json
{
  "data": {
    "status": "ok",
    "version": "0.1.0",
    "timestamp": "2026-02-19T10:00:00Z",
    "uptime_seconds": 3600.5,
    "dependencies": {
      "neo4j": { "status": "ok", "latency_ms": 12.3 },
      "supabase": { "status": "ok", "latency_ms": 8.1 }
    }
  },
  "error": null
}
```

**Degraded Response (200):**
```json
{
  "data": {
    "status": "degraded",
    "version": "0.1.0",
    "timestamp": "2026-02-19T10:00:00Z",
    "uptime_seconds": 3600.5,
    "dependencies": {
      "neo4j": { "status": "error", "latency_ms": null, "error": "Connection refused" },
      "supabase": { "status": "ok", "latency_ms": 8.1 }
    }
  },
  "error": null
}
```

### GET /docs (Public — no auth)

OpenAPI Swagger UI auto-generated by FastAPI. No custom implementation needed.

### Authentication Header Format (all protected endpoints)

```
Authorization: Bearer <supabase-jwt-token>
```

**JWT claims expected:**
```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "app_metadata": {
    "role": "student",
    "institution_id": "uuid",
    "is_course_director": false
  },
  "aud": "authenticated",
  "exp": 1740000000,
  "iat": 1739996400
}
```

**Error Responses (all protected endpoints):**

| Status | Code | When |
|--------|------|------|
| 401 | `AUTHENTICATION_ERROR` | Missing, expired, or invalid JWT |
| 403 | `FORBIDDEN` | Role insufficient for endpoint |
| 422 | `VALIDATION_ERROR` | Invalid request body/params |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

## 6. Frontend Spec

N/A — Backend only (Python service scaffold).

## 7. Files to Create (exact paths, implementation order)

| # | File | Layer | Action |
|---|------|-------|--------|
| 1 | `packages/python-api/pyproject.toml` | Config | Create |
| 2 | `packages/python-api/.env.example` | Config | Create |
| 3 | `packages/python-api/.python-version` | Config | Create |
| 4 | `packages/python-api/src/__init__.py` | Package | Create |
| 5 | `packages/python-api/src/config/__init__.py` | Package | Create |
| 6 | `packages/python-api/src/config/settings.py` | Config | Create |
| 7 | `packages/python-api/src/config/logging.py` | Config | Create |
| 8 | `packages/python-api/src/config/cors.py` | Config | Create |
| 9 | `packages/python-api/src/config/neo4j.py` | Config | Create |
| 10 | `packages/python-api/src/config/supabase.py` | Config | Create |
| 11 | `packages/python-api/src/errors/__init__.py` | Package | Create |
| 12 | `packages/python-api/src/errors/base.py` | Errors | Create |
| 13 | `packages/python-api/src/models/__init__.py` | Package | Create |
| 14 | `packages/python-api/src/models/auth.py` | Models | Create |
| 15 | `packages/python-api/src/models/health.py` | Models | Create |
| 16 | `packages/python-api/src/middleware/__init__.py` | Package | Create |
| 17 | `packages/python-api/src/middleware/auth.py` | Middleware | Create |
| 18 | `packages/python-api/src/middleware/error_handler.py` | Middleware | Create |
| 19 | `packages/python-api/src/middleware/correlation.py` | Middleware | Create |
| 20 | `packages/python-api/src/routes/__init__.py` | Package | Create |
| 21 | `packages/python-api/src/routes/health.py` | Routes | Create |
| 22 | `packages/python-api/src/main.py` | App | Create |
| 23 | `packages/python-api/Dockerfile` | Docker | Create |
| 24 | `packages/python-api/docker-compose.dev.yml` | Docker | Create |
| 25 | `packages/python-api/tests/__init__.py` | Tests | Create |
| 26 | `packages/python-api/tests/conftest.py` | Tests | Create |
| 27 | `packages/python-api/tests/test_health.py` | Tests | Create |
| 28 | `packages/python-api/tests/test_auth_middleware.py` | Tests | Create |
| 29 | `packages/python-api/tests/test_error_handler.py` | Tests | Create |

## 8. Dependencies

### Story Dependencies
| Story | Lane | Status | Why |
|-------|------|--------|-----|
| STORY-U-6 | universal | **DONE** | JWT format and RBAC pattern to mirror |

### Pip Packages (new)
- `fastapi>=0.115.0` — Web framework
- `uvicorn[standard]>=0.34.0` — ASGI server
- `pydantic>=2.10.0` — Data validation
- `pydantic-settings>=2.7.0` — Environment configuration
- `python-jose[cryptography]>=3.3.0` — JWT decoding/validation
- `neo4j>=5.27.0` — Neo4j async driver
- `supabase>=2.11.0` — Supabase Python client
- `structlog>=24.4.0` — Structured logging
- `httpx>=0.28.0` — Async HTTP client (for Supabase, tests)

### Dev Pip Packages
- `pytest>=8.3.0` — Testing
- `pytest-asyncio>=0.25.0` — Async test support
- `pytest-cov>=6.0.0` — Coverage
- `httpx>=0.28.0` — FastAPI TestClient
- `ruff>=0.9.0` — Linting and formatting

### Existing Files Needed
- `apps/server/src/config/env.config.ts` — Reference for env var names
- `packages/types/src/auth/auth.types.ts` — Reference for `AuthTokenPayload` shape
- `packages/types/src/auth/roles.types.ts` — Reference for `AuthRole` enum values

## 9. Test Fixtures (inline)

```python
# packages/python-api/tests/conftest.py

import pytest
import time
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

# Valid JWT payload for a student
STUDENT_TOKEN_PAYLOAD = {
    "sub": "student-uuid-1",
    "email": "marcus@msm.edu",
    "role": "student",
    "institution_id": "inst-uuid-1",
    "is_course_director": False,
    "aud": "authenticated",
    "exp": int(time.time()) + 3600,
    "iat": int(time.time()),
}

# Valid JWT payload for a superadmin
SUPERADMIN_TOKEN_PAYLOAD = {
    "sub": "sa-uuid-1",
    "email": "admin@journeyos.com",
    "role": "superadmin",
    "institution_id": "",
    "is_course_director": False,
    "aud": "authenticated",
    "exp": int(time.time()) + 3600,
    "iat": int(time.time()),
}

# Expired JWT payload
EXPIRED_TOKEN_PAYLOAD = {
    **STUDENT_TOKEN_PAYLOAD,
    "exp": int(time.time()) - 3600,
}

# Faculty JWT payload
FACULTY_TOKEN_PAYLOAD = {
    **STUDENT_TOKEN_PAYLOAD,
    "sub": "faculty-uuid-1",
    "email": "faculty@msm.edu",
    "role": "faculty",
    "is_course_director": True,
}


@pytest.fixture
def mock_neo4j_driver():
    """Mock neo4j.AsyncGraphDatabase.driver."""
    driver = AsyncMock()
    session = AsyncMock()
    driver.session.return_value.__aenter__ = AsyncMock(return_value=session)
    driver.session.return_value.__aexit__ = AsyncMock(return_value=False)
    session.run.return_value.single.return_value = {"ok": 1}
    return driver


@pytest.fixture
def mock_supabase_client():
    """Mock supabase client."""
    client = MagicMock()
    client.table.return_value.select.return_value.execute.return_value = MagicMock(
        data=[{"ok": 1}]
    )
    return client
```

## 10. API Test Spec (pytest)

**File:** `packages/python-api/tests/test_health.py`

```
describe "Health endpoint"
    test_health_returns_200_with_service_status
    test_health_returns_dependency_statuses
    test_health_returns_degraded_when_neo4j_down
    test_health_returns_degraded_when_supabase_down
    test_health_includes_version_and_uptime
    test_health_does_not_require_authentication
```

**File:** `packages/python-api/tests/test_auth_middleware.py`

```
describe "JWT Authentication Middleware"
    test_valid_jwt_sets_current_user
    test_missing_authorization_header_returns_401
    test_invalid_jwt_format_returns_401
    test_expired_jwt_returns_401
    test_jwt_with_invalid_signature_returns_401
    test_jwt_missing_required_claims_returns_401
    test_extracts_role_from_app_metadata
    test_extracts_institution_id_from_app_metadata
    test_bearer_prefix_required
```

**File:** `packages/python-api/tests/test_error_handler.py`

```
describe "Error Handler Middleware"
    test_journey_os_error_returns_correct_status_and_envelope
    test_authentication_error_returns_401
    test_forbidden_error_returns_403
    test_validation_error_returns_422
    test_not_found_error_returns_404
    test_unhandled_exception_returns_500_internal_error
    test_error_response_matches_api_envelope_format
    test_correlation_id_included_in_error_response
```

**Total: ~24 tests**

## 11. E2E Test Spec

Not required for this story. Infrastructure scaffold is not a critical user journey.

## 12. Acceptance Criteria

1. `packages/python-api/` directory exists with complete project structure
2. `GET /health` returns 200 with service status, version, uptime, and dependency checks
3. JWT middleware correctly validates Supabase tokens and rejects invalid/expired tokens
4. CORS allows requests from `http://localhost:3000` (web app) and `http://localhost:3001` (Express server)
5. Environment configuration loads from `.env` via pydantic-settings with validation
6. Structured JSON logging includes correlation ID per request
7. All custom error classes produce `ApiResponse` envelope format on error
8. Docker builds successfully for both development and production targets
9. `uv lock` generates reproducible lock file
10. OpenAPI docs render at `/docs` with all endpoints documented
11. pytest fixtures provide mock auth, Neo4j, and Supabase clients
12. Neo4j async driver initializes with connection pool settings from env
13. Supabase client initializes with URL and service role key from env
14. All 24 pytest tests pass

## 13. Source References

| Claim | Source |
|-------|--------|
| Python FastAPI service for ML algorithms | ARCHITECTURE_v10 SS 3.2: Python FastAPI split |
| JWT matches Supabase token format | AuthTokenPayload in packages/types/src/auth/auth.types.ts |
| AuthRole enum values | packages/types/src/auth/roles.types.ts |
| Reused by E-44 Risk Prediction | ROADMAP_v2_3 SS Sprint 37 |
| ApiResponse envelope format | packages/types/src/auth/auth.types.ts SS ApiResponse<T> |
| OOP patterns adapted for Python | CLAUDE.md SS Architecture Rules |
| Neo4j async driver | NODE_REGISTRY_v1 SS Layer 5 (Student mastery nodes) |
| Sprint 31 placement | ROADMAP_v2_3 SS Sprint 31: BKT & IRT Engine |

## 14. Environment Prerequisites

```bash
# packages/python-api/.env.example
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret-min-32-chars-long

NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-neo4j-password

PYTHON_API_PORT=8000
PYTHON_API_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
LOG_LEVEL=INFO
```

- **Python 3.11+** installed (or managed via `.python-version`)
- **uv** installed globally (`pip install uv`)
- **Docker** installed for containerized builds
- **Neo4j** running (optional — health check reports degraded if unavailable)
- **Supabase** running (optional — health check reports degraded if unavailable)

## 15. Figma Make Prototype

N/A — Backend only.
