import type { BloomLevelNode } from "@journey-os/types";

export const BLOOM_LEVELS: readonly BloomLevelNode[] = [
  {
    id: "bloom-1",
    name: "Remember",
    level: 1,
    description: "Retrieve relevant knowledge from long-term memory",
    framework: "bloom",
    action_verbs: ["define", "list", "recall", "identify", "name", "recognize"],
  },
  {
    id: "bloom-2",
    name: "Understand",
    level: 2,
    description: "Construct meaning from instructional messages",
    framework: "bloom",
    action_verbs: [
      "explain",
      "describe",
      "interpret",
      "summarize",
      "classify",
      "compare",
    ],
  },
  {
    id: "bloom-3",
    name: "Apply",
    level: 3,
    description: "Carry out or use a procedure in a given situation",
    framework: "bloom",
    action_verbs: [
      "execute",
      "implement",
      "solve",
      "demonstrate",
      "use",
      "calculate",
    ],
  },
  {
    id: "bloom-4",
    name: "Analyze",
    level: 4,
    description:
      "Break material into constituent parts and detect relationships",
    framework: "bloom",
    action_verbs: [
      "differentiate",
      "organize",
      "attribute",
      "distinguish",
      "examine",
      "correlate",
    ],
  },
  {
    id: "bloom-5",
    name: "Evaluate",
    level: 5,
    description: "Make judgments based on criteria and standards",
    framework: "bloom",
    action_verbs: [
      "check",
      "critique",
      "judge",
      "justify",
      "appraise",
      "defend",
    ],
  },
  {
    id: "bloom-6",
    name: "Create",
    level: 6,
    description:
      "Put elements together to form a novel, coherent whole or make an original product",
    framework: "bloom",
    action_verbs: [
      "generate",
      "plan",
      "produce",
      "design",
      "construct",
      "formulate",
    ],
  },
] as const;
