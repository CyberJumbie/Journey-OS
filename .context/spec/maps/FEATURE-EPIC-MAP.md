# Journey OS — Feature-to-Epic Map

## Features Defined: 21
## Epics Defined: 45
## Date: 2026-02-19

---

## Tier 0: Foundation (Sprints 1–9)

| Feature | Name | Tier | Primary Personas | Sprints | Epics |
|---------|------|------|-----------------|---------|-------|
| F-01 | Authentication & Onboarding | 0 | ALL | 3, 21 | E-01, E-02, E-03 |
| F-02 | Institution Management | 0 | SuperAdmin | 3, 9 | E-04, E-05 |
| F-03 | User & Role Management | 0 | SuperAdmin, Inst Admin | 3 | E-06, E-07 |
| F-04 | Course Management | 0 | Faculty (CD), Inst Admin | 4 | E-08, E-09 |
| F-05 | Content Upload & Processing | 0 | Faculty | 4 | E-10, E-11 |
| F-06 | Concept Extraction & Knowledge Graph | 0 | Faculty (CD), Inst Admin | 5 | E-12, E-13 |
| F-07 | Learning Objective Management | 0 | Faculty (CD), Inst Admin | 5 | E-14, E-15 |
| F-08 | Framework Management | 0 | Inst Admin | 1, 3 | E-16, E-17 (moved to Sprint 3) |
| F-09 | Generation Workbench | 0 | Faculty, Inst Admin | 6, 7, 14 | E-18, E-19, E-20 |
| F-10 | Question Review & Quality | 0–1 | Faculty (CD), Inst Admin | 12, 13 | E-21, E-22, E-23 |

## Tier 1: ECD Core (Sprints 10–24)

| Feature | Name | Tier | Primary Personas | Sprints | Epics |
|---------|------|------|-----------------|---------|-------|
| F-11 | Item Bank & Repository | 1 | Faculty, Inst Admin | 17, 18 | E-24, E-25 |
| F-12 | Exam Assembly | 1–2 | Faculty (CD), Inst Admin | 29–30 | E-26, E-27 |
| F-13 | USMLE Coverage & Gap Detection | 0–1 | Faculty, Inst Admin | 8 | E-28, E-29 |
| F-14 | LCME Compliance Reporting | 1–2 | Inst Admin | 39 | E-30, E-31 |
| F-15 | Faculty Dashboard & Analytics | 0–1 | Faculty, Inst Admin | 8, 18 | E-32, E-33 |
| F-16 | Notifications & Collaboration | 1 | ALL | 19 | E-34, E-35 |
| F-17 | Admin Dashboard & Data Integrity | 0–1 | Inst Admin, SuperAdmin | 9, 15 | E-36, E-37 |
| F-18 | Settings & Profile | 1 | ALL | 16, 19 | E-38, E-39 |

## Tier 2: Student & Advisor (Sprints 25–39)

| Feature | Name | Tier | Primary Personas | Sprints | Epics |
|---------|------|------|-----------------|---------|-------|
| F-19 | Adaptive Practice | 2 | Student | 31–32 | E-40, E-41 |
| F-20 | Student Dashboard & Progress | 2 | Student | 27–28 | E-42, E-43 |
| F-21 | At-Risk Prediction & Advising | 2 | Advisor, Inst Admin | 37–38 | E-44, E-45 |

---

## Epic Sprint Timeline

| Sprint | Epics |
|--------|-------|
| 1 | E-16 |
| 3 | E-01, E-02, E-04, E-06, E-07, **E-17** |
| 4 | E-08, E-09, E-10, E-11 |
| 5 | E-12, E-13, E-14, E-15 |
| 6 | E-18 |
| 7 | E-19 |
| 8 | E-28, E-29, E-32 |
| 9 | E-05, E-36 |
| 12 | E-21 |
| 13 | E-22, E-23 |
| 14 | E-20 |
| 15 | E-37 |
| 16 | E-39 |
| 17 | E-24 |
| 18 | E-25, E-33 |
| 19 | E-34, E-35, E-38 |
| 21 | E-03 |
| 27 | E-42 |
| 28 | E-43 |
| 29 | E-26 |
| 30 | E-27 |
| 31 | E-40 |
| 32 | E-41 |
| 37 | E-44 |
| 38 | E-45 |
| 39 | E-30, E-31 |

---

## Feature Dependency Graph

```
F-01 (Auth)
 ├── F-02 (Institutions) ──→ F-08 (Frameworks)
 │    └── F-03 (Users)
 │         └── F-04 (Courses) ──→ F-05 (Upload) ──→ F-06 (Extraction)
 │                                                       │
 │              F-07 (LOs) ←── F-06 ──────────────────────┘
 │                   │
 │                   ▼
 │              F-09 (Workbench) ──→ F-10 (Review) ──→ F-11 (Item Bank)
 │                   │                                      │
 │                   ▼                                      ▼
 │              F-13 (Coverage)                        F-12 (Exams)
 │              F-15 (Dashboard)
 │
 ├── F-14 (LCME) ←── F-07 + F-08
 ├── F-16 (Notifications)
 ├── F-17 (Admin Integrity)
 ├── F-18 (Settings)
 │
 └── Tier 2:
      F-19 (Practice) ──→ F-20 (Student Dashboard) ──→ F-21 (At-Risk)
```

---

## Screen Coverage

| Design Spec Group | Screens | Feature(s) |
|-------------------|---------|------------|
| A. Public & Auth (9) | Login, Register, ForgotPassword, etc. | F-01 |
| B. Onboarding (4) | Onboarding, StudentOnboarding, etc. | F-01 |
| C. Dashboards (3) | Dashboard, FacultyDashboard, StudentDashboard | F-15, F-20 |
| D. Student Learning (5) | Practice, QuestionView, Results, Progress, Analytics | F-19, F-20 |
| E. Course Management (14) | AllCourses through OutcomeMapping | F-04, F-05, F-06, F-07 |
| F. Question Generation (7) | GenerationSpecWizard through BatchProgress | F-09 |
| G. Question Review (7) | ReviewList through QuestionHistory | F-10 |
| H. Repository (2) | Repository, ItemBankBrowser | F-11 |
| I. Exam Management (3) | ExamAssembly, ExamAssignment, RetiredExamUpload | F-12 |
| J. Uploads & Ops (2) | FacultyQuestionUpload, BulkOperations | F-05, F-09 |
| K. Analytics (4) | Analytics, CourseAnalytics, PersonalDashboard, BlueprintCoverage | F-15, F-13 |
| L. Admin Backend (12) | AdminDashboard through LCMEElementDrillDown | F-02, F-03, F-07, F-08, F-14, F-17 |
| M. Settings & Support (6) | Profile through QuestionTemplates | F-16, F-18 |
| N. Error (1) | NotFound | (shared) |

**Total: 78 screens mapped to 21 features across 45 epics.**
