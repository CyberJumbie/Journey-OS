---
name: neo4j-read-service-pattern
tags: [neo4j, service, read-only, session-management, constructor-di]
story: STORY-IA-6
date: 2026-02-20
---
# Neo4j Read-Only Service Pattern

## Problem
Services that query Neo4j need proper session lifecycle management (open, use, close) and must handle the case where Neo4j is not configured (env vars missing). Sessions must close even when queries fail.

## Solution

### Service Structure
```typescript
import type { Driver, Session } from "neo4j-driver";
import { FrameworkQueryError } from "../../errors/framework.errors";

export class FrameworkService {
  readonly #driver: Driver;

  constructor(driver: Driver) {
    this.#driver = driver;
  }

  async getFrameworkList(): Promise<FrameworkListResponse> {
    let session: Session;
    try {
      session = this.#driver.session();
    } catch (error) {
      throw new FrameworkQueryError("Neo4j driver is unavailable.");
    }

    try {
      // ... queries using session.run()
      return { frameworks };
    } finally {
      await session.close();
    }
  }
}
```

Key elements:
1. **Constructor DI** — inject `Driver`, not `Neo4jClientConfig`
2. **Session creation in try/catch** — wraps driver.session() to throw custom error
3. **try/finally for session.close()** — guarantees cleanup even on query failure
4. **Neo4j Integer conversion** — always call `.toNumber()` on Neo4j integer results

### Route Registration (conditional)
```typescript
// In index.ts — only register if Neo4j is available
try {
  const neo4jDriver = Neo4jClientConfig.getInstance().driver;
  const frameworkService = new FrameworkService(neo4jDriver);
  const frameworkController = new FrameworkController(frameworkService);
  app.get("/api/v1/institution/frameworks",
    rbac.require(AuthRole.INSTITUTIONAL_ADMIN, AuthRole.SUPERADMIN),
    (req, res) => frameworkController.listFrameworks(req, res),
  );
} catch {
  console.log("[server] Neo4j not configured — framework routes not registered");
}
```

### Test Mocking
```typescript
function createMockRecord(values: Record<string, unknown>) {
  return {
    get(key: string) {
      const val = values[key];
      if (val === null || val === undefined) return null;
      return { toNumber: () => val as number };
    },
  };
}

function createMockSession() {
  return {
    run: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDriver(session: ReturnType<typeof createMockSession>) {
  return { session: vi.fn().mockReturnValue(session) };
}
```

Always test:
- Session closes on success
- Session closes on failure
- Custom error thrown when driver unavailable

## When to Use
- Any service that reads from Neo4j (framework browser, hierarchy tree, search)
- Read-only Neo4j endpoints behind RBAC

## When Not to Use
- Dual-write services (Supabase + Neo4j) — use DualWriteService pattern instead
- Seed scripts — use BaseSeeder pattern instead

## Source Reference
- [CLAUDE.md § Architecture Rules] — OOP, constructor DI, #private fields
- [CLAUDE.md § Monorepo Conventions] — Neo4j env vars optional in zod
