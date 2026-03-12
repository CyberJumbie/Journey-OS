-- P2-020: Golden Dataset + Nightly Regression
-- Stores the set of verified high-quality items used as a regression benchmark.

CREATE TABLE IF NOT EXISTS golden_dataset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES assessment_items(id),
  added_by uuid REFERENCES auth.users(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  target_critic_min float NOT NULL DEFAULT 3.8
);

-- Unique constraint: each item can only be in the golden dataset once
CREATE UNIQUE INDEX idx_golden_dataset_item_id ON golden_dataset (item_id);

-- Index on added_at for time-based queries
CREATE INDEX idx_golden_dataset_added_at ON golden_dataset (added_at DESC);

-- RLS: admin can select, service_role can insert/update (bypasses RLS automatically)
ALTER TABLE golden_dataset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read golden dataset"
  ON golden_dataset
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('superadmin', 'institutional_admin')
  );
