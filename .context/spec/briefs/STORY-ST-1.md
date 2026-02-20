# STORY-ST-1: FastAPI Service Scaffold

**Epic:** E-40 (BKT & IRT Engine)
**Feature:** F-19
**Sprint:** 31
**Lane:** student (P4)
**Size:** M
**Old ID:** S-ST-40-1

---

## User Story
As a **developer**, I need a Python/FastAPI service scaffold with health check, authentication, and CORS so that the IRT and BKT algorithms have a production-ready runtime environment.

## Acceptance Criteria
- [ ] FastAPI application in `packages/python-api` with standard project structure
- [ ] Health check endpoint: `GET /health` returning service status, version, uptime
- [ ] JWT authentication middleware validating Supabase tokens against JWKS endpoint
- [ ] CORS configuration matching `apps/server` allowed origins
- [ ] Environment configuration via `pydantic-settings` with `.env` file support
- [ ] Structured JSON logging with correlation IDs (X-Request-ID header propagation)
- [ ] Error handling middleware with custom exception classes (mirroring Express OOP pattern)
- [ ] Docker configuration: `Dockerfile` (multi-stage) + `docker-compose.yml` for local dev
- [ ] `uv` for dependency management with lock file (`uv.lock`)
- [ ] OpenAPI documentation auto-generated at `/docs` and `/redoc`
- [ ] pytest setup with fixtures for auth mocking and database connections
- [ ] Neo4j async driver connection pool (`neo4j.AsyncGraphDatabase`)
- [ ] Supabase client initialization (`supabase-py`) with service role key
- [ ] Python 3.11+ with strict type hints throughout

## Reference Screens
> No UI screens. This is a backend-only Python service scaffold.

## Implementation Layers
| Layer | Package | Files |
|-------|---------|-------|
| Config | packages/python-api | `src/config.py`, `src/settings.py` |
| App | packages/python-api | `src/main.py`, `src/app.py` |
| Middleware | packages/python-api | `src/middleware/auth.py`, `src/middleware/cors.py`, `src/middleware/error_handler.py`, `src/middleware/logging.py` |
| Database | packages/python-api | `src/database/neo4j_client.py`, `src/database/supabase_client.py` |
| Health | packages/python-api | `src/routes/health.py` |
| Errors | packages/python-api | `src/errors/base.py`, `src/errors/auth.py` |
| Docker | packages/python-api | `Dockerfile`, `docker-compose.yml` |
| Tests | packages/python-api | `tests/conftest.py`, `tests/test_health.py`, `tests/test_auth.py` |

## Database Schema
No new tables. This scaffold connects to existing Supabase and Neo4j instances.

**Supabase:** Read-only access to `profiles`, `practice_sessions`, `student_responses` (created by later stories).
**Neo4j:** Read access to `(Concept)`, `(Student)`, `(PracticeSession)` nodes.

## API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Service health check |
| GET | `/docs` | None | OpenAPI Swagger UI |
| GET | `/redoc` | None | ReDoc documentation |

## Dependencies
- **Blocks:** STORY-ST-2 (indirectly via mock data), STORY-ST-3, STORY-ST-4, STORY-ST-10
- **Blocked by:** Universal auth infrastructure (Supabase JWT validation requires JWKS URL from deployed Supabase)
- **Cross-epic:** Foundation reused by E-44 (Risk Prediction Engine, Sprint 37)

## Testing Requirements
- **API Tests (70%):** Health check returns 200 with expected schema. Auth middleware rejects invalid/expired/missing JWT. CORS headers set correctly for allowed origins. Error handler returns structured error responses.
- **E2E (0%):** No E2E for backend scaffold.

## Implementation Notes
- Follow OOP patterns adapted for Python: private fields with `_` prefix (Python convention), public properties, constructor DI via FastAPI `Depends()`.
- JWT validation must verify against Supabase JWKS endpoint, not a static secret. Use `python-jose` or `PyJWT` with `cryptography`.
- Neo4j Python driver uses `neo4j.AsyncGraphDatabase.driver()` for async operations.
- The FastAPI service communicates with Express server via internal HTTP API. Express proxies student-facing requests to this service.
- Use `uv` (not pip/poetry) for dependency management per modern Python tooling.
- Add `packages/python-api` to the monorepo's Docker Compose for local development alongside Express and Next.js.
