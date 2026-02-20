import type { USMLEDiscipline } from "@journey-os/types";

interface USMLEDisciplineSeed extends USMLEDiscipline {
  readonly sort_order: number;
}

export const USMLE_DISCIPLINES: readonly USMLEDisciplineSeed[] = [
  {
    id: "usmle-disc-01",
    code: "usmle-disc-01",
    name: "Anatomy",
    description: "Anatomy",
    framework: "usmle",
    level: 1,
    sort_order: 1,
  },
  {
    id: "usmle-disc-02",
    code: "usmle-disc-02",
    name: "Biochemistry & Nutrition",
    description: "Biochemistry & Nutrition",
    framework: "usmle",
    level: 1,
    sort_order: 2,
  },
  {
    id: "usmle-disc-03",
    code: "usmle-disc-03",
    name: "Microbiology",
    description: "Microbiology",
    framework: "usmle",
    level: 1,
    sort_order: 3,
  },
  {
    id: "usmle-disc-04",
    code: "usmle-disc-04",
    name: "Pathology",
    description: "Pathology",
    framework: "usmle",
    level: 1,
    sort_order: 4,
  },
  {
    id: "usmle-disc-05",
    code: "usmle-disc-05",
    name: "Pharmacology",
    description: "Pharmacology",
    framework: "usmle",
    level: 1,
    sort_order: 5,
  },
  {
    id: "usmle-disc-06",
    code: "usmle-disc-06",
    name: "Physiology",
    description: "Physiology",
    framework: "usmle",
    level: 1,
    sort_order: 6,
  },
  {
    id: "usmle-disc-07",
    code: "usmle-disc-07",
    name: "Behavioral Science",
    description: "Behavioral Science",
    framework: "usmle",
    level: 1,
    sort_order: 7,
  },
] as const;
