export const FIXTURES = {
  usmleSystem: {
    id: "usmle-sys-001",
    code: "SYS-CVS",
    name: "Cardiovascular System",
    description: "Heart and vascular system",
    framework: "usmle" as const,
  },

  usmleDiscipline: {
    id: "usmle-disc-001",
    code: "DISC-PATH",
    name: "Pathology",
    description: "Study of disease processes",
    framework: "usmle" as const,
  },

  usmleTask: {
    id: "usmle-task-001",
    code: "TASK-DX",
    name: "Diagnosis",
    description: "Establishing a diagnosis",
    framework: "usmle" as const,
  },

  usmleTopic: {
    id: "usmle-topic-001",
    code: "TOPIC-CVS-001",
    name: "Atherosclerosis",
    description: "Chronic inflammatory disease of arterial walls",
    framework: "usmle" as const,
    parent_system: "SYS-CVS",
  },

  lcmeStandard: {
    id: "lcme-std-001",
    number: "7",
    name: "Curricular Content",
    title: "Curricular Content",
    description:
      "The faculty of a medical school ensure that the medical curriculum...",
    framework: "lcme" as const,
  },

  lcmeElement: {
    id: "lcme-elem-001",
    number: "7.1",
    name: "Biomedical Sciences",
    title: "Biomedical Sciences",
    description:
      "The faculty ensure the curriculum includes content from biomedical sciences",
    framework: "lcme" as const,
  },

  acgmeDomain: {
    id: "acgme-dom-001",
    code: "MK",
    name: "Medical Knowledge",
    description:
      "Residents must demonstrate knowledge of established and evolving biomedical...",
    framework: "acgme" as const,
  },

  acgmeSubdomain: {
    id: "acgme-sub-001",
    code: "MK-1",
    name: "Clinical Sciences",
    description: "Application of clinical sciences to patient care",
    framework: "acgme" as const,
    parent_domain: "MK",
  },

  aamcDomain: {
    id: "aamc-dom-001",
    code: "KP",
    name: "Knowledge for Practice",
    description:
      "Demonstrate knowledge of established and evolving biomedical sciences...",
    framework: "aamc" as const,
  },

  aamcCompetency: {
    id: "aamc-comp-001",
    code: "KP-1",
    name: "Apply established and emerging bio-scientific principles",
    description:
      "Apply knowledge of molecular, cellular, biochemical mechanisms...",
    framework: "aamc" as const,
    parent_domain: "KP",
  },

  umeCompetency: {
    id: "ume-comp-001",
    code: "UME-MK",
    name: "Medical Knowledge",
    description:
      "Demonstrate knowledge of established and evolving biomedical sciences",
    framework: "ume" as const,
  },

  umeSubcompetency: {
    id: "ume-sub-001",
    code: "UME-MK-1",
    name: "Apply Foundational Sciences",
    description: "Apply foundational science knowledge to clinical scenarios",
    framework: "ume" as const,
    do_specific: true,
  },

  epa: {
    id: "epa-001",
    number: 1,
    name: "Gather a History and Perform a Physical Examination",
    title: "Gather a History and Perform a Physical Examination",
    description:
      "Gather an accurate and prioritized history and perform a physical exam...",
    framework: "epa" as const,
  },

  bloomLevel: {
    id: "bloom-001",
    level: 1 as const,
    name: "Remember",
    description: "Retrieve relevant knowledge from long-term memory",
    framework: "bloom" as const,
    action_verbs: ["define", "list", "recall", "recognize", "identify", "name"],
  },

  millerLevel: {
    id: "miller-001",
    level: 1 as const,
    name: "Knows",
    description: "Factual recall of knowledge",
    framework: "miller" as const,
  },
} as const;
