-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 003: Tickets and Queue Management
-- ============================================

-- daily_counters (contadores diarios para generar números de turno)
CREATE TABLE IF NOT EXISTS daily_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  counter_date DATE NOT NULL DEFAULT CURRENT_DATE,
  last_number INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, service_id, counter_date)
);

-- tickets (turnos)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  member_id UUID REFERENCES members(id),
  station_id UUID REFERENCES stations(id),
  agent_id UUID REFERENCES users(id),

  -- Identificación del turno
  ticket_number TEXT NOT NULL,
  daily_sequence INTEGER NOT NULL,

  -- Datos del cliente (puede no ser miembro registrado)
  customer_name TEXT,
  customer_phone TEXT,
  customer_cedula TEXT,

  -- Estado y prioridad
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN (
    'waiting',     -- En espera
    'called',      -- Llamado (sonando)
    'serving',     -- Siendo atendido
    'on_hold',     -- En pausa/espera
    'transferred', -- Transferido a otro servicio
    'completed',   -- Completado
    'cancelled',   -- Cancelado
    'no_show'      -- No se presentó
  )),
  priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 3), -- 0=normal, 1=preferencial, 2=VIP, 3=urgente
  priority_reason TEXT,

  -- Origen del ticket
  source TEXT DEFAULT 'kiosk' CHECK (source IN ('whatsapp', 'kiosk', 'web', 'reception', 'app')),

  -- Timestamps de ciclo de vida
  created_at TIMESTAMPTZ DEFAULT now(),
  scheduled_for TIMESTAMPTZ, -- Para citas programadas
  called_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Métricas de tiempo
  wait_time_seconds INTEGER,
  service_time_seconds INTEGER,

  -- Seguimiento
  recall_count INTEGER DEFAULT 0,
  notes TEXT,

  -- Transferencias
  transferred_from_ticket_id UUID REFERENCES tickets(id),
  transferred_from_service_id UUID REFERENCES services(id),
  transfer_reason TEXT,

  -- Feedback
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  feedback_comment TEXT,
  feedback_sentiment TEXT CHECK (feedback_sentiment IN ('positive', 'neutral', 'negative')),

  -- No functional UNIQUE constraint; use index below
  CONSTRAINT tickets_branch_number_check CHECK (ticket_number IS NOT NULL)
);

-- Helper function for immutable date extraction (needed for unique index)
CREATE OR REPLACE FUNCTION ticket_date(ts TIMESTAMPTZ)
RETURNS DATE AS $$
  SELECT ts::date;
$$ LANGUAGE SQL IMMUTABLE;

-- Unique index for ticket number per branch per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_unique_per_day
  ON tickets (branch_id, ticket_number, ticket_date(created_at));

-- ticket_history (historial de cambios de estado)
CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  station_id UUID REFERENCES stations(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- agent_sessions (sesiones de agentes en ventanillas)
CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  break_started_at TIMESTAMPTZ,
  break_ended_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  is_on_break BOOLEAN DEFAULT false,
  tickets_served INTEGER DEFAULT 0,
  total_service_time_seconds INTEGER DEFAULT 0,
  avg_service_time_seconds INTEGER,
  CONSTRAINT agent_sessions_check CHECK (station_id IS NOT NULL)
);

-- Unique index for one session per agent per station per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_sessions_unique_per_day
  ON agent_sessions (station_id, agent_id, ticket_date(started_at));

-- Índices para optimizar queries frecuentes
CREATE INDEX IF NOT EXISTS idx_tickets_branch_status ON tickets(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_branch_date ON tickets(branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_service ON tickets(service_id);
CREATE INDEX IF NOT EXISTS idx_tickets_agent ON tickets(agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_station ON tickets(station_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_station ON agent_sessions(station_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent ON agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON agent_sessions(is_active) WHERE is_active = true;

-- Comentarios
COMMENT ON TABLE daily_counters IS 'Contadores diarios para generar números de turno secuenciales';
COMMENT ON TABLE tickets IS 'Turnos/tickets del sistema de cola';
COMMENT ON TABLE ticket_history IS 'Historial de cambios de estado de cada ticket (audit log)';
COMMENT ON TABLE agent_sessions IS 'Sesiones de agentes asignados a ventanillas';
COMMENT ON COLUMN tickets.status IS 'Estado del ticket: waiting, called, serving, on_hold, transferred, completed, cancelled, no_show';
COMMENT ON COLUMN tickets.priority IS '0=normal, 1=preferencial, 2=VIP, 3=urgente';
COMMENT ON COLUMN tickets.source IS 'Origen: whatsapp, kiosk, web, reception, app';
