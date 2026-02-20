export const C = {
  navyDeep: "var(--color-navy-deep)",
  navy: "var(--color-navy)",
  blue: "var(--color-blue)",
  blueMid: "var(--color-blue-mid)",
  blueLight: "var(--color-blue-light)",
  bluePale: "var(--color-blue-pale)",
  greenDark: "var(--color-green-dark)",
  green: "var(--color-green)",
  lime: "var(--color-lime)",
  ink: "var(--color-ink)",
  warmGray: "var(--color-warm-gray)",
  cream: "var(--color-cream)",
  parchment: "var(--color-parchment)",
  white: "var(--color-white)",
  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  border: "var(--color-border)",
  borderLight: "var(--color-border-light)",
};

export const pillarColors = [C.navyDeep, C.blue, C.blueMid, C.green];

export type PersonaKey = "faculty" | "admin" | "advisors" | "students";

export interface PersonaData {
  label: string;
  short: string;
  color: string;
  tagline: string;
  benefits: { title: string; desc: string }[];
  steps: { title: string; desc: string }[];
}

export const personas: Record<PersonaKey, PersonaData> = {
  faculty: {
    label: "Faculty & Course Directors",
    short: "Faculty",
    color: C.green,
    tagline:
      "You became an educator to teach — not to spend weekends writing exams.",
    benefits: [
      {
        title: "From 40 hours to 40 minutes",
        desc: "AI generates assessment items grounded in your actual syllabus. You review, refine, and approve. Your expertise stays central — the busywork doesn't.",
      },
      {
        title: "See the reasoning, not just the output",
        desc: "Every generated question shows which concept it targets, why each distractor exists, and what cognitive level it assesses. Full transparency, always.",
      },
      {
        title: "Questions that actually measure learning",
        desc: "Evidence-Centered Design validates items against psychometric standards before they reach students. No more guessing whether a question is good enough.",
      },
      {
        title: "A question bank that stays current",
        desc: "Every item is linked to your live curriculum. When content changes, the system flags questions that need updating. No more stale banks drifting out of alignment.",
      },
    ],
    steps: [
      {
        title: "Share your materials",
        desc: "Upload your syllabus, lecture slides, or course outline. Journey reads and maps your content to the knowledge graph — no manual tagging required.",
      },
      {
        title: "Generate in one click",
        desc: "Choose a topic, cognitive level, and quantity. AI produces NBME-format items grounded in exactly what you teach — not generic clinical scenarios.",
      },
      {
        title: "Review with full context",
        desc: "Each item comes with a reasoning trace: why this stem, why these distractors, which concept it targets. Approve it, refine it, or ask the AI to try again.",
      },
      {
        title: "Deliver and improve over time",
        desc: "Export to your LMS or deliver through Journey. As students respond, the system learns which items discriminate well and flags those that need attention.",
      },
    ],
  },
  admin: {
    label: "Institutional Leaders",
    short: "Admin",
    color: C.blue,
    tagline:
      "You've built something exceptional. Now you can show the evidence.",
    benefits: [
      {
        title: "Accreditation readiness, not scramble",
        desc: "Six competency frameworks aligned in one system. Coverage gaps surface automatically. Reports generate from real data — not retroactive spreadsheet assembly.",
      },
      {
        title: "See your curriculum as it really is",
        desc: "Real-time visibility into what's being taught, how concepts connect, and where the gaps hide. Not an annual audit — a living dashboard.",
      },
      {
        title: "An evidence chain you can trace",
        desc: "From what was taught, through what was assessed, to what students demonstrated. Every claim backed by data. Every link in the graph.",
      },
      {
        title: "A platform that grows with you",
        desc: "Start with curriculum mapping. Unlock psychometric measurement, predictive advising, and institutional analytics as your data deepens.",
      },
    ],
    steps: [
      {
        title: "Map the curriculum",
        desc: "Upload syllabi, course outlines, and competency frameworks. Journey builds the knowledge graph — every concept, connection, and standard in one place.",
      },
      {
        title: "See the full picture",
        desc: "Your dashboard shows curriculum coverage, assessment alignment, and accreditation readiness across every program. Gaps are visible, not buried.",
      },
      {
        title: "Evidence accumulates naturally",
        desc: "As faculty create and deliver assessments through Journey, compliance data builds itself. No end-of-year scramble to pull reports.",
      },
      {
        title: "Report with confidence",
        desc: "Generate accreditation-ready reports that trace from learning objectives through assessments to demonstrated student competency.",
      },
    ],
  },
  advisors: {
    label: "Academic Advisors",
    short: "Advisors",
    color: C.blueLight,
    tagline:
      "What if you could see where a student needs help before they ask?",
    benefits: [
      {
        title: "Early signals, not late alarms",
        desc: "Performance drops and mastery plateaus surface in real time — not after a failing grade. You see the pattern before the student feels the consequences.",
      },
      {
        title: "Precision, not intuition",
        desc: "See exactly which concepts a student has and hasn't mastered, at what cognitive level, across which courses. Advising grounded in data, not just conversation.",
      },
      {
        title: "Intervention workflows built in",
        desc: "Flag a concern, notify the right people, recommend resources, and track follow-through — all within the system. Not a separate spreadsheet.",
      },
      {
        title: "The full student picture",
        desc: "A Digital Twin models each student's mastery journey. You see patterns across courses, over time, in context. One view, complete understanding.",
      },
    ],
    steps: [
      {
        title: "Open the student view",
        desc: "Each student's mastery profile shows concept-level understanding across all their courses. Color-coded, sortable, and always current.",
      },
      {
        title: "Spot the pattern",
        desc: "Automated alerts surface students showing early signs of struggle — drops in mastery velocity, widening gaps, or patterns across related concepts.",
      },
      {
        title: "Intervene with specifics",
        desc: "Instead of 'you need to study more,' you can say 'your cardiovascular pharmacology concepts are below threshold — here's a targeted practice set.'",
      },
      {
        title: "Track the outcome",
        desc: "Follow each student's trajectory after intervention. See whether mastery improves, plateaus, or needs a different approach.",
      },
    ],
  },
  students: {
    label: "Students",
    short: "Students",
    color: C.green,
    tagline:
      "Study what your professors actually teach — and know exactly where you stand.",
    benefits: [
      {
        title: "Practice that matches your courses",
        desc: "Every practice question is generated from what your professors actually teach — not generic Step prep from a company that's never seen your syllabus.",
      },
      {
        title: "Know your gaps before the exam",
        desc: "A personal mastery map shows what you've demonstrated competency in and where you're still building. No surprises on test day.",
      },
      {
        title: "Smarter study, not longer study",
        desc: "Spaced repetition and adaptive difficulty target your specific weak spots. Your study time goes where it actually moves the needle.",
      },
      {
        title: "Learn the way medicine connects",
        desc: "Because the knowledge graph models how concepts relate, your practice sessions surface connections between topics — the way clinical reasoning actually works.",
      },
    ],
    steps: [
      {
        title: "Pick a topic or let Journey choose",
        desc: "Browse by course, organ system, or concept — or let the adaptive engine surface what you need most based on your mastery profile.",
      },
      {
        title: "Practice with real context",
        desc: "Each question is tagged to your curriculum and comes with an explanation that connects back to what you've been taught. Not just 'the answer is C.'",
      },
      {
        title: "Watch your mastery grow",
        desc: "Your personal dashboard tracks concept-level understanding over time. See exactly where you're strong and where another pass would help.",
      },
      {
        title: "Let the system adapt to you",
        desc: "Spaced repetition resurfaces concepts at the right intervals. Weak areas get more attention automatically. Your study plan evolves as you learn.",
      },
    ],
  },
};

export const features = [
  {
    icon: "◈",
    title: "A knowledge graph at the center",
    desc: "Your curriculum modeled as a connected network — not isolated rows in a database.",
    detail:
      "75+ node types, 80+ relationship types. Concepts, lectures, questions, competencies, and standards — all linked in one traversable graph.",
  },
  {
    icon: "◆",
    title: "AI that knows what you actually teach",
    desc: "Generated content grounded in your syllabus, your courses, your institution's curriculum.",
    detail:
      "Multi-model pipeline validated against Evidence-Centered Design. Every question traceable to curriculum content.",
  },
  {
    icon: "◇",
    title: "Measurement that grows with your data",
    desc: "Start with knowledge tracing. Graduate to psychometric models as evidence accumulates.",
    detail:
      "Bayesian Knowledge Tracing → Item Response Theory → Multidimensional IRT. Student Digital Twins model mastery at the concept level.",
  },
  {
    icon: "▣",
    title: "Compliance as a natural byproduct",
    desc: "Stop assembling accreditation evidence. Let it accumulate from the work you're already doing.",
    detail:
      "USMLE, ACGME, EPA, Bloom's, Miller's, LCME — all mapped into the graph. Reports self-generate.",
  },
  {
    icon: "▢",
    title: "Advising powered by real data",
    desc: "Faculty and advisors see exactly where students need support — before grades tell the story.",
    detail:
      "Early warning systems, concept-level mastery dashboards, and intervention workflows.",
  },
  {
    icon: "✦",
    title: "Fits into what you already use",
    desc: "Journey integrates with your LMS, SIS, and existing workflows — not the other way around.",
    detail:
      "LTI-compatible exports, gradebook sync, and SIS integration. Start using Journey without replacing anything you already have.",
  },
];

export const chainSteps = [
  {
    label: "TEACHES",
    desc: "Faculty connect content to concepts",
    color: C.navyDeep,
  },
  {
    label: "VERIFIED",
    desc: "System confirms curriculum alignment",
    color: C.blue,
  },
  {
    label: "ADDRESSED",
    desc: "Assessment items target each concept",
    color: C.blueMid,
  },
  {
    label: "ASSESSES",
    desc: "Students demonstrate understanding",
    color: C.green,
  },
  {
    label: "FULFILLS",
    desc: "Accreditation standards are satisfied",
    color: C.greenDark,
  },
];

export const stats = [
  { value: 80, suffix: "%", label: "less time on exams" },
  { value: 6, suffix: "", label: "frameworks aligned" },
  { value: 45, suffix: "+", label: "research foundations" },
  { value: 75, suffix: "+", label: "knowledge node types" },
];

export const researchItems = [
  {
    author: "Mislevy et al.",
    framework: "Evidence-Centered Design",
    area: "Assessment Validity",
    detail:
      "A framework for designing assessments where every question is built from a chain of claims about what students know, evidence that would support those claims, and tasks that produce that evidence.",
  },
  {
    author: "Corbett & Anderson",
    framework: "Bayesian Knowledge Tracing",
    area: "Mastery Estimation",
    detail:
      "A probabilistic model that estimates what a student knows based on their response history — tracking the likelihood of mastery for each concept over time.",
  },
  {
    author: "Roediger & Karpicke",
    framework: "Testing Effect",
    area: "Learning Science",
    detail:
      "The finding that actively retrieving information from memory strengthens long-term retention more effectively than re-reading or passive review.",
  },
  {
    author: "Van der Linden",
    framework: "Item Response Theory",
    area: "Psychometric Measurement",
    detail:
      "A statistical framework that models how individual test questions behave — their difficulty, how well they distinguish strong from weak students, and how to score adaptively.",
  },
];
