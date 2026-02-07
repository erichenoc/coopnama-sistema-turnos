-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 014: Intelligent Routing
-- ============================================

-- Agent skills proficiency
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  proficiency INTEGER DEFAULT 5 CHECK (proficiency BETWEEN 1 AND 10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT agent_skill_unique UNIQUE (agent_id, service_id)
);

-- Routing configuration per organization
CREATE TABLE IF NOT EXISTS routing_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  strategy TEXT NOT NULL DEFAULT 'round_robin' CHECK (strategy IN ('round_robin','least_busy','skill_based','hybrid')),
  load_balance_weight NUMERIC DEFAULT 0.5,
  prefer_same_agent BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT routing_config_org_unique UNIQUE (organization_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_service ON agent_skills(service_id);
CREATE INDEX IF NOT EXISTS idx_routing_configs_org ON routing_configs(organization_id);

-- Triggers
CREATE TRIGGER update_routing_configs_updated_at
  BEFORE UPDATE ON routing_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agent_skills in org"
  ON agent_skills FOR SELECT
  USING (agent_id IN (SELECT id FROM users WHERE organization_id = get_user_organization_id()));

CREATE POLICY "Admins can manage agent_skills"
  ON agent_skills FOR ALL
  USING (user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager']));

CREATE POLICY "Users can view routing_configs"
  ON routing_configs FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins can manage routing_configs"
  ON routing_configs FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

-- Comments
COMMENT ON TABLE agent_skills IS 'Agent service proficiency for skill-based routing';
COMMENT ON TABLE routing_configs IS 'Organization routing strategy configuration';
