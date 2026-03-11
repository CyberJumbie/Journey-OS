-- P2-018: TEACHES_VERIFIED Workflow
-- Faculty verification/rejection of AI-extracted TEACHES edges.

CREATE TABLE IF NOT EXISTS teaches_verifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chunk_id    uuid NOT NULL,
  sub_concept_id uuid NOT NULL,
  verified_by uuid NOT NULL REFERENCES auth.users(id),
  action      text NOT NULL CHECK (action IN ('verify', 'reject')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for quick lookup by chunk + concept pair
CREATE INDEX IF NOT EXISTS idx_teaches_verifications_chunk_concept
  ON teaches_verifications (chunk_id, sub_concept_id);

-- Index for lookup by faculty user
CREATE INDEX IF NOT EXISTS idx_teaches_verifications_verified_by
  ON teaches_verifications (verified_by);

-- RLS: authenticated users can insert their own rows and select their own
ALTER TABLE teaches_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert own verifications"
  ON teaches_verifications FOR INSERT
  TO authenticated
  WITH CHECK (verified_by = auth.uid());

CREATE POLICY "Authenticated users can select own verifications"
  ON teaches_verifications FOR SELECT
  TO authenticated
  USING (verified_by = auth.uid());

-- Allow service role full access (backend uses service_role key)
CREATE POLICY "Service role full access"
  ON teaches_verifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
