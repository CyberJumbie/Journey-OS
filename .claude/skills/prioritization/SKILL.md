---
name: prioritization
description: "Invoke when running /prioritize, /pull, /backlog, or /blocked. Handles persona lane assignment, within-lane ordering, cross-lane dependency detection, and development-time story selection. Requires all stories to exist (run /decompose-all first)."
---

# Skill: Backlog Prioritization

## Persona Lanes

Stories are assigned to lanes based on their primary persona. The lane
determines development priority order — higher-priority lanes get
unblocked first.

### Lane Definitions

Lanes are defined per project in `.context/spec/backlog/LANE-CONFIG.yaml`.
Default configuration for Journey OS:

```yaml
lanes:
  universal:
    priority: 0
    prefix: "U"
    description: "Infrastructure, auth, shared services — no single persona owns these"
    includes:
      - Database schema and migrations
      - Authentication and RBAC middleware
      - Shared type definitions
      - Background job infrastructure (Inngest)
      - Real-time infrastructure (Socket.io, SSE)
      - Monorepo and build configuration
      - Seed data and validation scripts
      - Design system foundation (atoms)

  superadmin:
    priority: 1
    prefix: "SA"
    description: "Platform-wide management across institutions"
    persona: "System Administrator"

  institutional_admin:
    priority: 2
    prefix: "IA"
    description: "Institution configuration, programs, faculty, analytics"
    persona: "Dr. Angela Richards"

  faculty:
    priority: 3
    prefix: "F"
    description: "Content creation, generation workbench, curriculum mapping"
    persona: "Dr. Carlos Martinez"

  student:
    priority: 4
    prefix: "S"
    description: "Learning path, assessments, adaptive practice, progress"
    persona: "Marcus Williams"

  advisor:
    priority: 5
    prefix: "A"
    description: "Student monitoring, intervention alerts, progress dashboards"
    persona: "Dr. Lin Chen"
```

### Custom Lane Configuration

For non-Journey-OS projects, the lane config is generated during
`/prioritize` based on the personas detected in `/personas`.
The human reviews and adjusts priority order.

## Lane Assignment Rules

### Rule 1: Primary Persona Determines Lane
If a story's user flow is owned by a single persona, it goes in that
persona's lane.

### Rule 2: Universal Lane Catches Infrastructure
Stories that serve ALL personas or no specific persona go in `universal`:
- Auth, RBAC, middleware
- Database schema, migrations
- Shared services (DualWriteService, EmbeddingService)
- Background jobs, infrastructure
- Design system atoms (shared components)
- Seed data and validation

### Rule 3: Multi-Persona Stories Use Highest-Priority Persona
If a story serves both faculty and student (e.g., "assessment delivery"),
it goes in the higher-priority persona's lane (faculty, priority 3)
because building it for faculty first enables student features downstream.

Exception: if the story is architecturally infrastructure (serves everyone
equally), it goes in universal.

### Rule 4: Enable Before Consume
Within a lane, stories that ENABLE other stories come before stories
that CONSUME. A feature that unblocks 5 downstream stories outranks
a feature that unblocks 1.

## Within-Lane Ordering

Stories within a lane are ordered by:
1. **Dependency depth** — stories with zero in-lane dependencies first
2. **Unblock count** — stories that unblock more downstream stories first
3. **Feature completeness** — stories that complete a user flow before
   stories that start a new one
4. **Size** — smaller stories first (faster feedback loops)

## Cross-Lane Dependencies

A cross-lane dependency occurs when a story in lane B requires a story
in lane A to be complete first.

Example:
- STORY-F-3 "Generation pipeline" (faculty lane) depends on
  STORY-U-2 "Auth middleware" (universal lane)

Cross-lane dependencies are tracked in:
`.context/spec/backlog/CROSS-LANE-DEPENDENCIES.md`

Format:
```
STORY-F-3 (faculty) ← blocked by → STORY-U-2 (universal) [DONE]
STORY-S-1 (student) ← blocked by → STORY-F-5 (faculty) [NOT STARTED]
STORY-A-1 (advisor) ← blocked by → STORY-S-3 (student) [NOT STARTED]
```

## /pull Logic

When the developer runs `/pull LANE`:

1. Get all stories in the requested lane
2. Filter to stories with status != done
3. For each remaining story, check:
   a. All in-lane dependencies complete?
   b. All cross-lane dependencies complete?
4. From the unblocked set, return the highest-ordered story
5. If no stories are unblocked:
   a. Identify blocking stories and their lanes
   b. Suggest the highest-priority lane with unblocked work
   c. Show which blockers would unblock the most stories

## Story ID Convention

`STORY-{LANE_PREFIX}-{N}`

Examples:
- STORY-U-1, STORY-U-2, ... (universal)
- STORY-SA-1, STORY-SA-2, ... (superadmin)
- STORY-IA-1, STORY-IA-2, ... (institutional admin)
- STORY-F-1, STORY-F-2, ... (faculty)
- STORY-S-1, STORY-S-2, ... (student)
- STORY-A-1, STORY-A-2, ... (advisor)

Numbers are assigned during /prioritize and reflect within-lane order.
