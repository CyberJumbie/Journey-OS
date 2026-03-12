-- P2-019: KaizenML Data Linting Rules
-- Stores nightly data quality lint run results.

CREATE TABLE IF NOT EXISTS kaizen_lint_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  run_at timestamptz NOT NULL DEFAULT now(),
  rule_id text NOT NULL,
  result text NOT NULL CHECK (result IN ('pass', 'fail')),
  count integer NOT NULL,
  threshold numeric NOT NULL,
  passed boolean NOT NULL,
  details jsonb,
  remediation_applied boolean NOT NULL DEFAULT false
);

-- Index on run_id for grouping rules from the same run
CREATE INDEX idx_kaizen_lint_runs_run_id ON kaizen_lint_runs (run_id);

-- Index on run_at for time-based queries (latest runs)
CREATE INDEX idx_kaizen_lint_runs_run_at ON kaizen_lint_runs (run_at DESC);

-- RLS: admin can select, service_role can insert (bypasses RLS automatically)
ALTER TABLE kaizen_lint_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read lint runs"
  ON kaizen_lint_runs
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('superadmin', 'institutional_admin')
  );
