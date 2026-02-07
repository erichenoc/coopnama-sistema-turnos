-- =============================================
-- Migration 015: Gamification & Agent Achievements
-- =============================================

-- Agent achievements table
CREATE TABLE IF NOT EXISTS agent_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  earned_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT achievement_unique UNIQUE (agent_id, achievement_type)
);

-- Enable RLS
ALTER TABLE agent_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Agents can view own achievements"
  ON agent_achievements FOR SELECT
  USING (agent_id = auth.uid());

CREATE POLICY "Org admins can view all achievements"
  ON agent_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = auth.uid()
        AND u2.id = agent_achievements.agent_id
        AND u1.role IN ('admin', 'super_admin', 'supervisor')
    )
  );

CREATE POLICY "System can manage achievements"
  ON agent_achievements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
  );

-- Indexes
CREATE INDEX idx_agent_achievements_agent ON agent_achievements(agent_id);
CREATE INDEX idx_agent_achievements_type ON agent_achievements(achievement_type);
