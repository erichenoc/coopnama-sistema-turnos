-- =============================================
-- Migration 016: Webhook Subscriptions
-- =============================================

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  failure_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Org admins can manage webhooks"
  ON webhook_subscriptions FOR ALL
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Indexes
CREATE INDEX idx_webhook_subs_org ON webhook_subscriptions(organization_id);
CREATE INDEX idx_webhook_subs_active ON webhook_subscriptions(is_active) WHERE is_active = true;
