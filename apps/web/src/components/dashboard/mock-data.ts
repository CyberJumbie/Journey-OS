export const mockUser = {
  name: "Dr. Adeyemi",
  initials: "OA",
  role: "Faculty",
  department: "Pharmacology",
};

export const mockKpis = [
  {
    label: "Questions Generated",
    value: "342",
    change: "+28 this week",
    trend: "up" as const,
    spark: [12, 18, 14, 22, 19, 28, 24],
  },
  {
    label: "Avg Item Quality",
    value: "0.84",
    change: "IRT difficulty",
    trend: "stable" as const,
    spark: [0.78, 0.81, 0.79, 0.83, 0.82, 0.84, 0.84],
  },
  {
    label: "Coverage Score",
    value: "91%",
    change: "+3% from last month",
    trend: "up" as const,
    spark: [72, 76, 80, 83, 87, 88, 91],
  },
  {
    label: "Active Students",
    value: "127",
    change: "across 3 courses",
    trend: "stable" as const,
    spark: [118, 120, 122, 124, 125, 126, 127],
  },
];

export const mockCourses = [
  {
    name: "Medical Pharmacology I",
    code: "PHAR 501",
    students: 64,
    coverage: 91,
    items: 186,
    status: "active" as const,
    color: "#002c76",
  },
  {
    name: "Clinical Pharmacology",
    code: "PHAR 602",
    students: 38,
    coverage: 74,
    items: 98,
    status: "active" as const,
    color: "#2b71b9",
  },
  {
    name: "Pharmacogenomics",
    code: "PHAR 710",
    students: 25,
    coverage: 62,
    items: 58,
    status: "draft" as const,
    color: "#69a338",
  },
];

export const mockActivity = [
  {
    type: "generated" as const,
    text: "24 new items generated for PHAR 501 — Autonomic Nervous System",
    time: "2 hours ago",
    icon: "◆",
  },
  {
    type: "review" as const,
    text: "IRT calibration complete for Exam 2 item pool — 3 items flagged",
    time: "5 hours ago",
    icon: "◇",
  },
  {
    type: "alert" as const,
    text: "Coverage gap detected: Renal Pharmacology below 60% threshold",
    time: "1 day ago",
    icon: "▣",
  },
  {
    type: "student" as const,
    text: "12 students below mastery threshold in Receptor Pharmacology",
    time: "1 day ago",
    icon: "▢",
  },
  {
    type: "generated" as const,
    text: "Exam 3 blueprint mapped — 40 items across 8 topics",
    time: "2 days ago",
    icon: "◈",
  },
];

export const mockMasteryTopics = [
  { name: "Autonomic NS", mastery: 0.82 },
  { name: "Receptor Pharm", mastery: 0.45 },
  { name: "Cardiovascular", mastery: 0.71 },
  { name: "Renal", mastery: 0.38 },
  { name: "GI Pharm", mastery: 0.67 },
  { name: "CNS Agents", mastery: 0.59 },
  { name: "Antimicrobials", mastery: 0.88 },
  { name: "Endocrine", mastery: 0.53 },
  { name: "Chemotherapy", mastery: 0.29 },
  { name: "Pain Mgmt", mastery: 0.74 },
  { name: "Immunopharm", mastery: 0.61 },
  { name: "Toxicology", mastery: 0.42 },
];

export const mockTasks = [
  {
    title: "Review flagged items from Exam 2",
    due: "Today",
    priority: "high" as const,
    course: "PHAR 501",
  },
  {
    title: "Approve Exam 3 blueprint",
    due: "Tomorrow",
    priority: "medium" as const,
    course: "PHAR 501",
  },
  {
    title: "Map missing Renal Pharmacology objectives",
    due: "Feb 19",
    priority: "high" as const,
    course: "PHAR 602",
  },
  {
    title: "Generate practice set for midterm prep",
    due: "Feb 21",
    priority: "low" as const,
    course: "PHAR 710",
  },
];

export const navItems = [
  { key: "dashboard", label: "Dashboard", icon: "◈" },
  { key: "courses", label: "Courses", icon: "◆" },
  { key: "generate", label: "Generate", icon: "✦" },
  { key: "assessments", label: "Assessments", icon: "◇" },
  { key: "students", label: "Students", icon: "▢" },
  { key: "analytics", label: "Analytics", icon: "▣" },
];

export const quickActions = [
  { label: "Generate Items", icon: "◆", color: "#002c76" },
  { label: "Create Exam", icon: "◇", color: "#2b71b9" },
  { label: "Map Curriculum", icon: "◈", color: "#69a338" },
  { label: "View Reports", icon: "▣", color: "#5d7203" },
];
