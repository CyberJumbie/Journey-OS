import type { HelpSection } from "@journey-os/types";

/**
 * Help section cards displayed on the main help page.
 * One card per FAQ category with a short overview paragraph.
 */
export const HELP_SECTIONS: readonly HelpSection[] = [
  {
    id: "help-getting-started",
    title: "Getting Started",
    description: "Set up your account, courses, and dashboard",
    icon: "\u25C8",
    category: "getting-started",
    content:
      "Learn how to create your first course, upload a syllabus, navigate the dashboard, and customize your workspace. Journey OS guides you through setup with an intuitive wizard so you can start generating content in minutes.",
    sortOrder: 1,
  },
  {
    id: "help-generation",
    title: "Generation",
    description: "AI-powered question generation pipeline",
    icon: "\u2726",
    category: "generation",
    content:
      "Discover how the AI generation pipeline works, from selecting learning objectives to receiving polished exam questions. Control difficulty, question type, and Bloom's taxonomy level through the Generation Workbench.",
    sortOrder: 2,
  },
  {
    id: "help-review",
    title: "Review",
    description: "Review, approve, and edit generated questions",
    icon: "\u25C7",
    category: "review",
    content:
      "Understand the review workflow, auto-approve thresholds, and how the Toulmin argument framework supports clinical accuracy verification. Learn to efficiently manage your review queue.",
    sortOrder: 3,
  },
  {
    id: "help-templates",
    title: "Templates",
    description: "Create and manage question templates",
    icon: "\u25C6",
    category: "templates",
    content:
      "Create reusable question templates that define type, difficulty, Bloom's level, and USMLE mappings. Share templates with colleagues across your institution or the broader Journey OS community.",
    sortOrder: 4,
  },
  {
    id: "help-item-bank",
    title: "Item Bank",
    description: "Search, tag, and export assessment items",
    icon: "\u25A3",
    category: "item-bank",
    content:
      "Search your item bank with full-text and semantic search, filter by USMLE content areas, and export questions in QTI, CSV, or PDF formats for LMS integration or printable exams.",
    sortOrder: 5,
  },
  {
    id: "help-analytics",
    title: "Analytics",
    description: "Coverage heatmaps, quality KPIs, and mastery data",
    icon: "\u25A2",
    category: "analytics",
    content:
      "Explore USMLE coverage heatmaps, track average item quality, monitor coverage score percentages, and interpret cohort mastery data to identify content gaps and improve assessment quality.",
    sortOrder: 6,
  },
] as const;
