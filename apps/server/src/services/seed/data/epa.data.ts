import type { EPAActivity } from "@journey-os/types";

export const EPA_ACTIVITIES: readonly EPAActivity[] = [
  {
    id: "epa-1",
    name: "Gather a history and perform a physical examination",
    title: "Gather a history and perform a physical examination",
    number: 1,
    framework: "epa",
  },
  {
    id: "epa-2",
    name: "Prioritize a differential diagnosis following a clinical encounter",
    title: "Prioritize a differential diagnosis following a clinical encounter",
    number: 2,
    framework: "epa",
  },
  {
    id: "epa-3",
    name: "Recommend and interpret common diagnostic and screening tests",
    title: "Recommend and interpret common diagnostic and screening tests",
    number: 3,
    framework: "epa",
  },
  {
    id: "epa-4",
    name: "Enter and discuss orders and prescriptions",
    title: "Enter and discuss orders and prescriptions",
    number: 4,
    framework: "epa",
  },
  {
    id: "epa-5",
    name: "Document a clinical encounter in the patient record",
    title: "Document a clinical encounter in the patient record",
    number: 5,
    framework: "epa",
  },
  {
    id: "epa-6",
    name: "Provide an oral presentation of a clinical encounter",
    title: "Provide an oral presentation of a clinical encounter",
    number: 6,
    framework: "epa",
  },
  {
    id: "epa-7",
    name: "Form clinical questions and retrieve evidence to advance patient care",
    title:
      "Form clinical questions and retrieve evidence to advance patient care",
    number: 7,
    framework: "epa",
  },
  {
    id: "epa-8",
    name: "Give or receive a patient handover to transition care responsibility",
    title:
      "Give or receive a patient handover to transition care responsibility",
    number: 8,
    framework: "epa",
  },
  {
    id: "epa-9",
    name: "Collaborate as a member of an interprofessional team",
    title: "Collaborate as a member of an interprofessional team",
    number: 9,
    framework: "epa",
  },
  {
    id: "epa-10",
    name: "Recognize a patient requiring urgent or emergent care and initiate evaluation and management",
    title:
      "Recognize a patient requiring urgent or emergent care and initiate evaluation and management",
    number: 10,
    framework: "epa",
  },
  {
    id: "epa-11",
    name: "Obtain informed consent for tests and/or procedures",
    title: "Obtain informed consent for tests and/or procedures",
    number: 11,
    framework: "epa",
  },
  {
    id: "epa-12",
    name: "Perform general procedures of a physician",
    title: "Perform general procedures of a physician",
    number: 12,
    framework: "epa",
  },
  {
    id: "epa-13",
    name: "Identify system failures and contribute to a culture of safety and improvement",
    title:
      "Identify system failures and contribute to a culture of safety and improvement",
    number: 13,
    framework: "epa",
  },
] as const;
