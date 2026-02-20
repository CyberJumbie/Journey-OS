import type { FAQCategory, FAQEntry } from "@journey-os/types";

/**
 * FAQ categories displayed in the sidebar and as accordion section headers.
 * Sorted by sortOrder for consistent display.
 */
export const FAQ_CATEGORIES: readonly FAQCategory[] = [
  {
    id: "getting-started",
    label: "Getting Started",
    description: "Set up your account, courses, and dashboard",
    icon: "\u25C8",
    sortOrder: 1,
  },
  {
    id: "generation",
    label: "Generation",
    description: "AI-powered question generation pipeline",
    icon: "\u2726",
    sortOrder: 2,
  },
  {
    id: "review",
    label: "Review",
    description: "Review, approve, and edit generated questions",
    icon: "\u25C7",
    sortOrder: 3,
  },
  {
    id: "templates",
    label: "Templates",
    description: "Create and manage question templates",
    icon: "\u25C6",
    sortOrder: 4,
  },
  {
    id: "item-bank",
    label: "Item Bank",
    description: "Search, tag, and export assessment items",
    icon: "\u25A3",
    sortOrder: 5,
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Coverage heatmaps, quality KPIs, and mastery data",
    icon: "\u25A2",
    sortOrder: 6,
  },
] as const;

/**
 * All FAQ entries across all categories.
 * Each entry supports Markdown formatting in the answer field.
 */
export const FAQ_ENTRIES: readonly FAQEntry[] = [
  // ── Getting Started ──────────────────────────────────────────
  {
    id: "faq-gs-1",
    question: "How do I set up my first course in Journey OS?",
    answer:
      "Navigate to the **Dashboard** and click **+ New Course**. You will be guided through a setup wizard that asks for the course name, code, term, and associated program. Once created, you can upload a syllabus, add sections, and schedule sessions. The course appears on your dashboard immediately.",
    category: "getting-started",
    tags: ["course", "setup", "wizard", "new course"],
    relatedLinks: [
      { label: "Course Setup Guide", href: "/help/guides/course-setup" },
    ],
    sortOrder: 1,
  },
  {
    id: "faq-gs-2",
    question: "What file formats are supported for syllabus upload?",
    answer:
      "Journey OS accepts **PDF**, **DOCX**, and **TXT** files for syllabus upload. The maximum file size is **25 MB**. After upload, the system parses the document to extract learning objectives and map them to USMLE content areas automatically.",
    category: "getting-started",
    tags: ["upload", "syllabus", "file format", "PDF", "DOCX"],
    relatedLinks: [{ label: "Upload Guide", href: "/help/guides/upload" }],
    sortOrder: 2,
  },
  {
    id: "faq-gs-3",
    question: "How do I navigate the dashboard?",
    answer:
      "The dashboard is organized into sections: **KPI Strip** at the top shows key metrics, **Course Cards** in the center provide quick access to your courses, and **Quick Actions** on the right let you generate questions or review items. Use the **sidebar** on the left to navigate between pages like Analytics, Item Bank, and Settings.",
    category: "getting-started",
    tags: ["dashboard", "navigation", "sidebar", "KPI"],
    relatedLinks: [],
    sortOrder: 3,
  },
  {
    id: "faq-gs-4",
    question: "Can I customize my dashboard view?",
    answer:
      "Currently, the dashboard layout is fixed to ensure a consistent experience. However, you can collapse sidebar sections and reorder course cards by dragging them. Future releases will introduce customizable widget layouts.",
    category: "getting-started",
    tags: ["dashboard", "customize", "layout", "widgets"],
    relatedLinks: [],
    sortOrder: 4,
  },

  // ── Generation ───────────────────────────────────────────────
  {
    id: "faq-gen-1",
    question: "How do I generate exam questions?",
    answer:
      "Open a course and navigate to the **Generation Workbench**. Select the learning objectives you want to target, choose a question type (e.g., `MCQ`, `Clinical Vignette`), and click **Generate**. The AI pipeline produces questions in real-time, streaming results to your screen via SSE.",
    category: "generation",
    tags: ["generate", "questions", "MCQ", "workbench", "SSE"],
    relatedLinks: [
      { label: "Generation Workbench Guide", href: "/help/guides/generation" },
    ],
    sortOrder: 1,
  },
  {
    id: "faq-gen-2",
    question: "How does the AI generation pipeline work?",
    answer:
      "The pipeline uses a **LangGraph.js** orchestrator with three agents: (1) **Author Agent** drafts the question using the learning objective and USMLE content mapping, (2) **Critic Agent** evaluates the draft for quality and alignment, and (3) **Refinement Agent** iterates to meet the quality threshold. The entire process is streamed to the frontend.",
    category: "generation",
    tags: ["pipeline", "LangGraph", "author", "critic", "refinement", "AI"],
    relatedLinks: [],
    sortOrder: 2,
  },
  {
    id: "faq-gen-3",
    question: "What does the Critic Agent score mean?",
    answer:
      "The Critic Agent assigns a **quality score from 0 to 100** based on multiple dimensions: clinical accuracy, USMLE alignment, distractor plausibility, and stem clarity. Scores above the **auto-approve threshold** (default: 85) are flagged as ready for review. Scores below 60 trigger an additional refinement pass.",
    category: "generation",
    tags: ["critic", "score", "quality", "auto-approve", "threshold"],
    relatedLinks: [
      { label: "Quality Scoring Guide", href: "/help/guides/quality-scoring" },
    ],
    sortOrder: 3,
  },
  {
    id: "faq-gen-4",
    question: "Can I control the difficulty of generated questions?",
    answer:
      "Yes. In the Generation Workbench, use the **Difficulty** slider to target `Easy`, `Medium`, or `Hard` questions. The Author Agent adjusts clinical complexity, distractor similarity, and required reasoning depth accordingly. You can also specify a target **Bloom's taxonomy level** for finer control.",
    category: "generation",
    tags: ["difficulty", "Bloom's taxonomy", "easy", "medium", "hard"],
    relatedLinks: [],
    sortOrder: 4,
  },

  // ── Review ───────────────────────────────────────────────────
  {
    id: "faq-rev-1",
    question: "How do I review generated questions?",
    answer:
      "Navigate to the **Review Queue** from the sidebar. Questions are listed with their quality score, category, and status. Click on a question to see the full stem, answer choices, explanation, and Critic Agent feedback. You can **Approve**, **Reject**, or **Edit** each item.",
    category: "review",
    tags: ["review", "queue", "approve", "reject", "edit"],
    relatedLinks: [
      { label: "Review Workflow Guide", href: "/help/guides/review" },
    ],
    sortOrder: 1,
  },
  {
    id: "faq-rev-2",
    question: "What is the auto-approve threshold?",
    answer:
      "The auto-approve threshold is a **configurable quality score** (default: 85) above which questions are automatically marked as `Approved` without manual review. You can adjust this threshold in **Course Settings > Generation Preferences**. Setting it higher increases quality but requires more manual review.",
    category: "review",
    tags: ["auto-approve", "threshold", "settings", "quality"],
    relatedLinks: [],
    sortOrder: 2,
  },
  {
    id: "faq-rev-3",
    question: "Can I edit a question after it has been approved?",
    answer:
      "Yes. Approved questions can be edited at any time from the **Item Bank**. Editing an approved question changes its status to `Draft` and requires re-approval. The edit history is preserved for audit purposes.",
    category: "review",
    tags: ["edit", "approved", "item bank", "draft", "audit"],
    relatedLinks: [],
    sortOrder: 3,
  },
  {
    id: "faq-rev-4",
    question: "How does the Toulmin argument help with review?",
    answer:
      "Each generated question includes a **Toulmin argument** breakdown: **Claim** (the correct answer rationale), **Grounds** (clinical evidence), **Warrant** (the reasoning link), and **Backing** (authoritative sources). This structured argument helps reviewers verify clinical accuracy and pedagogical soundness without needing to research independently.",
    category: "review",
    tags: ["Toulmin", "argument", "claim", "grounds", "warrant"],
    relatedLinks: [
      { label: "Toulmin Framework Guide", href: "/help/guides/toulmin" },
    ],
    sortOrder: 4,
  },

  // ── Templates ────────────────────────────────────────────────
  {
    id: "faq-tpl-1",
    question: "What are question templates?",
    answer:
      "Question templates are **reusable blueprints** for generating questions. A template defines the question type, target Bloom's level, difficulty range, USMLE system mapping, and any custom constraints. When you generate questions using a template, the AI pipeline follows the template's specifications.",
    category: "templates",
    tags: ["template", "blueprint", "reusable", "question type"],
    relatedLinks: [{ label: "Template Guide", href: "/help/guides/templates" }],
    sortOrder: 1,
  },
  {
    id: "faq-tpl-2",
    question: "How do I create a question template?",
    answer:
      "Go to **Templates** in the sidebar and click **+ New Template**. Fill in the template name, select the question type, configure the target difficulty and Bloom's level, map to USMLE content areas, and optionally add custom instructions for the Author Agent. Save the template to make it available in the Generation Workbench.",
    category: "templates",
    tags: ["create", "new template", "configure", "USMLE"],
    relatedLinks: [],
    sortOrder: 2,
  },
  {
    id: "faq-tpl-3",
    question: "Can I share templates with other faculty?",
    answer:
      "Yes. Templates support three sharing levels: **Private** (only you), **Institution** (all faculty at your institution), and **Public** (all Journey OS users). Set the sharing level when creating or editing a template. Shared templates appear in the recipient's Template Library.",
    category: "templates",
    tags: ["share", "private", "institution", "public", "collaboration"],
    relatedLinks: [],
    sortOrder: 3,
  },

  // ── Item Bank ────────────────────────────────────────────────
  {
    id: "faq-ib-1",
    question: "How do I search the Item Bank?",
    answer:
      "The Item Bank supports **full-text search** across question stems, answer choices, and explanations. Use the search bar at the top and apply filters for USMLE system, discipline, question type, difficulty, and status. Results are ranked by relevance using **semantic search** powered by Voyage AI embeddings (1024-dim).",
    category: "item-bank",
    tags: ["search", "item bank", "filter", "semantic", "Voyage AI"],
    relatedLinks: [
      { label: "Item Bank Guide", href: "/help/guides/item-bank" },
    ],
    sortOrder: 1,
  },
  {
    id: "faq-ib-2",
    question: "How are items tagged with USMLE topics?",
    answer:
      "During generation, the AI pipeline automatically maps each question to the relevant **USMLE Content Outline** areas: System (e.g., Cardiovascular), Discipline (e.g., Pharmacology), and Competency (e.g., Medical Knowledge). You can manually adjust tags during review. The mapping uses a curated Neo4j knowledge graph of USMLE topics.",
    category: "item-bank",
    tags: ["USMLE", "tagging", "content outline", "Neo4j", "knowledge graph"],
    relatedLinks: [],
    sortOrder: 2,
  },
  {
    id: "faq-ib-3",
    question: "Can I export questions from the Item Bank?",
    answer:
      "Yes. Select one or more questions and click **Export**. Supported formats include **QTI** (for LMS integration), **CSV** (for spreadsheet analysis), and **PDF** (for printable exams). Exports include the question stem, answer choices, correct answer, explanation, and all metadata tags.",
    category: "item-bank",
    tags: ["export", "QTI", "CSV", "PDF", "LMS"],
    relatedLinks: [],
    sortOrder: 3,
  },

  // ── Analytics ────────────────────────────────────────────────
  {
    id: "faq-an-1",
    question: "What does the USMLE coverage heatmap show?",
    answer:
      "The USMLE coverage heatmap displays a **matrix of Systems vs. Disciplines** with color intensity representing the number of approved questions covering each intersection. Darker cells indicate stronger coverage. Click any cell to drill into the specific questions mapped to that System-Discipline pair.",
    category: "analytics",
    tags: ["heatmap", "USMLE", "coverage", "systems", "disciplines"],
    relatedLinks: [
      { label: "Analytics Guide", href: "/help/guides/analytics" },
    ],
    sortOrder: 1,
  },
  {
    id: "faq-an-2",
    question: "How is the 'Avg Item Quality' KPI calculated?",
    answer:
      "The **Avg Item Quality** KPI is the mean Critic Agent score across all approved questions in the selected course or institution scope. Only questions with status `Approved` are included. The score ranges from 0 to 100, with the institution benchmark displayed for comparison.",
    category: "analytics",
    tags: ["KPI", "quality", "critic score", "average", "benchmark"],
    relatedLinks: [],
    sortOrder: 2,
  },
  {
    id: "faq-an-3",
    question: "What does the Coverage Score percentage mean?",
    answer:
      "The **Coverage Score** is the percentage of USMLE Content Outline cells (System x Discipline) that have at least one approved question. A score of 100% means every required content area is represented. The score is calculated at the course level and aggregated for institution-wide reporting.",
    category: "analytics",
    tags: ["coverage score", "percentage", "USMLE", "content outline"],
    relatedLinks: [],
    sortOrder: 3,
  },
  {
    id: "faq-an-4",
    question: "How do I interpret the cohort mastery heatmap?",
    answer:
      "The cohort mastery heatmap shows **student performance** across USMLE content areas. Rows represent students (anonymized by default), columns represent System-Discipline pairs, and cell color indicates mastery level: **green** (mastered), **yellow** (developing), **red** (needs attention). Use this to identify content gaps across your class.",
    category: "analytics",
    tags: ["mastery", "heatmap", "cohort", "student performance", "gaps"],
    relatedLinks: [],
    sortOrder: 4,
  },
] as const;
