-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 012: Transfer Journey Tracking
-- ============================================

-- Add journey tracking to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS journey_step INTEGER DEFAULT 1;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS original_ticket_id UUID REFERENCES tickets(id);

-- Index for journey lookups
CREATE INDEX IF NOT EXISTS idx_tickets_original_ticket ON tickets(original_ticket_id) WHERE original_ticket_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN tickets.journey_step IS 'Step number in multi-transfer journey (1 = original, 2+ = transfers)';
COMMENT ON COLUMN tickets.original_ticket_id IS 'Reference to the very first ticket in a transfer chain';
