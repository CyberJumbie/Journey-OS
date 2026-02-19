# Journey OS — Product Brief

**Date:** February 19, 2026  
**Institution:** Morehouse School of Medicine (MSM)  
**Stage:** Pre-development. Architecture complete. Sprint 1 imminent.

---

## The Problem

Medical schools face three interconnected crises that compound each other.

**Assessment bottleneck.** A single high-quality NBME-style exam question takes faculty 30–60 minutes to write. A typical course needs 200–400 questions per year. Most faculty aren't trained in psychometrics or Evidence-Centered Design. Result: question banks are thin, recycled, and poorly validated. Students see the same items year after year. Item quality varies wildly between faculty authors.

**Accreditation burden.** LCME site visits require evidence that every standard and element is addressed across the curriculum. This evidence currently lives in spreadsheets, narrative documents, and faculty memory. Assembling a compliance report for a single standard can take weeks of manual work. Curriculum mapping is a full-time job that nobody was hired to do.

**Student support gap.** Faculty and advisors know which students are struggling — but only after midterm grades arrive, which is too late. There's no mechanism to identify *why* a student is failing (which specific concepts, which prerequisite gaps) or to intervene with targeted remediation before the damage is done.

These problems share a root cause: the curriculum's knowledge structure isn't machine-readable. Everything is in documents, slide decks, and people's heads. Journey OS makes it machine-readable through a knowledge graph, then builds automation on top.

---

## Personas

### Dr. Amara Osei — Course Director (Primary User)

**Role:** Directs Organ Systems I (MEDI 531), teaches pathophysiology. 15 years at MSM.

**Current workflow:** Writes exam questions in Word, emails to admin for formatting. Reviews other faculty's questions by reading them and guessing at quality. Tracks USMLE coverage in a personal spreadsheet. Assembles LCME evidence by searching emails and shared drives.

**Pain points:**
- Spends 2 full weekends per semester writing exam questions
- Has no way to know if her exam covers the USMLE blueprint adequately
- Gets blindsided by LCME requests for evidence she can't quickly produce
- Knows some faculty submit low-quality questions but has no objective way to flag them
- Wants to help struggling students earlier but doesn't have granular data

**Success looks like:** "I describe what I need and get a draft question in 30 seconds. I review it, tweak it, approve it. My USMLE coverage dashboard is green. When LCME asks for evidence, I click a button."

**Usage pattern:** Heavy bursts during exam prep (2–3 weeks before exams, 4× per year). Moderate during syllabus season (August, January). Light otherwise. Expects to generate 50–100 questions per exam cycle.

### Marcus Williams — M2 Student

**Role:** Second-year medical student. Preparing for Step 1 while managing coursework.

**Current workflow:** Uses Anki, UWorld, and Pathoma independently. No connection between coursework and board prep. Doesn't know which concepts he's weak on until he fails a practice block.

**Pain points:**
- Can't tell which course concepts map to which USMLE systems
- Practices blindly — no adaptive targeting of weak areas
- Gets exam results as a single score, not a concept-level breakdown
- No way to know if he's on track for Step 1 until he takes a practice NBME

**Success looks like:** "I open Journey OS, it tells me I'm weak in Renal Pharmacology, gives me 10 targeted questions, and I can see my mastery go up in real time."

**Usage pattern:** Daily during dedicated study blocks (30–60 min). Heavier before exams. Tier 2 feature — not available until Month 10+.

### Dr. Kenji Takahashi — Associate Dean for Academic Affairs

**Role:** Oversees curriculum quality, LCME compliance, student performance tracking. Reports to the Dean.

**Current workflow:** Receives spreadsheet reports from course directors quarterly. Manually aggregates for LCME self-study. Gets student alert emails from advisors. No single dashboard.

**Pain points:**
- Can't answer "are we covering LCME Standard 7?" without weeks of work
- Student at-risk data arrives too late and too coarse
- No programmatic way to prove curriculum quality to accreditors
- Faculty assessment quality varies but there's no institutional standard

**Success looks like:** "I open a dashboard, see LCME compliance by standard with evidence links, see at-risk students flagged 4 weeks before failure, and can show accreditors real-time data."

**Usage pattern:** Weekly dashboard checks. Heavy during LCME self-study (months-long process). Tier 1–2 feature.

### Fatima Al-Rashid — Academic Advisor

**Role:** Advises cohort of 40 M1/M2 students. First point of contact for academic difficulty.

**Current workflow:** Meets with flagged students after midterms. Reviews grade reports. Refers to tutoring. No concept-level data — just course grades.

**Pain points:**
- Only knows a student is struggling after they've already failed a midterm
- Can't identify *what* the student doesn't understand, only *that* they're behind
- Intervention recommendations are generic ("study more") because data is generic

**Success looks like:** "I see that Marcus is flagged 3 weeks before the Organ Systems exam. The system shows he's weak on 4 specific SubConcepts in Renal, all stemming from a gap in acid-base physiology. I send him targeted practice and a tutoring referral for that specific topic."

**Usage pattern:** Weekly cohort review. Ad hoc student meetings. Tier 2 feature.

---

## Success Metrics

### Tier 0 (Months 1–4): Foundation

| Metric | Target | How Measured |
|--------|--------|-------------|
| One question generated end-to-end | Yes/No | Sprint 6 demo |
| Faculty can upload syllabus and see extracted concepts | Yes/No | Sprint 5 demo |
| USMLE gap heatmap renders with real data | Yes/No | Sprint 8 demo |
| Time from faculty request to draft question | < 45 seconds | Pipeline timing logs |

### Tier 1 (Months 5–12): Faculty Value

| Metric | Target | How Measured |
|--------|--------|-------------|
| Approved questions in bank | ≥ 200 | Supabase count |
| Critic Agent auto-handle rate | ≥ 60% | `routing` field distribution |
| Faculty-reported time savings | ≥ 70% reduction vs. manual | Survey |
| Faculty satisfaction | "Useful" or better | Likert survey at pilot end |
| Question quality vs. manually written | Non-inferior on 6 Critic metrics | Blind comparison study |
| Cost per approved item | < $0.15 | Generation logs |
| Pipeline reliability | ≥ 95% success rate | Error rate tracking |
| LCME evidence generation time | < 5 minutes per standard | Timed task |

### Tier 2 (Months 10–16): Student Value

| Metric | Target | How Measured |
|--------|--------|-------------|
| Calibrated items (IRT) | ≥ 500 | Psychometric analysis |
| Adaptive practice outperforms static | Effect size ≥ 0.3 | A/B test |
| At-risk prediction lead time | ≥ 2 weeks before failure | Retrospective validation |
| At-risk prediction accuracy | ≥ 80% precision | Confusion matrix |
| Student engagement | ≥ 3 practice sessions/week | Usage logs |
| Student satisfaction | "Helpful" or better | Likert survey |

### Tier 3 (Months 16–24): Institutional Scale

| Metric | Target | How Measured |
|--------|--------|-------------|
| Institutions onboarded | ≥ 3 | Contracts |
| Cross-institution item sharing | Operational | Feature flag |
| GNN prerequisite prediction | ≥ 70% accuracy | Validation set |

---

## What Journey OS Is NOT

- **Not an LMS.** It doesn't host lectures, manage assignments, or track attendance. It complements Canvas/Blackboard, doesn't replace them.
- **Not an autonomous AI.** Faculty curate, not just consume. Every question goes through human review (or human-configured auto-approval thresholds).
- **Not a test delivery platform** (initially). Tier 0–1 generates and manages questions. Exam delivery and student-facing features arrive in Tier 2.
- **Not a replacement for UWorld/Anki.** It generates *course-specific* questions aligned to *institutional* learning objectives. Board prep tools use generic content.

---

## Competitive Landscape

| Product | What It Does | How Journey OS Differs |
|---------|-------------|----------------------|
| **ExamSoft** | Secure exam delivery + basic analytics | No question generation. No knowledge graph. No concept-level mastery. Journey OS generates the questions ExamSoft delivers. |
| **UWorld / Amboss** | Board prep question banks | Generic, not institution-specific. No curriculum mapping. No faculty authoring tools. Journey OS creates institution-aligned items. |
| **Osmosis** | Video learning + practice questions | Content platform, not assessment system. No ECD, no psychometrics, no compliance. |
| **Qarium / ItemLogic** | Item banking + psychometrics | Item management, not generation. Faculty still write every question. No knowledge graph. No curriculum mapping. |
| **ChatGPT / Claude direct** | Ad hoc question generation | No quality control pipeline, no graph context, no dedup, no validation, no compliance chain, no mastery tracking. Hallucination-prone without structural constraints. |

**The moat:** The knowledge graph. Once seeded with an institution's curriculum, framework mappings, and assessment history, it creates structural constraints that make AI generation dramatically more reliable than prompt-and-pray approaches. The graph gets more valuable with every question generated, every concept mapped, every student attempt recorded.

---

## Go-to-Market (MSM First)

**Phase 1 — Internal pilot (Tier 0–1):** Single course (MEDI 531, Organ Systems I, Dr. Osei). Generate 200+ questions. Faculty validates quality. Measure time savings.

**Phase 2 — Department expansion (Tier 1):** Roll out to all pre-clerkship courses. Standardize question quality. Begin LCME evidence generation.

**Phase 3 — Student features (Tier 2):** Launch adaptive practice for M1/M2 students. Begin at-risk prediction.

**Phase 4 — Multi-institution (Tier 3):** Onboard 2–3 partner institutions. Validate cross-institutional patterns.

---

*This brief is the "why" behind the architecture. When a technical decision seems arbitrary, check here for the user need that drove it.*
