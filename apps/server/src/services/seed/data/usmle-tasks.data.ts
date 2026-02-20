import type { USMLETask } from "@journey-os/types";

interface USMLETaskSeed extends USMLETask {
  readonly sort_order: number;
}

export const USMLE_TASKS: readonly USMLETaskSeed[] = [
  {
    id: "usmle-task-01",
    code: "usmle-task-01",
    name: "Diagnosis",
    description: "Diagnosis",
    framework: "usmle",
    level: 1,
    sort_order: 1,
  },
  {
    id: "usmle-task-02",
    code: "usmle-task-02",
    name: "Management / Treatment",
    description: "Management / Treatment",
    framework: "usmle",
    level: 1,
    sort_order: 2,
  },
  {
    id: "usmle-task-03",
    code: "usmle-task-03",
    name: "Health Maintenance / Disease Prevention",
    description: "Health Maintenance / Disease Prevention",
    framework: "usmle",
    level: 1,
    sort_order: 3,
  },
  {
    id: "usmle-task-04",
    code: "usmle-task-04",
    name: "Mechanisms of Disease / Basic Science Concepts",
    description: "Mechanisms of Disease / Basic Science Concepts",
    framework: "usmle",
    level: 1,
    sort_order: 4,
  },
] as const;
