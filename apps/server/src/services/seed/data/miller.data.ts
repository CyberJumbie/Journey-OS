import type { MillerLevelNode } from "@journey-os/types";

interface MillerLevelSeed extends MillerLevelNode {
  readonly assessment_methods: readonly string[];
}

export const MILLER_LEVELS: readonly MillerLevelSeed[] = [
  {
    id: "miller-1",
    name: "Knows",
    level: 1,
    description: "Factual recall of knowledge",
    framework: "miller",
    assessment_methods: ["MCQ", "short answer", "oral exam"],
  },
  {
    id: "miller-2",
    name: "Knows How",
    level: 2,
    description: "Ability to apply knowledge to clinical problems",
    framework: "miller",
    assessment_methods: ["clinical vignette MCQ", "essay", "case analysis"],
  },
  {
    id: "miller-3",
    name: "Shows How",
    level: 3,
    description: "Competence demonstrated in simulated settings",
    framework: "miller",
    assessment_methods: ["OSCE", "standardized patient", "simulation"],
  },
  {
    id: "miller-4",
    name: "Does",
    level: 4,
    description: "Performance in real clinical practice",
    framework: "miller",
    assessment_methods: [
      "workplace-based assessment",
      "portfolio",
      "direct observation",
    ],
  },
] as const;
