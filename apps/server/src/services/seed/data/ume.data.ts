import type { UMECompetency, UMESubcompetency } from "@journey-os/types";

interface UMECompetencySeed extends UMECompetency {
  readonly aligns_with: string;
}

interface UMESubcompetencySeed extends UMESubcompetency {
  readonly parent_code: string;
}

/**
 * AAMC UME Competencies (6 nodes).
 * Source: .context/source/05-reference/seed/Ume.json
 * Neo4j label: UME_Competency
 */
export const UME_COMPETENCIES: readonly UMECompetencySeed[] = [
  {
    id: "ume-comp-1",
    code: "ume-comp-1",
    name: "Professionalism",
    description:
      "Demonstrates integrity, respect, and ethical reasoning, and promotes inclusion of differences in all interactions to improve health care for patients, communities, and populations.",
    framework: "ume" as const,
    aligns_with: "acgme-dom-5",
  },
  {
    id: "ume-comp-2",
    code: "ume-comp-2",
    name: "Patient Care and Procedural Skills",
    description:
      "Demonstrates compassionate, effective, holistic, evidence-informed, equitable, and patient-centered care.",
    framework: "ume" as const,
    aligns_with: "acgme-dom-1",
  },
  {
    id: "ume-comp-3",
    code: "ume-comp-3",
    name: "Medical Knowledge",
    description:
      "Applies and integrates foundational knowledge to improve health care for patients and populations.",
    framework: "ume" as const,
    aligns_with: "acgme-dom-2",
  },
  {
    id: "ume-comp-4",
    code: "ume-comp-4",
    name: "Practice-Based Learning and Improvement",
    description:
      "Integrates feedback, evidence, and reflection to adapt behavior, foster improvement, and cultivate lifelong learning.",
    framework: "ume" as const,
    aligns_with: "acgme-dom-3",
  },
  {
    id: "ume-comp-5",
    code: "ume-comp-5",
    name: "Interpersonal and Communication Skills",
    description:
      "Effectively communicates and interacts with patients, caregivers, and the health care team to contribute to high-quality, patient-centered care.",
    framework: "ume" as const,
    aligns_with: "acgme-dom-4",
  },
  {
    id: "ume-comp-6",
    code: "ume-comp-6",
    name: "Systems-Based Practice",
    description:
      "Applies knowledge of the larger context of health, including its social and structural determinants, and of systems and resources within and outside of health care, to optimize high-quality care for patients, communities, and populations.",
    framework: "ume" as const,
    aligns_with: "acgme-dom-6",
  },
];

/**
 * AAMC UME Subcompetencies (49 nodes).
 * Source: .context/source/05-reference/seed/Ume.json
 * Neo4j label: UME_Subcompetency
 */
export const UME_SUBCOMPETENCIES: readonly UMESubcompetencySeed[] = [
  // ── Competency 1: Professionalism (11 subcompetencies) ──
  {
    id: "ume-sub-1.1",
    code: "ume-sub-1.1",
    name: "Demonstrates respect and compassion for patients, caregivers, families, and team members.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.2",
    code: "ume-sub-1.2",
    name: "Safeguards patient privacy, confidentiality, and autonomy.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.3",
    code: "ume-sub-1.3",
    name: "Uses ethical principles and reasoning to guide behavior.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.4",
    code: "ume-sub-1.4",
    name: "Adapts actions and communication according to the situation.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.5",
    code: "ume-sub-1.5",
    name: "Takes ownership of mistakes and acts to address them.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.6",
    code: "ume-sub-1.6",
    name: "Identifies personal limits of knowledge and skills and seeks help appropriately.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.7",
    code: "ume-sub-1.7",
    name: "Identifies biases and strategies to mitigate their effects.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.8",
    code: "ume-sub-1.8",
    name: "Demonstrates humility and a willingness to learn from others with different backgrounds and experiences.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.9",
    code: "ume-sub-1.9",
    name: "Recognizes and addresses personal well-being needs that may impact professional performance.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.10",
    code: "ume-sub-1.10",
    name: "Completes duties and tasks in a thorough, reliable, and timely manner.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
  },
  {
    id: "ume-sub-1.11",
    code: "ume-sub-1.11",
    name: "Demonstrates the philosophy of osteopathic medicine by promoting its four tenets.",
    framework: "ume" as const,
    parent_code: "ume-comp-1",
    do_specific: true,
  },

  // ── Competency 2: Patient Care and Procedural Skills (13 subcompetencies) ──
  {
    id: "ume-sub-2.1",
    code: "ume-sub-2.1",
    name: "Integrates patient and caregiver context, needs, values, preferences, and experiences into patient care.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.2",
    code: "ume-sub-2.2",
    name: "Gathers relevant patient histories from multiple data sources, as necessary.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.3",
    code: "ume-sub-2.3",
    name: "Performs relevant physical examinations using appropriate techniques and tools.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.4",
    code: "ume-sub-2.4",
    name: "Identifies patients in need of urgent or emergent care, seeks assistance, and recommends initial evaluation and management.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.5",
    code: "ume-sub-2.5",
    name: "Creates and prioritizes differential diagnoses.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.6",
    code: "ume-sub-2.6",
    name: "Proposes hypothesis-driven diagnostic testing and interprets results.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.7",
    code: "ume-sub-2.7",
    name: "Formulates therapeutic management plans for commonly encountered clinical conditions.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.8",
    code: "ume-sub-2.8",
    name: "Uses patient-centered language to describe common diagnostic and therapeutic interventions and plans.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.9",
    code: "ume-sub-2.9",
    name: "Demonstrates basic procedural techniques.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.10",
    code: "ume-sub-2.10",
    name: "Incorporates health promotion and disease prevention into patient care plans.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.11",
    code: "ume-sub-2.11",
    name: "Identifies individual and structural factors that impact health and wellness.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
  },
  {
    id: "ume-sub-2.12",
    code: "ume-sub-2.12",
    name: "Incorporates osteopathic principles, practices, and tenets into patient care.",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
    do_specific: true,
  },
  {
    id: "ume-sub-2.13",
    code: "ume-sub-2.13",
    name: "Performs an osteopathic, structural examination and treats altered function of the body framework system or somatic dysfunction with osteopathic manipulative treatment (OMT).",
    framework: "ume" as const,
    parent_code: "ume-comp-2",
    do_specific: true,
  },

  // ── Competency 3: Medical Knowledge (6 subcompetencies) ──
  {
    id: "ume-sub-3.1",
    code: "ume-sub-3.1",
    name: "Demonstrates knowledge of basic, clinical, pathophysiologic, social, and health systems sciences, as well as humanities, needed for clinical practice.",
    framework: "ume" as const,
    parent_code: "ume-comp-3",
  },
  {
    id: "ume-sub-3.2",
    code: "ume-sub-3.2",
    name: "Applies foundational knowledge for clinical problem-solving, diagnostic reasoning, and decision-making to clinical scenarios.",
    framework: "ume" as const,
    parent_code: "ume-comp-3",
  },
  {
    id: "ume-sub-3.3",
    code: "ume-sub-3.3",
    name: "Discerns the accuracy of information and relevance to clinical problems.",
    framework: "ume" as const,
    parent_code: "ume-comp-3",
  },
  {
    id: "ume-sub-3.4",
    code: "ume-sub-3.4",
    name: "Demonstrates knowledge of research design, interpretation, and application to clinical questions.",
    framework: "ume" as const,
    parent_code: "ume-comp-3",
  },
  {
    id: "ume-sub-3.5",
    code: "ume-sub-3.5",
    name: "Accesses knowledge relevant to clinical problems using appropriate resources, including emerging technologies.",
    framework: "ume" as const,
    parent_code: "ume-comp-3",
  },
  {
    id: "ume-sub-3.6",
    code: "ume-sub-3.6",
    name: "Demonstrates knowledge of how to integrate osteopathic principles, practices, and tenets into patient care.",
    framework: "ume" as const,
    parent_code: "ume-comp-3",
    do_specific: true,
  },

  // ── Competency 4: Practice-Based Learning and Improvement (5 subcompetencies) ──
  {
    id: "ume-sub-4.1",
    code: "ume-sub-4.1",
    name: "Actively seeks and incorporates feedback and assessment data to improve performance.",
    framework: "ume" as const,
    parent_code: "ume-comp-4",
  },
  {
    id: "ume-sub-4.2",
    code: "ume-sub-4.2",
    name: "Identifies opportunities for growth in one's own performance through informed self-assessment and reflective practice.",
    framework: "ume" as const,
    parent_code: "ume-comp-4",
  },
  {
    id: "ume-sub-4.3",
    code: "ume-sub-4.3",
    name: "Develops, implements, and reassesses learning and improvement goals.",
    framework: "ume" as const,
    parent_code: "ume-comp-4",
  },
  {
    id: "ume-sub-4.4",
    code: "ume-sub-4.4",
    name: "Locates, critically appraises, and synthesizes information to support evidence-informed, patient-centered clinical decisions.",
    framework: "ume" as const,
    parent_code: "ume-comp-4",
  },
  {
    id: "ume-sub-4.5",
    code: "ume-sub-4.5",
    name: "Demonstrates inquiry and ability to grow and seek new knowledge.",
    framework: "ume" as const,
    parent_code: "ume-comp-4",
  },

  // ── Competency 5: Interpersonal and Communication Skills (6 subcompetencies) ──
  {
    id: "ume-sub-5.1",
    code: "ume-sub-5.1",
    name: "Collaborates with patients, caregivers, and team members to enhance the therapeutic relationship.",
    framework: "ume" as const,
    parent_code: "ume-comp-5",
  },
  {
    id: "ume-sub-5.2",
    code: "ume-sub-5.2",
    name: "Collaborates with health care and administrative team members to enhance team and organizational function.",
    framework: "ume" as const,
    parent_code: "ume-comp-5",
  },
  {
    id: "ume-sub-5.3",
    code: "ume-sub-5.3",
    name: "Demonstrates active listening.",
    framework: "ume" as const,
    parent_code: "ume-comp-5",
  },
  {
    id: "ume-sub-5.4",
    code: "ume-sub-5.4",
    name: "Communicates clearly, accurately, and compassionately in verbal, nonverbal, written, and electronic formats.",
    framework: "ume" as const,
    parent_code: "ume-comp-5",
  },
  {
    id: "ume-sub-5.5",
    code: "ume-sub-5.5",
    name: "Demonstrates skills in educating patients, caregivers, peers, and team members.",
    framework: "ume" as const,
    parent_code: "ume-comp-5",
  },
  {
    id: "ume-sub-5.6",
    code: "ume-sub-5.6",
    name: "Formulates and shares feedback constructively with others.",
    framework: "ume" as const,
    parent_code: "ume-comp-5",
  },

  // ── Competency 6: Systems-Based Practice (8 subcompetencies) ──
  {
    id: "ume-sub-6.1",
    code: "ume-sub-6.1",
    name: "Applies knowledge of social and structural drivers of health.",
    framework: "ume" as const,
    parent_code: "ume-comp-6",
  },
  {
    id: "ume-sub-6.2",
    code: "ume-sub-6.2",
    name: "Recognizes mechanisms to reduce disparities in patient care and health care systems.",
    framework: "ume" as const,
    parent_code: "ume-comp-6",
  },
  {
    id: "ume-sub-6.3",
    code: "ume-sub-6.3",
    name: "Adapts performance to various health care teams, delivery settings, and systems.",
    framework: "ume" as const,
    parent_code: "ume-comp-6",
  },
  {
    id: "ume-sub-6.4",
    code: "ume-sub-6.4",
    name: "Collaborates in transitions and coordination of patient care.",
    framework: "ume" as const,
    parent_code: "ume-comp-6",
  },
  {
    id: "ume-sub-6.5",
    code: "ume-sub-6.5",
    name: "Evaluates the risks and benefits of using current and emerging technologies in patient care.",
    framework: "ume" as const,
    parent_code: "ume-comp-6",
  },
  {
    id: "ume-sub-6.6",
    code: "ume-sub-6.6",
    name: "Identifies patient safety concerns, systems issues, and opportunities for quality improvement.",
    framework: "ume" as const,
    parent_code: "ume-comp-6",
  },
  {
    id: "ume-sub-6.7",
    code: "ume-sub-6.7",
    name: "Describes health policy and the financial context of health care.",
    framework: "ume" as const,
    parent_code: "ume-comp-6",
  },
  {
    id: "ume-sub-6.8",
    code: "ume-sub-6.8",
    name: "Applies knowledge of local population and community health needs, disparities, and resources.",
    framework: "ume" as const,
    parent_code: "ume-comp-6",
  },
];
