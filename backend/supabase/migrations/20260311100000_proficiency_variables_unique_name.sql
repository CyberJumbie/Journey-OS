-- P2-014: ProficiencyVariable nodes — add unique constraint on name
-- Ensures 1:1 mapping between ProficiencyVariables and SubConcepts.
-- The name column uses convention `pv_{subConceptName}` and must be unique
-- to support idempotent upsert via DualWriteService.

CREATE UNIQUE INDEX IF NOT EXISTS idx_proficiency_variables_name
  ON proficiency_variables (name);

-- Enable RLS for proficiency_variables
ALTER TABLE proficiency_variables ENABLE ROW LEVEL SECURITY;

-- Service role can manage all proficiency variables (pipeline writes via service key)
DO $$ BEGIN
  CREATE POLICY "service role manages proficiency_variables" ON proficiency_variables
    FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
