import type { AAMCDomain } from "@journey-os/types";

interface AAMCDomainSeed extends AAMCDomain {
  readonly sort_order: number;
}

export const AAMC_DOMAINS: readonly AAMCDomainSeed[] = [
  {
    id: "aamc-1",
    code: "aamc-1",
    name: "Knowledge for Practice",
    description:
      "Demonstrate knowledge of established and evolving biomedical, clinical, epidemiological, and social-behavioral sciences",
    framework: "aamc",
    sort_order: 1,
  },
  {
    id: "aamc-2",
    code: "aamc-2",
    name: "Patient Care",
    description:
      "Provide patient-centered care that is compassionate, appropriate, and effective",
    framework: "aamc",
    sort_order: 2,
  },
  {
    id: "aamc-3",
    code: "aamc-3",
    name: "Practice-Based Learning and Improvement",
    description:
      "Demonstrate the ability to investigate and evaluate patient care practices",
    framework: "aamc",
    sort_order: 3,
  },
  {
    id: "aamc-4",
    code: "aamc-4",
    name: "Interpersonal and Communication Skills",
    description:
      "Demonstrate interpersonal and communication skills that result in effective exchange of information",
    framework: "aamc",
    sort_order: 4,
  },
  {
    id: "aamc-5",
    code: "aamc-5",
    name: "Professionalism",
    description:
      "Demonstrate a commitment to carrying out professional responsibilities and adherence to ethical principles",
    framework: "aamc",
    sort_order: 5,
  },
  {
    id: "aamc-6",
    code: "aamc-6",
    name: "Systems-Based Practice",
    description:
      "Demonstrate awareness of and responsiveness to the larger context and system of health care",
    framework: "aamc",
    sort_order: 6,
  },
  {
    id: "aamc-7",
    code: "aamc-7",
    name: "Interprofessional Collaboration",
    description:
      "Demonstrate the ability to engage in an interprofessional team in a manner that optimizes safe, effective patient care",
    framework: "aamc",
    sort_order: 7,
  },
  {
    id: "aamc-8",
    code: "aamc-8",
    name: "Personal and Professional Development",
    description:
      "Demonstrate qualities required to sustain lifelong personal and professional growth",
    framework: "aamc",
    sort_order: 8,
  },
] as const;
