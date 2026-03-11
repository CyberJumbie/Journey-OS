export interface ExamQuestion {
  id: string;
  vignette: string | null;
  stem: string;
  options: { key: string; text: string }[];
  correctKey: string;
}

export const MOCK_QUESTIONS: ExamQuestion[] = [
  {
    id: 'q1',
    vignette:
      'A 58-year-old man with a history of myocardial infarction 3 months ago presents for a routine follow-up. His current medications include aspirin, atorvastatin, and lisinopril. His blood pressure is 145/92 mmHg and heart rate is 78 bpm.',
    stem: 'Which of the following medications should be added to this patient\u2019s regimen to improve long-term survival?',
    options: [
      { key: 'A', text: 'Metoprolol succinate' },
      { key: 'B', text: 'Amlodipine' },
      { key: 'C', text: 'Hydralazine' },
      { key: 'D', text: 'Verapamil' },
      { key: 'E', text: 'Furosemide' },
    ],
    correctKey: 'A',
  },
  {
    id: 'q2',
    vignette:
      'A 72-year-old woman on warfarin for chronic atrial fibrillation presents to the clinic. Her INR is 5.8. She denies any bleeding symptoms. Physical examination reveals no signs of active hemorrhage.',
    stem: 'What is the most appropriate next step in management?',
    options: [
      { key: 'A', text: 'Continue warfarin at the same dose' },
      { key: 'B', text: 'Hold warfarin and recheck INR in 1-2 days' },
      { key: 'C', text: 'Administer vitamin K 10 mg IV' },
      { key: 'D', text: 'Administer fresh frozen plasma' },
      { key: 'E', text: 'Hold warfarin and administer vitamin K 2.5 mg orally' },
    ],
    correctKey: 'E',
  },
  {
    id: 'q3',
    vignette: null,
    stem: 'A 45-year-old woman with type 2 diabetes is started on an ACE inhibitor for newly diagnosed hypertension. Which of the following laboratory tests should be monitored 1-2 weeks after initiation?',
    options: [
      { key: 'A', text: 'Complete blood count' },
      { key: 'B', text: 'Serum creatinine and potassium' },
      { key: 'C', text: 'Liver function tests' },
      { key: 'D', text: 'Hemoglobin A1c' },
      { key: 'E', text: 'Thyroid function tests' },
    ],
    correctKey: 'B',
  },
  {
    id: 'q4',
    vignette:
      'A 32-year-old woman reports progressive ptosis and diplopia that worsens throughout the day and improves with rest. She has no family history of neuromuscular disease.',
    stem: 'Which of the following antibodies is most likely to be positive in this patient?',
    options: [
      { key: 'A', text: 'Anti-voltage-gated calcium channel antibodies' },
      { key: 'B', text: 'Anti-acetylcholine receptor antibodies' },
      { key: 'C', text: 'Anti-Hu antibodies' },
      { key: 'D', text: 'Anti-GAD65 antibodies' },
      { key: 'E', text: 'Anti-amphiphysin antibodies' },
    ],
    correctKey: 'B',
  },
  {
    id: 'q5',
    vignette:
      'A 65-year-old man with chronic kidney disease (GFR 28 mL/min) and gout presents with an acute flare of his left first metatarsophalangeal joint. He is allergic to sulfa drugs.',
    stem: 'Which of the following is the most appropriate treatment for this patient\u2019s acute gout flare?',
    options: [
      { key: 'A', text: 'Indomethacin' },
      { key: 'B', text: 'Allopurinol' },
      { key: 'C', text: 'Colchicine low-dose' },
      { key: 'D', text: 'Probenecid' },
      { key: 'E', text: 'Febuxostat' },
    ],
    correctKey: 'C',
  },
  {
    id: 'q6',
    vignette: null,
    stem: 'A newborn is found to have ambiguous genitalia. Serum electrolytes show Na+ 128 mEq/L and K+ 6.8 mEq/L. Which of the following is the most likely diagnosis?',
    options: [
      { key: 'A', text: 'Turner syndrome' },
      { key: 'B', text: 'Congenital adrenal hyperplasia (21-hydroxylase deficiency)' },
      { key: 'C', text: 'Androgen insensitivity syndrome' },
      { key: 'D', text: '5-alpha reductase deficiency' },
      { key: 'E', text: 'Klinefelter syndrome' },
    ],
    correctKey: 'B',
  },
];
