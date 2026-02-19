# Cross-Lane Dependencies

**Total cross-lane edges:** 41
**Generated:** 2026-02-19

---

## Dependency Flow Summary

```
UNIVERSAL (P0)
    |
    +---> SUPERADMIN (P1)     [3 edges: U-6 gates SA-1/2/3]
    |         |
    |         +---> INST ADMIN (P2)  [3 edges: SA-5 gates IA-1/4/5]
    |         |
    |         +---> UNIVERSAL        [1 edge: SA-5 gates U-9]
    |
    +---> INST ADMIN (P2)     [8 edges: U-6/U-12/U-13 gate IA-1/3/5/6/9/20]
    |         |
    |         +---> FACULTY (P3)     [3 edges: IA-1/2/3 gate F-1/33/65]
    |
    +---> FACULTY (P3)        [9 edges: U-6/U-8 gate F-1/2/5/6/7/12/21/33]
    |         |
    |         +---> INST ADMIN (P2)  [6 edges: F-1/11/34/43 gate IA-2/7/8/3/22/42]
    |         |
    |         +---> STUDENT (P4)     [1 edge: F-69 gates ST-4]
    |         |
    |         +---> ADVISOR (P5)     [1 edge: F-2 gates AD-6]
    |
    +---> STUDENT (P4)        [3 edges: U-6/U-8 gate ST-1/2]
              |
              +---> ADVISOR (P5)     [3 edges: ST-3 gates AD-1/2/3]
```

---

## All Cross-Lane Edges

### Universal -> SuperAdmin (3 edges)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-SA-1 (Waitlist Application Form) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-SA-2 (Global User Directory) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-SA-3 (Application Review Queue) | STORY-U-6 (RBAC Middleware) | NOT STARTED |

### Universal -> Institutional Admin (8 edges)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-IA-1 (User List & Invitation) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-IA-3 (Coverage Computation) | STORY-U-12 (Remaining Framework Seeds) | NOT STARTED |
| STORY-IA-5 (Admin Dashboard Page) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-IA-6 (Framework List Page) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-IA-6 (Framework List Page) | STORY-U-12 (Remaining Framework Seeds) | NOT STARTED |
| STORY-IA-9 (Knowledge Graph Browser) | STORY-U-12 (Remaining Framework Seeds) | NOT STARTED |
| STORY-IA-10 (Framework Linking Service) | STORY-U-12 (Remaining Framework Seeds) | NOT STARTED |
| STORY-IA-20 (Setup Wizard Step) | STORY-U-13 (Persona Onboarding) | NOT STARTED |

### Universal -> Faculty (9 edges)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-F-1 (Course Model) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-F-2 (Notification Model) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-F-5 (Profile Page) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-F-5 (Profile Page) | STORY-U-8 (Registration Wizard) | NOT STARTED |
| STORY-F-6 (Activity Feed) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-F-7 (KPI Strip) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-F-12 (Course Cards) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-F-21 (Dashboard Variants) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-F-33 (LangGraph Pipeline) | STORY-U-6 (RBAC Middleware) | NOT STARTED |

### Universal -> Student (3 edges)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-ST-1 (FastAPI Scaffold) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-ST-2 (Student Dashboard) | STORY-U-6 (RBAC Middleware) | NOT STARTED |
| STORY-ST-2 (Student Dashboard) | STORY-U-8 (Registration Wizard) | NOT STARTED |

### SuperAdmin -> Universal (1 edge)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-U-9 (Invitation Acceptance) | STORY-SA-5 (Approval Workflow) | NOT STARTED |

### SuperAdmin -> Institutional Admin (3 edges)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-IA-1 (User List & Invitation) | STORY-SA-5 (Approval Workflow) | NOT STARTED |
| STORY-IA-4 (ILO Model) | STORY-SA-5 (Approval Workflow) | NOT STARTED |
| STORY-IA-5 (Admin Dashboard) | STORY-SA-5 (Approval Workflow) | NOT STARTED |

### Institutional Admin -> Faculty (3 edges)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-F-1 (Course Model) | STORY-IA-1 (User List & Invitation) | NOT STARTED |
| STORY-F-33 (LangGraph Pipeline) | STORY-IA-2 (SLO Model) | NOT STARTED |
| STORY-F-65 (Blueprint Model) | STORY-IA-3 (Coverage Computation) | NOT STARTED |

### Faculty -> Institutional Admin (6 edges)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-IA-2 (SLO Model) | STORY-F-1 (Course Model) | NOT STARTED |
| STORY-IA-3 (Coverage Computation) | STORY-F-34 (TEACHES Relationships) | NOT STARTED |
| STORY-IA-7 (Weekly Schedule) | STORY-F-11 (Course Hierarchy) | NOT STARTED |
| STORY-IA-8 (Course Oversight) | STORY-F-1 (Course Model) | NOT STARTED |
| STORY-IA-22 (SLO-to-ILO Linking) | STORY-F-1 (Course Model) | NOT STARTED |
| STORY-IA-42 (Gap-to-Workbench) | STORY-F-43 (SplitPane Layout) | NOT STARTED |

### Faculty -> Student (1 edge)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-ST-4 (IRT Calibration) | STORY-F-69 (Retired Exam Import) | NOT STARTED |

### Faculty -> Advisor (1 edge)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-AD-6 (Student Alert View) | STORY-F-2 (Notification Model) | NOT STARTED |

### Student -> Advisor (3 edges)
| Blocked Story | Blocker Story | Status |
|---------------|---------------|--------|
| STORY-AD-1 (GNN Risk Model) | STORY-ST-3 (BKT Mastery) | NOT STARTED |
| STORY-AD-2 (Root-Cause Tracing) | STORY-ST-3 (BKT Mastery) | NOT STARTED |
| STORY-AD-3 (Trajectory Analysis) | STORY-ST-3 (BKT Mastery) | NOT STARTED |

---

## Bidirectional Coupling: Faculty <-> Institutional Admin

The IA and F lanes have **mutual dependencies** (9 edges total, 3 IA->F and 6 F->IA). This means:

1. F-1 (Course Model) requires IA-1 (User List) to exist first
2. But IA-2 (SLO Model) requires F-1 (Course Model)

**Resolution:** Build in order: U -> SA -> IA-1 -> F-1 -> IA-2/3 -> continue both lanes

---

## Top 5 Most-Blocking Cross-Lane Stories

| Story | Lane | Direct Cross-Lane Blocks |
|-------|------|--------------------------|
| STORY-U-6 (RBAC Middleware) | Universal | 12 stories across 4 lanes |
| STORY-SA-5 (Approval Workflow) | SuperAdmin | 5 stories across 2 lanes |
| STORY-F-1 (Course Model) | Faculty | 4 stories in IA lane |
| STORY-U-12 (Framework Seeds) | Universal | 4 stories in IA lane |
| STORY-ST-3 (BKT Mastery) | Student | 3 stories in AD lane |
