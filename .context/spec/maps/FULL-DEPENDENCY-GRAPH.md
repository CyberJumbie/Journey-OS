# Journey OS — Full Dependency Graph

**Stories:** 166
**Generated:** 2026-02-19

---

## Critical Path (Longest Chain — 16 stories)

```
S-U-01-1 (Auth Setup)
  → S-U-01-2 (Auth Middleware)
    → S-U-01-3 (RBAC)
      → S-SA-04-1 (Waitlist Form)
        → S-SA-04-3 (Approval Workflow)
          → S-IA-06-1 (User Management)
            → S-F-08-1 (Course Model)
              → S-F-10-1 (Upload)
                → S-F-10-3 (Content Records)
                  → S-F-11-1 (Processing Pipeline)
                    → S-F-12-1 (Concept Extraction)
                      → S-F-12-4 (TEACHES)
                        → S-IA-28-1 (Coverage Computation)
                          → S-F-18-1 (Generation Pipeline)
                            → S-F-21-1 (Validation)
                              → S-F-22-1 (Critic Agent)
```

---

## Foundation Chain (Sprint 1)

```
S-U-16-1 → S-U-16-2 → S-U-16-3 → S-U-16-4
```

All framework data must be seeded before any framework-dependent story.

## Auth Chain (Sprint 3 — blocks everything)

```
S-U-01-1 → S-U-01-2 → S-U-01-3 → [ALL persona-specific API stories]
```

## Cross-Lane Blocking Points

### universal → all lanes
| Blocker | Blocks | Reason |
|---------|--------|--------|
| S-U-01-3 | S-SA-04-1, S-SA-07-1, S-IA-06-1, S-IA-17-1, S-F-08-1, S-F-32-1, S-IA-36-1, S-F-34-1, S-F-38-1, S-ST-42-1, S-ST-40-1 | RBAC middleware required |
| S-U-16-4 | S-IA-17-1, S-IA-15-2, S-IA-28-1, S-IA-36-3 | Seeded framework data required |

### superadmin → institutional_admin
| Blocker | Blocks | Reason |
|---------|--------|--------|
| S-SA-04-3 | S-IA-06-1, S-U-02-2 | Institution record must exist |

### institutional_admin → faculty
| Blocker | Blocks | Reason |
|---------|--------|--------|
| S-IA-06-1 | S-F-08-1 | Users with roles must exist |
| S-IA-14-1 | S-IA-15-1, S-IA-30-1 | ILOs must exist |
| S-IA-14-2 | S-IA-09-1, S-IA-15-1 | SLOs must exist |

### faculty → student
| Blocker | Blocks | Reason |
|---------|--------|--------|
| S-F-25-1 | S-F-26-1 | Item bank populated |
| S-IA-28-1 | S-F-26-1 | Coverage data computed |
| S-F-27-3 | S-ST-40-2 | Retired exam data for IRT calibration |

### student → advisor
| Blocker | Blocks | Reason |
|---------|--------|--------|
| S-ST-40-3 | S-AD-44-1 | BKT mastery data drives risk model |
| S-ST-40-4 | S-ST-41-1 | Item selection required for practice |

### faculty → advisor (via notifications)
| Blocker | Blocks | Reason |
|---------|--------|--------|
| S-F-34-1 | S-AD-45-5 | Notification infrastructure for alerts |

---

## Adjacency List (per story)

### Sprint 1

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-U-16-1 | none | S-U-16-2 |
| S-U-16-2 | S-U-16-1 | S-U-16-3 |
| S-U-16-3 | S-U-16-2 | S-U-16-4 |
| S-U-16-4 | S-U-16-3 | S-IA-17-1, S-IA-15-2, S-IA-28-1, S-IA-36-3 |

### Sprint 3

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-U-01-1 | none | S-U-01-2, S-U-03-1 |
| S-U-01-2 | S-U-01-1 | S-U-01-3 |
| S-U-01-3 | S-U-01-2 | S-U-01-4, S-SA-04-1, S-SA-07-1, S-IA-06-1, S-IA-17-1, S-F-08-1, S-F-32-1, S-IA-36-1, S-F-34-1, S-F-38-1, S-ST-42-1, S-ST-40-1 |
| S-U-01-4 | S-U-01-3 | none |
| S-U-02-1 | S-U-01-1 | S-U-02-3, S-U-02-4, S-F-38-1 |
| S-U-02-2 | S-SA-04-3 | none |
| S-U-02-3 | S-U-02-1 | none |
| S-U-02-4 | S-U-02-1 | none |
| S-SA-04-1 | S-U-01-3 | S-SA-04-2 |
| S-SA-04-2 | S-SA-04-1 | S-SA-04-3, S-SA-04-4 |
| S-SA-04-3 | S-SA-04-2 | S-IA-06-1, S-U-02-2, S-IA-14-1, S-SA-05-1 |
| S-SA-04-4 | S-SA-04-2 | none |
| S-IA-06-1 | S-U-01-3, S-SA-04-3 | S-IA-06-2, S-IA-06-3, S-F-08-1 |
| S-IA-06-2 | S-IA-06-1 | none |
| S-IA-06-3 | S-IA-06-1 | none |
| S-SA-07-1 | S-U-01-3 | S-SA-07-2 |
| S-SA-07-2 | S-SA-07-1 | none |
| S-IA-17-1 | S-U-01-3, S-U-16-4 | S-IA-17-2, S-IA-17-3 |
| S-IA-17-2 | S-IA-17-1 | none |
| S-IA-17-3 | S-IA-17-1 | none |
| S-IA-17-4 | none | none |

### Sprint 4

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-08-1 | S-U-01-3, S-IA-06-1 | S-F-08-2, S-F-08-4, S-IA-09-1, S-F-10-1 |
| S-F-08-2 | S-F-08-1 | S-F-08-3 |
| S-F-08-3 | S-F-08-2 | none |
| S-F-08-4 | S-F-08-1 | none |
| S-IA-09-1 | S-F-08-1, S-IA-14-2 | S-IA-09-2 |
| S-IA-09-2 | S-IA-09-1 | none |
| S-IA-09-3 | S-F-08-1 | none |
| S-F-10-1 | S-F-08-1 | S-F-10-2 |
| S-F-10-2 | S-F-10-1 | S-F-10-3 |
| S-F-10-3 | S-F-10-2 | S-F-11-1 |
| S-F-11-1 | S-F-10-3 | S-F-11-2, S-F-11-3, S-F-11-4 |
| S-F-11-2 | S-F-11-1 | S-F-12-1, S-F-21-3 |
| S-F-11-3 | S-F-11-1 | none |
| S-F-11-4 | S-F-11-1 | none |

### Sprint 5

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-12-1 | S-F-11-2 | S-F-12-2, S-F-12-3, S-F-18-1 |
| S-F-12-2 | S-F-12-1 | none |
| S-F-12-3 | S-F-12-1 | none |
| S-F-12-4 | S-F-12-1 | S-IA-28-1 |
| S-F-13-1 | S-F-12-1 | S-F-13-2, S-F-13-3 |
| S-F-13-2 | S-F-13-1 | none |
| S-F-13-3 | S-F-13-1 | none |
| S-IA-14-1 | S-SA-04-3 | S-IA-14-3, S-IA-15-1, S-IA-30-1 |
| S-IA-14-2 | S-F-08-1 | S-IA-14-4, S-IA-09-1, S-IA-15-1 |
| S-IA-14-3 | S-IA-14-1 | none |
| S-IA-14-4 | S-IA-14-2 | none |
| S-IA-15-1 | S-IA-14-1, S-IA-14-2 | S-IA-15-3, S-IA-15-4 |
| S-IA-15-2 | S-U-16-4, S-IA-14-1 | S-IA-30-1 |
| S-IA-15-3 | S-IA-15-1 | none |
| S-IA-15-4 | S-IA-15-1 | none |

### Sprint 6

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-18-1 | S-F-12-1, S-IA-14-2, S-U-01-3 | S-F-18-2, S-F-18-4 |
| S-F-18-2 | S-F-18-1 | S-F-18-3 |
| S-F-18-3 | S-F-18-2 | S-F-21-1 |
| S-F-18-4 | S-F-18-1 | S-F-19-1, S-F-19-2 |

### Sprint 7

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-19-1 | S-F-18-4 | S-F-19-3, S-F-19-4, S-IA-29-2, S-F-39-3 |
| S-F-19-2 | S-F-19-1, S-F-18-4 | none |
| S-F-19-3 | S-F-19-1 | none |
| S-F-19-4 | S-F-19-1 | none |

### Sprint 8

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-IA-28-1 | S-F-12-4, S-U-16-4 | S-IA-28-2, S-IA-28-5, S-F-26-1, S-IA-33-1 |
| S-IA-28-2 | S-IA-28-1 | S-IA-28-3, S-IA-29-1 |
| S-IA-28-3 | S-IA-28-2 | none |
| S-IA-28-4 | S-IA-28-1 | none |
| S-IA-28-5 | S-IA-28-1 | none |
| S-IA-29-1 | S-IA-28-2 | S-IA-29-2 |
| S-IA-29-2 | S-IA-29-1, S-F-19-1 | none |
| S-IA-29-3 | S-IA-28-1 | none |
| S-F-32-1 | S-U-01-3 | S-F-32-2, S-F-32-3, S-F-32-4 |
| S-F-32-2 | S-F-32-1 | none |
| S-F-32-3 | S-F-32-1 | none |
| S-F-32-4 | S-F-32-1 | none |

### Sprint 9

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-SA-05-1 | S-SA-04-3 | S-SA-05-2, S-SA-05-3 |
| S-SA-05-2 | S-SA-05-1 | none |
| S-SA-05-3 | S-SA-05-1 | none |
| S-IA-36-1 | S-U-01-3, S-SA-04-3 | S-IA-36-2, S-IA-36-4, S-IA-37-1 |
| S-IA-36-2 | S-IA-36-1 | none |
| S-IA-36-3 | S-U-16-4 | none |
| S-IA-36-4 | S-IA-36-1 | none |

### Sprint 12

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-21-1 | S-F-18-3 | S-F-21-2, S-F-21-3, S-F-21-4, S-F-22-1 |
| S-F-21-2 | S-F-21-1 | none |
| S-F-21-3 | S-F-21-1, S-F-11-2 | none |
| S-F-21-4 | S-F-21-1 | S-F-24-3, S-F-25-1 |

### Sprint 13

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-22-1 | S-F-21-1 | S-F-22-2 |
| S-F-22-2 | S-F-22-1 | S-F-22-3, S-F-23-1 |
| S-F-22-3 | S-F-22-2 | none |
| S-F-23-1 | S-F-22-2 | S-F-23-2, S-F-23-3, S-F-23-4 |
| S-F-23-2 | S-F-23-1 | none |
| S-F-23-3 | S-F-23-1 | S-F-25-1 |
| S-F-23-4 | S-F-23-1 | none |

### Sprint 14

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-20-1 | S-F-18-1 | S-F-20-2, S-F-20-3, S-F-20-4 |
| S-F-20-2 | S-F-20-1 | none |
| S-F-20-3 | S-F-20-1 | none |
| S-F-20-4 | S-F-20-1 | none |

### Sprint 15

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-IA-37-1 | S-IA-36-1 | S-IA-37-2, S-IA-37-3 |
| S-IA-37-2 | S-IA-37-1 | none |
| S-IA-37-3 | S-IA-37-1 | none |
| S-IA-37-4 | S-IA-37-1 | none |

### Sprint 16

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-39-1 | S-U-01-3 | S-F-39-2, S-F-39-3 |
| S-F-39-2 | S-F-39-1 | none |
| S-F-39-3 | S-F-39-1, S-F-19-1 | none |
| S-F-39-4 | none | none |

### Sprint 17

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-24-1 | none | S-F-24-2, S-F-24-3 |
| S-F-24-2 | S-F-24-1 | none |
| S-F-24-3 | S-F-24-1, S-F-21-4 | S-F-24-4 |
| S-F-24-4 | S-F-24-3 | none |

### Sprint 18

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-25-1 | S-F-21-4, S-F-23-3 | S-F-25-2, S-F-25-3, S-F-25-4, S-F-26-1 |
| S-F-25-2 | S-F-25-1 | none |
| S-F-25-3 | S-F-25-1 | none |
| S-F-25-4 | S-F-25-1 | none |
| S-IA-33-1 | S-IA-28-1 | S-IA-33-2, S-IA-33-3 |
| S-IA-33-2 | S-IA-33-1 | none |
| S-IA-33-3 | S-IA-33-1 | none |
| S-IA-33-4 | S-IA-28-5 | none |

### Sprint 19

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-34-1 | S-U-01-3 | S-F-34-2, S-AD-45-5 |
| S-F-34-2 | S-F-34-1 | S-F-34-3, S-F-34-4, S-F-35-1 |
| S-F-34-3 | S-F-34-2 | none |
| S-F-34-4 | S-F-34-2 | none |
| S-F-35-1 | S-F-34-2 | S-F-35-2, S-F-35-3 |
| S-F-35-2 | S-F-35-1 | none |
| S-F-35-3 | S-F-35-1 | none |
| S-F-38-1 | S-U-01-3, S-U-02-1 | S-F-38-2, S-F-38-3 |
| S-F-38-2 | S-F-38-1 | none |
| S-F-38-3 | S-F-38-1 | none |

### Sprint 21

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-U-03-1 | S-U-01-1 | S-U-03-2 |
| S-U-03-2 | S-U-03-1 | none |

### Sprint 27

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-ST-42-1 | S-U-01-3, S-U-02-1 | S-ST-42-2, S-ST-42-3, S-ST-42-4, S-ST-43-1 |
| S-ST-42-2 | S-ST-42-1 | none |
| S-ST-42-3 | S-ST-42-1 | none |
| S-ST-42-4 | S-ST-42-1 | none |

### Sprint 28

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-ST-43-1 | S-ST-42-1 | S-ST-43-2 |
| S-ST-43-2 | S-ST-43-1 | none |
| S-ST-43-3 | S-ST-42-1 | none |

### Sprint 29

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-26-1 | S-F-25-1, S-IA-28-1 | S-F-26-2, S-F-26-4 |
| S-F-26-2 | S-F-26-1 | S-F-26-3 |
| S-F-26-3 | S-F-26-2 | S-F-27-1 |
| S-F-26-4 | S-F-26-1 | none |

### Sprint 30

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-F-27-1 | S-F-26-3 | S-F-27-2, S-F-27-4 |
| S-F-27-2 | S-F-27-1 | none |
| S-F-27-3 | S-F-27-1 | S-ST-40-2 |
| S-F-27-4 | S-F-27-1 | none |

### Sprint 31

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-ST-40-1 | S-U-01-3 | S-ST-40-2, S-ST-40-3 |
| S-ST-40-2 | S-ST-40-1, S-F-27-3 | none |
| S-ST-40-3 | S-ST-40-1 | S-ST-40-4, S-AD-44-1 |
| S-ST-40-4 | S-ST-40-3 | S-ST-41-1 |

### Sprint 32

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-ST-41-1 | S-ST-40-4 | S-ST-41-2, S-ST-41-3 |
| S-ST-41-2 | S-ST-41-1 | none |
| S-ST-41-3 | S-ST-41-1 | S-ST-41-4 |
| S-ST-41-4 | S-ST-41-3 | none |

### Sprint 37

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-AD-44-1 | S-ST-40-3 | S-AD-44-2, S-AD-44-3, S-AD-44-4 |
| S-AD-44-2 | S-AD-44-1 | none |
| S-AD-44-3 | S-AD-44-1 | none |
| S-AD-44-4 | S-AD-44-1 | S-AD-45-1 |

### Sprint 38

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-AD-45-1 | S-AD-44-4 | S-AD-45-2, S-AD-45-3, S-AD-45-4 |
| S-AD-45-2 | S-AD-45-1 | none |
| S-AD-45-3 | S-AD-45-1 | none |
| S-AD-45-4 | S-AD-45-1 | none |
| S-AD-45-5 | S-F-34-1, S-AD-44-4 | none |

### Sprint 39

| Story | Blocked By | Blocks |
|-------|-----------|--------|
| S-IA-30-1 | S-IA-15-2, S-IA-14-1 | S-IA-30-2, S-IA-30-3, S-IA-31-1 |
| S-IA-30-2 | S-IA-30-1 | none |
| S-IA-30-3 | S-IA-30-1 | none |
| S-IA-31-1 | S-IA-30-1 | S-IA-31-2, S-IA-31-3 |
| S-IA-31-2 | S-IA-31-1 | none |
| S-IA-31-3 | S-IA-31-1 | none |

---

## Key Metrics

- **Total cross-epic edges:** 42
- **Max fan-out:** S-U-01-3 (blocks 12 stories across 5 lanes)
- **Longest chain:** 16 stories (Auth → Coverage → Generation → Review)
- **Zero-dependency stories (can start immediately):** S-U-16-1, S-U-01-1, S-IA-17-4, S-F-39-4, S-F-24-1
- **Terminal stories (block nothing):** 78 (leaf nodes)

## Schedule Conflict Notes

1. **E-17 moved Sprint 1 → Sprint 3:** Framework Browser UI requires auth (S-U-01-3) which doesn't exist until Sprint 3
2. **E-42 uses mock data in Sprint 27:** BKT/IRT engine (E-40) not ready until Sprint 31; student dashboard uses mock mastery service
