-- Demo Seed Data Migration
-- Story: DEMO-001
-- Seeds Morehouse School of Medicine institution, courses, demo users, and assessment items.
-- All INSERTs use ON CONFLICT DO NOTHING for idempotency.
-- Uses deterministic UUIDs so re-running is safe.

-- ============================================================================
-- DETERMINISTIC UUIDs (hardcoded for idempotency)
-- ============================================================================
-- Institution
-- msm_institution_id: 'a0000000-0000-4000-8000-000000000001'

-- Courses
-- msm_medi_530:  'c0000000-0000-4000-8000-000000000530'
-- msm_medi_531:  'c0000000-0000-4000-8000-000000000531'
-- msm_medi_532:  'c0000000-0000-4000-8000-000000000532'
-- msm_medi_533:  'c0000000-0000-4000-8000-000000000533'
-- msm_medi_509:  'c0000000-0000-4000-8000-000000000509'
-- msm_medi_511:  'c0000000-0000-4000-8000-000000000511'
-- msm_medi_603:  'c0000000-0000-4000-8000-000000000603' (Pharmacology - PHAR 501 equivalent)
-- msm_anat_502:  'c0000000-0000-4000-8000-000000000502'
-- msm_path_503:  'c0000000-0000-4000-8000-000000000503'
-- msm_medi_600:  'c0000000-0000-4000-8000-000000000600'
-- msm_medi_606:  'c0000000-0000-4000-8000-000000000606'

-- Demo Users
-- sarah_johnson:   'd0000000-0000-4000-8000-000000000001'
-- john_mitchell:   'd0000000-0000-4000-8000-000000000002'
-- michael_chen:    'd0000000-0000-4000-8000-000000000003'
-- emily_rodriguez: 'd0000000-0000-4000-8000-000000000004'
-- james_wilson:    'd0000000-0000-4000-8000-000000000005'

-- ============================================================================
-- 1. INSTITUTION
-- ============================================================================
INSERT INTO institutions (id, name, slug)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'Morehouse School of Medicine',
  'msm'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. COURSES
-- ============================================================================
INSERT INTO courses (id, institution_id, code, title, description, academic_year, phase) VALUES
  ('c0000000-0000-4000-8000-000000000530', 'a0000000-0000-4000-8000-000000000001', 'MEDI 530', 'Basic Principles', 'Integrated course covering anatomy, biochemistry, cell biology, genetics, embryology, and physiology as foundational sciences.', 'M1', 'Basic Principles'),
  ('c0000000-0000-4000-8000-000000000531', 'a0000000-0000-4000-8000-000000000001', 'MEDI 531', 'Organ Systems 1', 'Integrated systems-based course covering cardiovascular, respiratory, and renal systems.', 'M1', 'Organ Systems 1'),
  ('c0000000-0000-4000-8000-000000000532', 'a0000000-0000-4000-8000-000000000001', 'MEDI 532', 'Organ Systems 2', 'Integrated systems-based course covering gastrointestinal, endocrine, and reproductive systems.', 'M1', 'Organ Systems 2'),
  ('c0000000-0000-4000-8000-000000000533', 'a0000000-0000-4000-8000-000000000001', 'MEDI 533', 'Organ Systems 3', 'Integrated systems-based course covering musculoskeletal, nervous system, and special senses.', 'M1', 'Organ Systems 3'),
  ('c0000000-0000-4000-8000-000000000509', 'a0000000-0000-4000-8000-000000000001', 'MEDI 509', 'Community Health', 'Longitudinal course addressing community health, population health, health disparities, and social determinants of health.', 'M1', 'Longitudinal'),
  ('c0000000-0000-4000-8000-000000000511', 'a0000000-0000-4000-8000-000000000001', 'MEDI 511', 'Fundamentals of Medicine 1', 'Longitudinal course introducing clinical skills, history taking, physical examination, and communication.', 'M1', 'Longitudinal'),
  ('c0000000-0000-4000-8000-000000000603', 'a0000000-0000-4000-8000-000000000001', 'PHAR 501', 'Pharmacology I', 'Drug mechanisms, pharmacokinetics, pharmacodynamics, therapeutics, and toxicology.', 'M2', 'M2 Discipline-Based'),
  ('c0000000-0000-4000-8000-000000000502', 'a0000000-0000-4000-8000-000000000001', 'ANAT 502', 'Human Anatomy', 'Comprehensive study of gross anatomy with cadaver dissection and clinical correlations.', 'M1', 'Basic Principles'),
  ('c0000000-0000-4000-8000-000000000503', 'a0000000-0000-4000-8000-000000000001', 'PATH 503', 'General Pathology', 'Introduction to disease mechanisms, cellular adaptations, inflammation, and neoplasia.', 'M2', 'M2 Discipline-Based'),
  ('c0000000-0000-4000-8000-000000000600', 'a0000000-0000-4000-8000-000000000001', 'MEDI 600', 'Pathophysiology', 'Disease mechanisms and clinical correlations integrating basic science with clinical pathology.', 'M2', 'M2 Discipline-Based'),
  ('c0000000-0000-4000-8000-000000000606', 'a0000000-0000-4000-8000-000000000001', 'MEDI 606', 'Pathology', 'General and systemic pathology covering disease processes across all organ systems.', 'M2', 'M2 Discipline-Based')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. DEMO AUTH USERS (minimal rows to satisfy FK on user_profiles)
-- ============================================================================
-- Supabase auth.users requires: id, instance_id (default '00000000-0000-0000-0000-000000000000'),
-- aud, role, created_at, updated_at. We insert minimal rows.
-- These demo users cannot log in (no encrypted_password set).

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES
  ('d0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sarah.johnson@msm.edu', '', NOW(), NOW(), NOW()),
  ('d0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'john.mitchell@msm.edu', '', NOW(), NOW(), NOW()),
  ('d0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'michael.chen@msm.edu', '', NOW(), NOW(), NOW()),
  ('d0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'emily.rodriguez@msm.edu', '', NOW(), NOW(), NOW()),
  ('d0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'james.wilson@msm.edu', '', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. DEMO USER PROFILES
-- ============================================================================
INSERT INTO user_profiles (id, institution_id, role, display_name, email, is_course_director, onboarding_completed, onboarding_step) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'faculty', 'Dr. Sarah Johnson', 'sarah.johnson@msm.edu', true, true, 99),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'student', 'John Mitchell', 'john.mitchell@msm.edu', false, true, 99),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'faculty', 'Dr. Michael Chen', 'michael.chen@msm.edu', true, true, 99),
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'student', 'Emily Rodriguez', 'emily.rodriguez@msm.edu', false, true, 99),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'institutional_admin', 'Dr. James Wilson', 'james.wilson@msm.edu', false, true, 99)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. SAMPLE ASSESSMENT ITEMS (20 items across courses)
-- ============================================================================
-- Items created_by Dr. Sarah Johnson (pharmacology) and Dr. Michael Chen (anatomy)

-- Item UUIDs: 'e0000000-0000-4000-8000-0000000000XX' where XX = 01-20

-- --- PHAR 501 items (Dr. Sarah Johnson) ---
INSERT INTO assessment_items (id, institution_id, course_id, created_by, vignette, stem, explanation, bloom_level, usmle_system, usmle_discipline, difficulty_estimate, status) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000603', 'd0000000-0000-4000-8000-000000000001',
   'A 45-year-old man with newly diagnosed hypertension is started on a medication. After 2 weeks, he presents with a persistent dry cough.',
   'Which of the following medications was most likely prescribed?',
   'ACE inhibitors such as lisinopril cause dry cough due to accumulation of bradykinin in the lungs. This is a well-known class effect.',
   3, 'Cardiovascular', 'Pharmacology', 0.65, 'approved'),

  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000603', 'd0000000-0000-4000-8000-000000000001',
   'A 62-year-old woman with atrial fibrillation is on warfarin therapy. She begins taking a new antibiotic and her INR increases to 5.2.',
   'Which of the following antibiotics most likely caused this interaction?',
   'Metronidazole inhibits CYP2C9, the main enzyme responsible for warfarin metabolism, leading to increased warfarin levels and elevated INR.',
   4, 'Cardiovascular', 'Pharmacology', 0.72, 'approved'),

  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000603', 'd0000000-0000-4000-8000-000000000001',
   'A 30-year-old woman with epilepsy is planning a pregnancy. She is currently taking valproic acid.',
   'What is the most appropriate change to her antiepileptic regimen?',
   'Valproic acid is teratogenic (category D) and is associated with neural tube defects. Lamotrigine or levetiracetam are safer alternatives during pregnancy.',
   3, 'Nervous System & Special Senses', 'Pharmacology', 0.58, 'approved'),

  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000603', 'd0000000-0000-4000-8000-000000000001',
   'A 55-year-old man with type 2 diabetes is started on metformin. He asks about the mechanism of action.',
   'Which of the following best describes the primary mechanism of action of metformin?',
   'Metformin primarily works by activating AMP-activated protein kinase (AMPK), which decreases hepatic glucose production and increases insulin sensitivity in peripheral tissues.',
   2, 'Endocrine', 'Pharmacology', 0.45, 'draft'),

  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000603', 'd0000000-0000-4000-8000-000000000001',
   'A 70-year-old man with chronic kidney disease (GFR 25 mL/min) requires pain management for osteoarthritis.',
   'Which of the following analgesics should be avoided in this patient?',
   'NSAIDs should be avoided in patients with CKD as they can further reduce renal blood flow by inhibiting prostaglandin synthesis, worsening kidney function.',
   3, 'Renal & Urinary', 'Pharmacology', 0.52, 'pending_review'),

  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000603', 'd0000000-0000-4000-8000-000000000001',
   'A 28-year-old woman presents with symptoms of depression. She is started on fluoxetine.',
   'Which of the following best describes the mechanism of action of fluoxetine?',
   'Fluoxetine is a selective serotonin reuptake inhibitor (SSRI) that blocks the serotonin transporter (SERT), increasing serotonin availability in the synaptic cleft.',
   2, 'Nervous System & Special Senses', 'Pharmacology', 0.40, 'draft')
ON CONFLICT (id) DO NOTHING;

-- --- MEDI 531 items (Dr. Michael Chen) ---
INSERT INTO assessment_items (id, institution_id, course_id, created_by, vignette, stem, explanation, bloom_level, usmle_system, usmle_discipline, difficulty_estimate, status) VALUES
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000531', 'd0000000-0000-4000-8000-000000000003',
   'A 58-year-old man presents with sudden onset chest pain radiating to the left arm. ECG shows ST-segment elevation in leads II, III, and aVF.',
   'Which coronary artery is most likely occluded?',
   'ST elevation in leads II, III, and aVF indicates an inferior STEMI, most commonly caused by occlusion of the right coronary artery (RCA).',
   3, 'Cardiovascular', 'Anatomy', 0.55, 'approved'),

  ('e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000531', 'd0000000-0000-4000-8000-000000000003',
   'A 65-year-old woman with COPD presents with increased dyspnea. Pulmonary function tests show FEV1/FVC ratio of 0.55.',
   'Which of the following best explains the pathophysiology of her decreased FEV1/FVC ratio?',
   'In COPD, destruction of alveolar walls leads to decreased elastic recoil and airway collapse during expiration, resulting in air trapping and a reduced FEV1/FVC ratio.',
   4, 'Respiratory', 'Pathology', 0.68, 'approved'),

  ('e0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000531', 'd0000000-0000-4000-8000-000000000003',
   'A 50-year-old man with a history of heavy alcohol use presents with ascites and jaundice. Lab results show elevated portal pressures.',
   'Which of the following is the primary mechanism of ascites formation in this patient?',
   'In cirrhosis, increased portal pressure combined with decreased albumin production leads to fluid transudation into the peritoneal cavity.',
   3, 'Gastrointestinal', 'Pathology', 0.60, 'pending_review'),

  ('e0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000531', 'd0000000-0000-4000-8000-000000000003',
   'A 40-year-old woman presents with fatigue, weight gain, and cold intolerance. TSH is elevated and free T4 is low.',
   'Which of the following is the most likely diagnosis?',
   'Elevated TSH with low free T4 indicates primary hypothyroidism. In the US, the most common cause is Hashimoto thyroiditis (chronic autoimmune thyroiditis).',
   2, 'Endocrine', 'Physiology', 0.38, 'draft')
ON CONFLICT (id) DO NOTHING;

-- --- MEDI 530 items (Dr. Michael Chen) ---
INSERT INTO assessment_items (id, institution_id, course_id, created_by, vignette, stem, explanation, bloom_level, usmle_system, usmle_discipline, difficulty_estimate, status) VALUES
  ('e0000000-0000-4000-8000-000000000011', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000530', 'd0000000-0000-4000-8000-000000000003',
   'A researcher is studying a cell that is actively dividing. The cell has condensed chromosomes aligned at the metaphase plate.',
   'At which phase of the cell cycle is this cell?',
   'Chromosomes aligned at the metaphase plate indicates the cell is in metaphase of mitosis. During metaphase, spindle fibers attach to kinetochores and chromosomes align at the cell equator.',
   1, 'General Principles', 'Cell Biology', 0.30, 'approved'),

  ('e0000000-0000-4000-8000-000000000012', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000530', 'd0000000-0000-4000-8000-000000000003',
   'A newborn presents with ambiguous genitalia. Karyotype reveals 46,XX. Serum 17-hydroxyprogesterone is markedly elevated.',
   'Which enzyme deficiency is most likely responsible for this presentation?',
   '21-hydroxylase deficiency is the most common cause of congenital adrenal hyperplasia. It leads to decreased cortisol and aldosterone with increased androgens, causing virilization of female infants.',
   3, 'Endocrine', 'Biochemistry', 0.62, 'approved'),

  ('e0000000-0000-4000-8000-000000000013', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000530', 'd0000000-0000-4000-8000-000000000003',
   'A medical student is reviewing a histology slide showing pseudostratified ciliated columnar epithelium with goblet cells.',
   'From which of the following organs was this tissue most likely obtained?',
   'Pseudostratified ciliated columnar epithelium with goblet cells is the hallmark histology of the trachea and bronchi (respiratory epithelium).',
   1, 'Respiratory', 'Anatomy', 0.28, 'draft')
ON CONFLICT (id) DO NOTHING;

-- --- MEDI 532 items (Dr. Sarah Johnson) ---
INSERT INTO assessment_items (id, institution_id, course_id, created_by, vignette, stem, explanation, bloom_level, usmle_system, usmle_discipline, difficulty_estimate, status) VALUES
  ('e0000000-0000-4000-8000-000000000014', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000532', 'd0000000-0000-4000-8000-000000000001',
   'A 35-year-old man presents with epigastric pain that improves with eating. Upper endoscopy reveals a duodenal ulcer.',
   'Which of the following is the most common cause of duodenal ulcers?',
   'Helicobacter pylori infection is the most common cause of duodenal ulcers. It produces urease, which neutralizes gastric acid, and causes chronic inflammation of the gastric mucosa.',
   2, 'Gastrointestinal', 'Pathology', 0.42, 'approved'),

  ('e0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000532', 'd0000000-0000-4000-8000-000000000001',
   'A 25-year-old woman presents with heat intolerance, tremor, and weight loss despite increased appetite. Physical exam reveals exophthalmos.',
   'Which of the following antibodies is most likely present?',
   'Thyroid-stimulating immunoglobulin (TSI) is the hallmark antibody of Graves disease, which causes hyperthyroidism with diffuse goiter and ophthalmopathy.',
   3, 'Endocrine', 'Immunology', 0.55, 'pending_review'),

  ('e0000000-0000-4000-8000-000000000016', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000532', 'd0000000-0000-4000-8000-000000000001',
   'A 22-year-old woman presents with primary amenorrhea. Exam reveals absent secondary sexual characteristics. Karyotype shows 46,XY.',
   'Which of the following is the most likely diagnosis?',
   'Complete androgen insensitivity syndrome (CAIS) presents as phenotypic female with 46,XY karyotype, absent uterus, and absent secondary sexual characteristics due to nonfunctional androgen receptors.',
   4, 'Reproductive', 'Genetics', 0.75, 'draft')
ON CONFLICT (id) DO NOTHING;

-- --- ANAT 502 items (Dr. Michael Chen) ---
INSERT INTO assessment_items (id, institution_id, course_id, created_by, vignette, stem, explanation, bloom_level, usmle_system, usmle_discipline, difficulty_estimate, status) VALUES
  ('e0000000-0000-4000-8000-000000000017', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000502', 'd0000000-0000-4000-8000-000000000003',
   'During a surgical procedure to remove the gallbladder, a surgeon must identify the boundaries of the triangle of Calot.',
   'Which of the following structures forms the inferior boundary of the triangle of Calot?',
   'The triangle of Calot (cystohepatic triangle) is bounded by the cystic duct inferiorly, the common hepatic duct medially, and the inferior surface of the liver superiorly.',
   2, 'Gastrointestinal', 'Anatomy', 0.50, 'approved'),

  ('e0000000-0000-4000-8000-000000000018', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000502', 'd0000000-0000-4000-8000-000000000003',
   'A patient sustains a fracture of the surgical neck of the humerus. Physical exam reveals inability to abduct the arm.',
   'Which nerve was most likely injured?',
   'The axillary nerve wraps around the surgical neck of the humerus and innervates the deltoid muscle (primary abductor of the arm). It also supplies the teres minor and provides sensation to the regimental badge area.',
   2, 'Musculoskeletal, Skin & Subcutaneous Tissue', 'Anatomy', 0.48, 'approved')
ON CONFLICT (id) DO NOTHING;

-- --- PATH 503 items (Dr. Sarah Johnson) ---
INSERT INTO assessment_items (id, institution_id, course_id, created_by, vignette, stem, explanation, bloom_level, usmle_system, usmle_discipline, difficulty_estimate, status) VALUES
  ('e0000000-0000-4000-8000-000000000019', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000503', 'd0000000-0000-4000-8000-000000000001',
   'A 60-year-old man undergoes a liver biopsy. Histologic examination reveals hepatocytes with eosinophilic cytoplasm and pyknotic nuclei surrounded by inflammatory cells.',
   'Which of the following types of cell death is most likely occurring?',
   'The description of eosinophilic cytoplasm, pyknotic nuclei, and surrounding inflammation is characteristic of apoptosis (specifically, Councilman bodies in hepatocytes).',
   3, 'Gastrointestinal', 'Pathology', 0.58, 'pending_review'),

  ('e0000000-0000-4000-8000-000000000020', 'a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000503', 'd0000000-0000-4000-8000-000000000001',
   'A 48-year-old woman presents with a breast mass. Biopsy shows cells with large, hyperchromatic nuclei and increased mitotic figures invading through the basement membrane.',
   'Which of the following features best distinguishes this lesion as malignant rather than benign?',
   'Invasion through the basement membrane is the hallmark feature distinguishing malignant from benign neoplasms. Benign tumors are encapsulated and do not invade surrounding tissues.',
   3, 'General Principles', 'Pathology', 0.55, 'draft')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. OPTIONS (5 per item, A-E)
-- ============================================================================

-- Item 01: ACE inhibitor cough
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000101', 'e0000000-0000-4000-8000-000000000001', 'A', 'Lisinopril', true, NULL),
  ('f0000000-0000-4000-8000-000000000102', 'e0000000-0000-4000-8000-000000000001', 'B', 'Amlodipine', false, 'Calcium channel blocker; does not cause cough'),
  ('f0000000-0000-4000-8000-000000000103', 'e0000000-0000-4000-8000-000000000001', 'C', 'Losartan', false, 'ARB; does not accumulate bradykinin'),
  ('f0000000-0000-4000-8000-000000000104', 'e0000000-0000-4000-8000-000000000001', 'D', 'Metoprolol', false, 'Beta-blocker; may cause bronchospasm but not dry cough'),
  ('f0000000-0000-4000-8000-000000000105', 'e0000000-0000-4000-8000-000000000001', 'E', 'Hydrochlorothiazide', false, 'Thiazide diuretic; does not cause cough')
ON CONFLICT (id) DO NOTHING;

-- Item 02: Warfarin-antibiotic interaction
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000201', 'e0000000-0000-4000-8000-000000000002', 'A', 'Amoxicillin', false, 'Weak CYP interaction; minimal effect on INR'),
  ('f0000000-0000-4000-8000-000000000202', 'e0000000-0000-4000-8000-000000000002', 'B', 'Metronidazole', true, NULL),
  ('f0000000-0000-4000-8000-000000000203', 'e0000000-0000-4000-8000-000000000002', 'C', 'Azithromycin', false, 'Minor CYP interaction; unlikely to cause significant INR increase'),
  ('f0000000-0000-4000-8000-000000000204', 'e0000000-0000-4000-8000-000000000002', 'D', 'Cephalexin', false, 'No significant CYP interaction'),
  ('f0000000-0000-4000-8000-000000000205', 'e0000000-0000-4000-8000-000000000002', 'E', 'Doxycycline', false, 'Weak CYP interaction; not a primary cause of INR elevation')
ON CONFLICT (id) DO NOTHING;

-- Item 03: Valproic acid in pregnancy
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000301', 'e0000000-0000-4000-8000-000000000003', 'A', 'Continue valproic acid with folic acid supplementation', false, 'Folic acid reduces but does not eliminate neural tube defect risk'),
  ('f0000000-0000-4000-8000-000000000302', 'e0000000-0000-4000-8000-000000000003', 'B', 'Switch to lamotrigine', true, NULL),
  ('f0000000-0000-4000-8000-000000000303', 'e0000000-0000-4000-8000-000000000003', 'C', 'Switch to phenytoin', false, 'Also teratogenic; causes fetal hydantoin syndrome'),
  ('f0000000-0000-4000-8000-000000000304', 'e0000000-0000-4000-8000-000000000003', 'D', 'Discontinue all antiepileptic drugs', false, 'Uncontrolled seizures pose greater risk to fetus'),
  ('f0000000-0000-4000-8000-000000000305', 'e0000000-0000-4000-8000-000000000003', 'E', 'Switch to carbamazepine', false, 'Also associated with neural tube defects')
ON CONFLICT (id) DO NOTHING;

-- Item 04: Metformin mechanism
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000401', 'e0000000-0000-4000-8000-000000000004', 'A', 'Stimulates insulin secretion from beta cells', false, 'This describes sulfonylureas, not metformin'),
  ('f0000000-0000-4000-8000-000000000402', 'e0000000-0000-4000-8000-000000000004', 'B', 'Inhibits alpha-glucosidase in the intestine', false, 'This describes acarbose'),
  ('f0000000-0000-4000-8000-000000000403', 'e0000000-0000-4000-8000-000000000004', 'C', 'Activates AMPK to decrease hepatic glucose production', true, NULL),
  ('f0000000-0000-4000-8000-000000000404', 'e0000000-0000-4000-8000-000000000004', 'D', 'Inhibits DPP-4 to increase incretin levels', false, 'This describes sitagliptin'),
  ('f0000000-0000-4000-8000-000000000405', 'e0000000-0000-4000-8000-000000000004', 'E', 'Activates PPAR-gamma receptors', false, 'This describes thiazolidinediones like pioglitazone')
ON CONFLICT (id) DO NOTHING;

-- Item 05: CKD pain management
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000501', 'e0000000-0000-4000-8000-000000000005', 'A', 'Acetaminophen', false, 'Safe in CKD at appropriate doses'),
  ('f0000000-0000-4000-8000-000000000502', 'e0000000-0000-4000-8000-000000000005', 'B', 'Ibuprofen', true, NULL),
  ('f0000000-0000-4000-8000-000000000503', 'e0000000-0000-4000-8000-000000000005', 'C', 'Tramadol', false, 'Can be used with dose adjustment in CKD'),
  ('f0000000-0000-4000-8000-000000000504', 'e0000000-0000-4000-8000-000000000005', 'D', 'Topical capsaicin', false, 'Minimal systemic absorption; safe in CKD'),
  ('f0000000-0000-4000-8000-000000000505', 'e0000000-0000-4000-8000-000000000005', 'E', 'Gabapentin', false, 'Requires dose adjustment but can be used in CKD')
ON CONFLICT (id) DO NOTHING;

-- Item 06: Fluoxetine mechanism
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000601', 'e0000000-0000-4000-8000-000000000006', 'A', 'Inhibits monoamine oxidase', false, 'This describes MAOIs like phenelzine'),
  ('f0000000-0000-4000-8000-000000000602', 'e0000000-0000-4000-8000-000000000006', 'B', 'Blocks serotonin reuptake transporter', true, NULL),
  ('f0000000-0000-4000-8000-000000000603', 'e0000000-0000-4000-8000-000000000006', 'C', 'Blocks norepinephrine reuptake transporter', false, 'This describes atomoxetine or SNRIs'),
  ('f0000000-0000-4000-8000-000000000604', 'e0000000-0000-4000-8000-000000000006', 'D', 'Antagonizes 5-HT2A receptors', false, 'This describes atypical antipsychotics'),
  ('f0000000-0000-4000-8000-000000000605', 'e0000000-0000-4000-8000-000000000006', 'E', 'Inhibits dopamine reuptake', false, 'This describes bupropion')
ON CONFLICT (id) DO NOTHING;

-- Item 07: Inferior STEMI
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000701', 'e0000000-0000-4000-8000-000000000007', 'A', 'Left anterior descending artery', false, 'LAD occlusion causes anterior wall MI (V1-V4)'),
  ('f0000000-0000-4000-8000-000000000702', 'e0000000-0000-4000-8000-000000000007', 'B', 'Left circumflex artery', false, 'LCx occlusion causes lateral wall MI (I, aVL, V5-V6)'),
  ('f0000000-0000-4000-8000-000000000703', 'e0000000-0000-4000-8000-000000000007', 'C', 'Right coronary artery', true, NULL),
  ('f0000000-0000-4000-8000-000000000704', 'e0000000-0000-4000-8000-000000000007', 'D', 'Left main coronary artery', false, 'Left main occlusion causes massive anterior and lateral changes'),
  ('f0000000-0000-4000-8000-000000000705', 'e0000000-0000-4000-8000-000000000007', 'E', 'Posterior descending artery', false, 'PDA is usually a branch of RCA; isolated PDA occlusion is rare')
ON CONFLICT (id) DO NOTHING;

-- Item 08: COPD pathophysiology
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000801', 'e0000000-0000-4000-8000-000000000008', 'A', 'Increased airway smooth muscle contraction', false, 'This is more characteristic of asthma'),
  ('f0000000-0000-4000-8000-000000000802', 'e0000000-0000-4000-8000-000000000008', 'B', 'Decreased elastic recoil of lung parenchyma', true, NULL),
  ('f0000000-0000-4000-8000-000000000803', 'e0000000-0000-4000-8000-000000000008', 'C', 'Pulmonary vascular congestion', false, 'This is characteristic of heart failure'),
  ('f0000000-0000-4000-8000-000000000804', 'e0000000-0000-4000-8000-000000000008', 'D', 'Diaphragmatic paralysis', false, 'Would cause restrictive pattern, not obstructive'),
  ('f0000000-0000-4000-8000-000000000805', 'e0000000-0000-4000-8000-000000000008', 'E', 'Pleural effusion', false, 'Would cause restrictive pattern')
ON CONFLICT (id) DO NOTHING;

-- Item 09: Ascites in cirrhosis
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000000901', 'e0000000-0000-4000-8000-000000000009', 'A', 'Increased portal venous pressure with decreased oncotic pressure', true, NULL),
  ('f0000000-0000-4000-8000-000000000902', 'e0000000-0000-4000-8000-000000000009', 'B', 'Bacterial peritonitis', false, 'SBP is a complication of ascites, not the primary cause'),
  ('f0000000-0000-4000-8000-000000000903', 'e0000000-0000-4000-8000-000000000009', 'C', 'Hepatic vein thrombosis', false, 'This describes Budd-Chiari syndrome'),
  ('f0000000-0000-4000-8000-000000000904', 'e0000000-0000-4000-8000-000000000009', 'D', 'Pancreatic duct obstruction', false, 'Would cause pancreatic ascites, not hepatic'),
  ('f0000000-0000-4000-8000-000000000905', 'e0000000-0000-4000-8000-000000000009', 'E', 'Lymphatic obstruction', false, 'Chylous ascites has different etiology')
ON CONFLICT (id) DO NOTHING;

-- Item 10: Hypothyroidism
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001001', 'e0000000-0000-4000-8000-000000000010', 'A', 'Graves disease', false, 'Causes hyperthyroidism with low TSH'),
  ('f0000000-0000-4000-8000-000000001002', 'e0000000-0000-4000-8000-000000000010', 'B', 'Hashimoto thyroiditis', true, NULL),
  ('f0000000-0000-4000-8000-000000001003', 'e0000000-0000-4000-8000-000000000010', 'C', 'Toxic multinodular goiter', false, 'Causes hyperthyroidism'),
  ('f0000000-0000-4000-8000-000000001004', 'e0000000-0000-4000-8000-000000000010', 'D', 'Pituitary adenoma', false, 'Would cause secondary hypothyroidism with low TSH'),
  ('f0000000-0000-4000-8000-000000001005', 'e0000000-0000-4000-8000-000000000010', 'E', 'Subacute thyroiditis', false, 'Usually transient; causes initial hyperthyroidism')
ON CONFLICT (id) DO NOTHING;

-- Item 11: Metaphase
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001101', 'e0000000-0000-4000-8000-000000000011', 'A', 'G1 phase', false, 'Chromosomes are not condensed in G1'),
  ('f0000000-0000-4000-8000-000000001102', 'e0000000-0000-4000-8000-000000000011', 'B', 'S phase', false, 'DNA replication occurs but chromosomes are not condensed'),
  ('f0000000-0000-4000-8000-000000001103', 'e0000000-0000-4000-8000-000000000011', 'C', 'Metaphase', true, NULL),
  ('f0000000-0000-4000-8000-000000001104', 'e0000000-0000-4000-8000-000000000011', 'D', 'Anaphase', false, 'Chromosomes are being pulled apart, not aligned'),
  ('f0000000-0000-4000-8000-000000001105', 'e0000000-0000-4000-8000-000000000011', 'E', 'Telophase', false, 'Chromosomes are at poles and decondensing')
ON CONFLICT (id) DO NOTHING;

-- Item 12: 21-hydroxylase deficiency
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001201', 'e0000000-0000-4000-8000-000000000012', 'A', '11-beta-hydroxylase deficiency', false, 'Causes virilization but also hypertension due to 11-deoxycorticosterone excess'),
  ('f0000000-0000-4000-8000-000000001202', 'e0000000-0000-4000-8000-000000000012', 'B', '17-alpha-hydroxylase deficiency', false, 'Causes decreased androgens and sex hormones'),
  ('f0000000-0000-4000-8000-000000001203', 'e0000000-0000-4000-8000-000000000012', 'C', '21-hydroxylase deficiency', true, NULL),
  ('f0000000-0000-4000-8000-000000001204', 'e0000000-0000-4000-8000-000000000012', 'D', 'Aromatase deficiency', false, 'Would cause virilization but normal 17-OHP'),
  ('f0000000-0000-4000-8000-000000001205', 'e0000000-0000-4000-8000-000000000012', 'E', '5-alpha-reductase deficiency', false, 'Causes ambiguous genitalia in XY, not XX')
ON CONFLICT (id) DO NOTHING;

-- Item 13: Respiratory epithelium
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001301', 'e0000000-0000-4000-8000-000000000013', 'A', 'Esophagus', false, 'Stratified squamous epithelium'),
  ('f0000000-0000-4000-8000-000000001302', 'e0000000-0000-4000-8000-000000000013', 'B', 'Trachea', true, NULL),
  ('f0000000-0000-4000-8000-000000001303', 'e0000000-0000-4000-8000-000000000013', 'C', 'Stomach', false, 'Simple columnar epithelium without cilia'),
  ('f0000000-0000-4000-8000-000000001304', 'e0000000-0000-4000-8000-000000000013', 'D', 'Urinary bladder', false, 'Transitional epithelium (urothelium)'),
  ('f0000000-0000-4000-8000-000000001305', 'e0000000-0000-4000-8000-000000000013', 'E', 'Small intestine', false, 'Simple columnar with microvilli, not cilia')
ON CONFLICT (id) DO NOTHING;

-- Item 14: Duodenal ulcer
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001401', 'e0000000-0000-4000-8000-000000000014', 'A', 'Helicobacter pylori infection', true, NULL),
  ('f0000000-0000-4000-8000-000000001402', 'e0000000-0000-4000-8000-000000000014', 'B', 'Zollinger-Ellison syndrome', false, 'Rare cause of peptic ulcers due to gastrin-secreting tumor'),
  ('f0000000-0000-4000-8000-000000001403', 'e0000000-0000-4000-8000-000000000014', 'C', 'NSAID use', false, 'Second most common cause; more commonly causes gastric ulcers'),
  ('f0000000-0000-4000-8000-000000001404', 'e0000000-0000-4000-8000-000000000014', 'D', 'Stress', false, 'Stress ulcers occur in critically ill patients, different mechanism'),
  ('f0000000-0000-4000-8000-000000001405', 'e0000000-0000-4000-8000-000000000014', 'E', 'Crohn disease', false, 'Can cause duodenal ulcers but is an uncommon cause')
ON CONFLICT (id) DO NOTHING;

-- Item 15: Graves disease antibody
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001501', 'e0000000-0000-4000-8000-000000000015', 'A', 'Anti-thyroid peroxidase antibody', false, 'Found in Hashimoto thyroiditis, not specific to Graves'),
  ('f0000000-0000-4000-8000-000000001502', 'e0000000-0000-4000-8000-000000000015', 'B', 'Anti-thyroglobulin antibody', false, 'Found in Hashimoto thyroiditis'),
  ('f0000000-0000-4000-8000-000000001503', 'e0000000-0000-4000-8000-000000000015', 'C', 'Thyroid-stimulating immunoglobulin', true, NULL),
  ('f0000000-0000-4000-8000-000000001504', 'e0000000-0000-4000-8000-000000000015', 'D', 'Anti-TSH receptor blocking antibody', false, 'Causes hypothyroidism, not hyperthyroidism'),
  ('f0000000-0000-4000-8000-000000001505', 'e0000000-0000-4000-8000-000000000015', 'E', 'Anti-nuclear antibody', false, 'Associated with SLE, not thyroid disease')
ON CONFLICT (id) DO NOTHING;

-- Item 16: Androgen insensitivity
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001601', 'e0000000-0000-4000-8000-000000000016', 'A', 'Turner syndrome', false, 'Karyotype is 45,X not 46,XY'),
  ('f0000000-0000-4000-8000-000000001602', 'e0000000-0000-4000-8000-000000000016', 'B', 'Complete androgen insensitivity syndrome', true, NULL),
  ('f0000000-0000-4000-8000-000000001603', 'e0000000-0000-4000-8000-000000000016', 'C', '5-alpha-reductase deficiency', false, 'Presents with ambiguous genitalia at birth but virilization at puberty'),
  ('f0000000-0000-4000-8000-000000001604', 'e0000000-0000-4000-8000-000000000016', 'D', 'Swyer syndrome', false, 'Pure gonadal dysgenesis with streak gonads'),
  ('f0000000-0000-4000-8000-000000001605', 'e0000000-0000-4000-8000-000000000016', 'E', 'Congenital adrenal hyperplasia', false, 'Occurs in 46,XX with virilization')
ON CONFLICT (id) DO NOTHING;

-- Item 17: Triangle of Calot
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001701', 'e0000000-0000-4000-8000-000000000017', 'A', 'Common bile duct', false, 'The CBD is not a boundary of the cystohepatic triangle'),
  ('f0000000-0000-4000-8000-000000001702', 'e0000000-0000-4000-8000-000000000017', 'B', 'Cystic duct', true, NULL),
  ('f0000000-0000-4000-8000-000000001703', 'e0000000-0000-4000-8000-000000000017', 'C', 'Right hepatic artery', false, 'Runs within the triangle but is not a boundary'),
  ('f0000000-0000-4000-8000-000000001704', 'e0000000-0000-4000-8000-000000000017', 'D', 'Portal vein', false, 'Lies posterior to the hepatoduodenal ligament'),
  ('f0000000-0000-4000-8000-000000001705', 'e0000000-0000-4000-8000-000000000017', 'E', 'Hepatic duct proper', false, 'Common hepatic duct is the medial boundary')
ON CONFLICT (id) DO NOTHING;

-- Item 18: Axillary nerve injury
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001801', 'e0000000-0000-4000-8000-000000000018', 'A', 'Musculocutaneous nerve', false, 'Innervates biceps and brachialis; elbow flexion affected'),
  ('f0000000-0000-4000-8000-000000001802', 'e0000000-0000-4000-8000-000000000018', 'B', 'Suprascapular nerve', false, 'Innervates supraspinatus and infraspinatus'),
  ('f0000000-0000-4000-8000-000000001803', 'e0000000-0000-4000-8000-000000000018', 'C', 'Axillary nerve', true, NULL),
  ('f0000000-0000-4000-8000-000000001804', 'e0000000-0000-4000-8000-000000000018', 'D', 'Radial nerve', false, 'Innervates extensors; causes wrist drop'),
  ('f0000000-0000-4000-8000-000000001805', 'e0000000-0000-4000-8000-000000000018', 'E', 'Long thoracic nerve', false, 'Innervates serratus anterior; causes winged scapula')
ON CONFLICT (id) DO NOTHING;

-- Item 19: Hepatocyte cell death
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000001901', 'e0000000-0000-4000-8000-000000000019', 'A', 'Coagulative necrosis', false, 'Maintains cellular architecture; typical of ischemia'),
  ('f0000000-0000-4000-8000-000000001902', 'e0000000-0000-4000-8000-000000000019', 'B', 'Liquefactive necrosis', false, 'Tissue becomes liquid; typical of brain infarcts'),
  ('f0000000-0000-4000-8000-000000001903', 'e0000000-0000-4000-8000-000000000019', 'C', 'Apoptosis', true, NULL),
  ('f0000000-0000-4000-8000-000000001904', 'e0000000-0000-4000-8000-000000000019', 'D', 'Caseous necrosis', false, 'Cheese-like necrosis; typical of tuberculosis'),
  ('f0000000-0000-4000-8000-000000001905', 'e0000000-0000-4000-8000-000000000019', 'E', 'Fat necrosis', false, 'Occurs in pancreatic and breast tissue')
ON CONFLICT (id) DO NOTHING;

-- Item 20: Malignancy vs benign
INSERT INTO options (id, item_id, label, option_text, is_correct, distractor_rationale) VALUES
  ('f0000000-0000-4000-8000-000000002001', 'e0000000-0000-4000-8000-000000000020', 'A', 'Increased mitotic figures', false, 'Can be seen in benign rapidly dividing tissues'),
  ('f0000000-0000-4000-8000-000000002002', 'e0000000-0000-4000-8000-000000000020', 'B', 'Hyperchromatic nuclei', false, 'Dysplasia can show hyperchromasia without invasion'),
  ('f0000000-0000-4000-8000-000000002003', 'e0000000-0000-4000-8000-000000000020', 'C', 'Invasion through the basement membrane', true, NULL),
  ('f0000000-0000-4000-8000-000000002004', 'e0000000-0000-4000-8000-000000000020', 'D', 'Large nuclear size', false, 'Nuclear enlargement alone does not confirm malignancy'),
  ('f0000000-0000-4000-8000-000000002005', 'e0000000-0000-4000-8000-000000000020', 'E', 'Presence of a tumor mass', false, 'Both benign and malignant lesions form masses')
ON CONFLICT (id) DO NOTHING;
