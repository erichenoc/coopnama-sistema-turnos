-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 013: Demand Forecasting Cache
-- ============================================

CREATE TABLE IF NOT EXISTS demand_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  forecast_date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour BETWEEN 0 AND 23),
  predicted_count NUMERIC NOT NULL,
  actual_count INTEGER,
  model_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT forecast_unique UNIQUE (branch_id, forecast_date, hour)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_branch_date ON demand_forecasts(branch_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_demand_forecasts_org ON demand_forecasts(organization_id);

-- RLS
ALTER TABLE demand_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org demand_forecasts"
  ON demand_forecasts FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage demand_forecasts"
  ON demand_forecasts FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

COMMENT ON TABLE demand_forecasts IS 'Cached demand predictions per hour for staffing recommendations';
