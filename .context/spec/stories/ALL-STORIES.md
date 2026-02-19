# Journey OS — All Stories Index

**Total Stories:** 166
**Epics Covered:** 45
**Generated:** 2026-02-19

---

## Summary by Lane

| Lane | Priority | Stories | S | M | L |
|------|----------|---------|---|---|---|
| universal | P0 | 14 | 7 | 5 | 2 |
| superadmin | P1 | 9 | 2 | 7 | 0 |
| institutional_admin | P2 | 44 | 6 | 33 | 5 |
| faculty | P3 | 75 | 12 | 47 | 16 |
| student | P4 | 15 | 0 | 11 | 4 |
| advisor | P5 | 9 | 0 | 7 | 2 |
| **Total** | | **166** | **27** | **110** | **29** |

---

## Stories by Epic

### E-01: Auth Infrastructure (Sprint 3, universal)
| ID | Title | Size |
|----|-------|------|
| S-U-01-1 | Supabase Auth Setup | S |
| S-U-01-2 | Express Auth Middleware | M |
| S-U-01-3 | RBAC Middleware | M |
| S-U-01-4 | Role-Based Dashboard Routing | S |

### E-02: Registration & Onboarding (Sprint 3, universal)
| ID | Title | Size |
|----|-------|------|
| S-U-02-1 | Registration Wizard | L |
| S-U-02-2 | Invitation Acceptance Flow | M |
| S-U-02-3 | Persona Onboarding Screens | M |
| S-U-02-4 | Email Verification Gate | S |

### E-03: Account Recovery (Sprint 21, universal)
| ID | Title | Size |
|----|-------|------|
| S-U-03-1 | Forgot Password Flow | S |
| S-U-03-2 | Password Reset Page | S |

### E-04: Institution Lifecycle (Sprint 3, superadmin)
| ID | Title | Size |
|----|-------|------|
| S-SA-04-1 | Waitlist Application Form | M |
| S-SA-04-2 | Application Review Queue | M |
| S-SA-04-3 | Approval Workflow | M |
| S-SA-04-4 | Rejection Workflow | S |

### E-05: Institution Monitoring (Sprint 9, superadmin)
| ID | Title | Size |
|----|-------|------|
| S-SA-05-1 | Institution List Dashboard | M |
| S-SA-05-2 | Institution Detail View | M |
| S-SA-05-3 | Institution Suspend/Reactivate | S |

### E-06: Per-Institution User Management (Sprint 3, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-06-1 | User List & Invitation | L |
| S-IA-06-2 | Role Assignment & CD Flag | M |
| S-IA-06-3 | User Deactivation | S |

### E-07: Cross-Institution User Management (Sprint 3, superadmin)
| ID | Title | Size |
|----|-------|------|
| S-SA-07-1 | Global User Directory | M |
| S-SA-07-2 | User Reassignment | M |

### E-08: Course CRUD & Hierarchy (Sprint 4, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-08-1 | Course Model & Repository | M |
| S-F-08-2 | Course Hierarchy | M |
| S-F-08-3 | Course Creation Wizard | L |
| S-F-08-4 | Course List & Detail Views | M |

### E-09: Course SLO Linking & Scheduling (Sprint 4, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-09-1 | SLO-to-ILO Linking | M |
| S-IA-09-2 | Weekly Schedule View | M |
| S-IA-09-3 | Course Oversight Dashboard | M |

### E-10: Upload & Storage (Sprint 4, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-10-1 | Upload Dropzone Component | M |
| S-F-10-2 | Supabase Storage Integration | M |
| S-F-10-3 | Content Record Creation | S |

### E-11: Content Processing Pipeline (Sprint 4, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-11-1 | Inngest Content Pipeline | L |
| S-F-11-2 | Voyage AI Embedding Integration | M |
| S-F-11-3 | Processing Progress UI | M |
| S-F-11-4 | Dual-Write Chunks | M |

### E-12: AI Concept Extraction (Sprint 5, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-12-1 | SubConcept Extraction Service | M |
| S-F-12-2 | LOD Enrichment | M |
| S-F-12-3 | Dedup Service | M |
| S-F-12-4 | TEACHES Relationship Creation | S |

### E-13: Concept Review & Verification (Sprint 5, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-13-1 | Concept Review Queue UI | L |
| S-F-13-2 | Verification Workflow | M |
| S-F-13-3 | Batch Operations | S |

### E-14: ILO & SLO CRUD (Sprint 5, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-14-1 | ILO Model & Repository | M |
| S-IA-14-2 | SLO Model & Repository | M |
| S-IA-14-3 | ILO Management UI | M |
| S-IA-14-4 | SLO Management UI | M |

### E-15: Objective Mapping & Framework Linking (Sprint 5, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-15-1 | FULFILLS Workflow | M |
| S-IA-15-2 | Framework Linking Service | M |
| S-IA-15-3 | Visual Mapping Interface | L |
| S-IA-15-4 | FULFILLS Review Queue | M |

### E-16: Framework Seeding (Sprint 1, universal)
| ID | Title | Size |
|----|-------|------|
| S-U-16-1 | Framework Data Models | S |
| S-U-16-2 | Seed Script Infrastructure | S |
| S-U-16-3 | USMLE Seed Data | M |
| S-U-16-4 | Remaining Framework Seeds | M |

### E-17: Framework Browser UI (Sprint 3, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-17-1 | Framework List Page | M |
| S-IA-17-2 | Hierarchy Tree View | M |
| S-IA-17-3 | Framework Search | S |
| S-IA-17-4 | Setup Wizard Step | S |

### E-18: LangGraph.js Generation Pipeline (Sprint 6, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-18-1 | LangGraph.js Pipeline Scaffold | L |
| S-F-18-2 | Generation Nodes | L |
| S-F-18-3 | Review Nodes | M |
| S-F-18-4 | SSE Streaming Integration | M |

### E-19: Workbench UI (Sprint 7, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-19-1 | SplitPane Layout | M |
| S-F-19-2 | ChatPanel Component | L |
| S-F-19-3 | ContextPanel Component | M |
| S-F-19-4 | Generation Spec Wizard | M |

### E-20: Bulk Generation (Sprint 14, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-20-1 | Inngest Batch Pipeline | L |
| S-F-20-2 | Batch Configuration Form | M |
| S-F-20-3 | Batch Progress UI | M |
| S-F-20-4 | Batch Controls | M |

### E-21: Validation & Dedup Engine (Sprint 12, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-21-1 | Validation Rule Engine | L |
| S-F-21-2 | Self-Correction Retry | M |
| S-F-21-3 | Dedup Service | M |
| S-F-21-4 | Auto-Tagging Service | M |

### E-22: Critic Agent & Review Router (Sprint 13, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-22-1 | Critic Agent Service | M |
| S-F-22-2 | Review Router | M |
| S-F-22-3 | Automation Level Configuration | S |

### E-23: Faculty Review UI (Sprint 13, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-23-1 | Review Queue List Page | M |
| S-F-23-2 | Question Detail Review View | L |
| S-F-23-3 | Review Actions | M |
| S-F-23-4 | Self-Review Mode | S |

### E-24: Legacy Import Pipeline (Sprint 17, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-24-1 | Import Parser | M |
| S-F-24-2 | Field Mapping UI | M |
| S-F-24-3 | Import Pipeline | L |
| S-F-24-4 | Import Report | S |

### E-25: Item Bank Browser & Export (Sprint 18, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-25-1 | Item Bank Browser Page | L |
| S-F-25-2 | Item Detail View | M |
| S-F-25-3 | Export Service | M |
| S-F-25-4 | Repository Statistics | M |

### E-26: Blueprint & Assembly Engine (Sprint 29, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-26-1 | Blueprint Definition Model | M |
| S-F-26-2 | Item Recommendation Engine | L |
| S-F-26-3 | Exam Builder UI | L |
| S-F-26-4 | Gap Flagging | S |

### E-27: Exam Assignment & Export (Sprint 30, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-27-1 | Cohort Assignment | M |
| S-F-27-2 | Exam Export | M |
| S-F-27-3 | Retired Exam Import | M |
| S-F-27-4 | Exam Lifecycle Management | M |

### E-28: Coverage Computation & Heatmap (Sprint 8, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-28-1 | Coverage Computation Service | M |
| S-IA-28-2 | USMLE Heatmap Component | L |
| S-IA-28-3 | Concept Graph Visualization | L |
| S-IA-28-4 | Nightly Coverage Job | S |
| S-IA-28-5 | Centrality Metrics | M |

### E-29: Gap-Driven Generation (Sprint 8, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-29-1 | Gap Drill-Down UI | M |
| S-IA-29-2 | Gap-to-Workbench Handoff | M |
| S-IA-29-3 | Gap Alert Service | S |

### E-30: LCME Compliance Engine (Sprint 39, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-30-1 | Compliance Computation Service | L |
| S-IA-30-2 | Compliance Heatmap | M |
| S-IA-30-3 | Element Drill-Down View | M |

### E-31: LCME Report Export (Sprint 39, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-31-1 | Report Snapshot Service | M |
| S-IA-31-2 | PDF Export | M |
| S-IA-31-3 | Snapshot Comparison | M |

### E-32: Faculty Dashboard (Sprint 8, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-32-1 | Activity Feed Component | M |
| S-F-32-2 | KPI Strip Component | M |
| S-F-32-3 | Course Cards | M |
| S-F-32-4 | Role-Based Dashboard Variants | M |

### E-33: Course & Teaching Analytics (Sprint 18, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-33-1 | Course Analytics Page | M |
| S-IA-33-2 | Personal Analytics Page | M |
| S-IA-33-3 | Cross-Course Comparison | M |
| S-IA-33-4 | Centrality Visualization | M |

### E-34: Notification System (Sprint 19, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-34-1 | Notification Model & Repository | M |
| S-F-34-2 | Socket.io Notification Service | M |
| S-F-34-3 | Inngest Notification Triggers | M |
| S-F-34-4 | Bell Dropdown Component | M |

### E-35: Real-time Collaboration (Sprint 19, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-35-1 | Socket.io Room Management | M |
| S-F-35-2 | Presence Indicators | S |
| S-F-35-3 | Session Broadcast | M |

### E-36: Admin Dashboard & KPIs (Sprint 9, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-36-1 | Admin Dashboard Page | M |
| S-IA-36-2 | Institution Overview Table | M |
| S-IA-36-3 | Knowledge Graph Browser | L |
| S-IA-36-4 | Sync Status Monitor | M |

### E-37: KaizenML Linting & Golden Dataset (Sprint 15, institutional_admin)
| ID | Title | Size |
|----|-------|------|
| S-IA-37-1 | KaizenML Lint Rule Engine | L |
| S-IA-37-2 | Golden Dataset Service | M |
| S-IA-37-3 | Lint Results UI | M |
| S-IA-37-4 | Lint Alert Integration | S |

### E-38: Profile & Preferences (Sprint 19, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-38-1 | Profile Page | M |
| S-F-38-2 | Notification Preferences | S |
| S-F-38-3 | Generation Settings | S |

### E-39: Templates & Help (Sprint 16, faculty)
| ID | Title | Size |
|----|-------|------|
| S-F-39-1 | Template Model & CRUD | M |
| S-F-39-2 | Template Management Page | M |
| S-F-39-3 | Template Picker in Workbench | S |
| S-F-39-4 | Help & FAQ Pages | S |

### E-40: BKT & IRT Engine (Sprint 31, student)
| ID | Title | Size |
|----|-------|------|
| S-ST-40-1 | FastAPI Service Scaffold | M |
| S-ST-40-2 | IRT 3PL Calibration | L |
| S-ST-40-3 | BKT Mastery Estimation | L |
| S-ST-40-4 | Adaptive Item Selection | M |

### E-41: Adaptive Practice UI (Sprint 32, student)
| ID | Title | Size |
|----|-------|------|
| S-ST-41-1 | Practice Launcher | M |
| S-ST-41-2 | Question View Component | L |
| S-ST-41-3 | Feedback View | M |
| S-ST-41-4 | Session Summary | M |

### E-42: Student Dashboard (Sprint 27, student)
| ID | Title | Size |
|----|-------|------|
| S-ST-42-1 | Student Dashboard Page | L |
| S-ST-42-2 | Mastery Breakdown Component | M |
| S-ST-42-3 | Readiness Tracker | M |
| S-ST-42-4 | Session History | M |

### E-43: Student Progress Analytics (Sprint 28, student)
| ID | Title | Size |
|----|-------|------|
| S-ST-43-1 | Trend Charts | M |
| S-ST-43-2 | Time-on-Task Analytics | M |
| S-ST-43-3 | Comparative Percentile | M |

### E-44: Risk Prediction Engine (Sprint 37, advisor)
| ID | Title | Size |
|----|-------|------|
| S-AD-44-1 | GNN Risk Model | L |
| S-AD-44-2 | Trajectory Analysis Service | M |
| S-AD-44-3 | Root-Cause Tracing | M |
| S-AD-44-4 | Risk Flag Generation | M |

### E-45: Advisor Cohort Dashboard & Interventions (Sprint 38, advisor)
| ID | Title | Size |
|----|-------|------|
| S-AD-45-1 | Advisor Dashboard Page | L |
| S-AD-45-2 | Intervention Recommendation Engine | M |
| S-AD-45-3 | Intervention Logging | M |
| S-AD-45-4 | Admin Cohort Analytics | M |
| S-AD-45-5 | Student Alert View | M |
