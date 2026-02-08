-- =============================================
-- Migration 018: Copilot V2 Enhancements
-- Follow-up tasks for agents + KB improvements
-- =============================================

-- Follow-up tasks for agents (Copilot Feature #14)
CREATE TABLE IF NOT EXISTS follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id),
  task_description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add service_id to knowledge_base for auto-matching by service (Copilot Feature #12)
-- Only runs if knowledge_base table already exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_base') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'knowledge_base' AND column_name = 'service_id'
    ) THEN
      ALTER TABLE knowledge_base ADD COLUMN service_id UUID REFERENCES services(id);
    END IF;
  END IF;
END $$;

-- Add entry_type to knowledge_base for distinguishing procedures vs articles (Copilot Feature #6)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_base') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'knowledge_base' AND column_name = 'entry_type'
    ) THEN
      ALTER TABLE knowledge_base ADD COLUMN entry_type TEXT DEFAULT 'article'
        CHECK (entry_type IN ('article', 'procedure', 'faq', 'script', 'policy'));
    END IF;
  END IF;
END $$;

-- Indexes for follow_up_tasks
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_agent
  ON follow_up_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_ticket
  ON follow_up_tasks(ticket_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_pending
  ON follow_up_tasks(agent_id, is_completed)
  WHERE NOT is_completed;

-- Indexes for knowledge_base new columns (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_base') THEN
    CREATE INDEX IF NOT EXISTS idx_knowledge_base_service
      ON knowledge_base(service_id)
      WHERE service_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_knowledge_base_entry_type
      ON knowledge_base(organization_id, entry_type);
  END IF;
END $$;

-- RLS for follow_up_tasks
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;

-- Agents can view their own follow-up tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agents view own follow_up_tasks'
  ) THEN
    CREATE POLICY "Agents view own follow_up_tasks"
      ON follow_up_tasks FOR SELECT
      USING (agent_id = auth.uid());
  END IF;
END $$;

-- Agents can insert their own follow-up tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agents insert own follow_up_tasks'
  ) THEN
    CREATE POLICY "Agents insert own follow_up_tasks"
      ON follow_up_tasks FOR INSERT
      WITH CHECK (agent_id = auth.uid());
  END IF;
END $$;

-- Agents can update their own follow-up tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agents update own follow_up_tasks'
  ) THEN
    CREATE POLICY "Agents update own follow_up_tasks"
      ON follow_up_tasks FOR UPDATE
      USING (agent_id = auth.uid());
  END IF;
END $$;

-- Agents can delete their own follow-up tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Agents delete own follow_up_tasks'
  ) THEN
    CREATE POLICY "Agents delete own follow_up_tasks"
      ON follow_up_tasks FOR DELETE
      USING (agent_id = auth.uid());
  END IF;
END $$;

-- Updated_at trigger for follow_up_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_follow_up_tasks_updated_at'
  ) THEN
    CREATE TRIGGER update_follow_up_tasks_updated_at
      BEFORE UPDATE ON follow_up_tasks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
