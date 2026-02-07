-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 009: SLA Configuration & Priority Rules
-- ============================================

-- ============================================
-- TABLAS
-- ============================================

-- sla_configs: Configuración de SLA por servicio u organización
CREATE TABLE IF NOT EXISTS sla_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,  -- NULL = aplica a todos los servicios

  -- Umbrales de tiempo de espera
  max_wait_minutes INTEGER NOT NULL DEFAULT 30,
  warning_at_minutes INTEGER NOT NULL DEFAULT 20,
  critical_at_minutes INTEGER NOT NULL DEFAULT 45,

  -- Escalación automática de prioridad
  auto_escalate_priority BOOLEAN DEFAULT false,
  escalate_after_minutes INTEGER DEFAULT 25,
  escalate_to_priority INTEGER DEFAULT 2 CHECK (escalate_to_priority BETWEEN 0 AND 3),

  -- Notificaciones
  notify_supervisor BOOLEAN DEFAULT true,
  notify_channels TEXT[] DEFAULT ARRAY['push','in_app'],

  -- Estado
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Restricción: Una configuración por servicio (o una global por org si service_id es NULL)
  CONSTRAINT sla_config_unique UNIQUE (organization_id, service_id)
);

-- priority_rules: Reglas de asignación automática de prioridad
CREATE TABLE IF NOT EXISTS priority_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Identificación de la regla
  name TEXT NOT NULL,
  description TEXT,

  -- Tipo de condición que activa la regla
  condition_type TEXT NOT NULL CHECK (condition_type IN (
    'age',          -- Basado en edad (ej: >65 años)
    'member_type',  -- Tipo de socio (VIP, preferencial)
    'disability',   -- Persona con discapacidad
    'pregnancy',    -- Mujer embarazada
    'vip',          -- Cliente VIP
    'time_of_day',  -- Horario específico (ej: hora pico)
    'service',      -- Servicio específico
    'custom'        -- Regla personalizada (evaluada en backend)
  )),

  -- Valor de la condición (JSON flexible para diferentes tipos)
  -- Ejemplos:
  -- {"min_age": 65} para edad
  -- {"member_type": "vip"} para tipo de socio
  -- {"time_start": "08:00", "time_end": "10:00"} para horario
  -- {"service_ids": ["uuid1", "uuid2"]} para servicios específicos
  condition_value JSONB DEFAULT '{}',

  -- Incremento de prioridad (1-3)
  priority_boost INTEGER NOT NULL DEFAULT 1 CHECK (priority_boost BETWEEN 1 AND 3),

  -- Estado y orden
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- sla_breaches: Log de violaciones de SLA
CREATE TABLE IF NOT EXISTS sla_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  sla_config_id UUID REFERENCES sla_configs(id) ON DELETE SET NULL,

  -- Tipo de violación
  breach_type TEXT NOT NULL CHECK (breach_type IN (
    'warning',   -- Se alcanzó el umbral de advertencia
    'critical',  -- Se alcanzó el umbral crítico
    'breached'   -- Se superó el tiempo máximo de espera
  )),

  -- Datos de la violación
  wait_minutes NUMERIC NOT NULL,
  threshold_minutes INTEGER NOT NULL,

  -- Seguimiento
  notified BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_sla_configs_updated_at
  BEFORE UPDATE ON sla_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÍNDICES
-- ============================================

-- sla_configs
CREATE INDEX IF NOT EXISTS idx_sla_configs_organization ON sla_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sla_configs_org_service ON sla_configs(organization_id, service_id);
CREATE INDEX IF NOT EXISTS idx_sla_configs_active ON sla_configs(is_active) WHERE is_active = true;

-- priority_rules
CREATE INDEX IF NOT EXISTS idx_priority_rules_organization ON priority_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_priority_rules_org_active ON priority_rules(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_priority_rules_condition_type ON priority_rules(condition_type);
CREATE INDEX IF NOT EXISTS idx_priority_rules_sort ON priority_rules(organization_id, sort_order);

-- sla_breaches
CREATE INDEX IF NOT EXISTS idx_sla_breaches_organization ON sla_breaches(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_ticket ON sla_breaches(ticket_id);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_branch ON sla_breaches(branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_type_notified ON sla_breaches(breach_type, notified) WHERE notified = false;
CREATE INDEX IF NOT EXISTS idx_sla_breaches_unresolved ON sla_breaches(organization_id, resolved_at) WHERE resolved_at IS NULL;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_breaches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SLA_CONFIGS POLICIES
-- ============================================

-- Usuarios pueden ver configuraciones de SLA de su organización
CREATE POLICY "Users can view org sla_configs"
  ON sla_configs FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Admins pueden gestionar configuraciones de SLA
CREATE POLICY "Admins can manage sla_configs"
  ON sla_configs FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- ============================================
-- PRIORITY_RULES POLICIES
-- ============================================

-- Usuarios pueden ver reglas de prioridad de su organización
CREATE POLICY "Users can view org priority_rules"
  ON priority_rules FOR SELECT
  USING (organization_id = get_user_organization_id());

-- PÚBLICO: Kiosk y sistema necesitan ver reglas activas para aplicar prioridades
CREATE POLICY "Public can view active priority_rules"
  ON priority_rules FOR SELECT
  USING (is_active = true);

-- Admins pueden gestionar reglas de prioridad
CREATE POLICY "Admins can manage priority_rules"
  ON priority_rules FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- ============================================
-- SLA_BREACHES POLICIES
-- ============================================

-- Usuarios pueden ver violaciones de SLA de su organización
CREATE POLICY "Users can view org sla_breaches"
  ON sla_breaches FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Sistema puede insertar violaciones de SLA
CREATE POLICY "System can insert sla_breaches"
  ON sla_breaches FOR INSERT
  WITH CHECK (true);

-- Supervisores pueden actualizar violaciones (marcar como resueltas)
CREATE POLICY "Supervisors can update sla_breaches"
  ON sla_breaches FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor'])
  );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Habilitar realtime para sla_breaches (alertas en tiempo real para supervisores)
ALTER PUBLICATION supabase_realtime ADD TABLE sla_breaches;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE sla_configs IS 'Configuración de Service Level Agreements por servicio u organización';
COMMENT ON TABLE priority_rules IS 'Reglas de asignación automática de prioridad basadas en condiciones';
COMMENT ON TABLE sla_breaches IS 'Registro de violaciones de SLA para auditoría y análisis';

COMMENT ON COLUMN sla_configs.service_id IS 'NULL = configuración aplica a todos los servicios de la organización';
COMMENT ON COLUMN sla_configs.max_wait_minutes IS 'Tiempo máximo de espera antes de considerarse violación de SLA';
COMMENT ON COLUMN sla_configs.warning_at_minutes IS 'Umbral para alerta de advertencia';
COMMENT ON COLUMN sla_configs.critical_at_minutes IS 'Umbral para alerta crítica';
COMMENT ON COLUMN sla_configs.auto_escalate_priority IS 'Si true, escala automáticamente la prioridad del ticket';
COMMENT ON COLUMN sla_configs.notify_channels IS 'Canales de notificación: push, in_app, sms, email';

COMMENT ON COLUMN priority_rules.condition_type IS 'Tipo de condición: age, member_type, disability, pregnancy, vip, time_of_day, service, custom';
COMMENT ON COLUMN priority_rules.condition_value IS 'JSON con parámetros de la condición (ej: {"min_age": 65})';
COMMENT ON COLUMN priority_rules.priority_boost IS 'Incremento de prioridad (1-3): se suma a la prioridad base';
COMMENT ON COLUMN priority_rules.sort_order IS 'Orden de evaluación de las reglas (menor = primero)';

COMMENT ON COLUMN sla_breaches.breach_type IS 'Tipo de violación: warning, critical, breached';
COMMENT ON COLUMN sla_breaches.wait_minutes IS 'Tiempo de espera real cuando ocurrió la violación';
COMMENT ON COLUMN sla_breaches.threshold_minutes IS 'Umbral que se violó';
COMMENT ON COLUMN sla_breaches.notified IS 'Si se envió notificación a supervisor/admin';
COMMENT ON COLUMN sla_breaches.resolved_at IS 'Cuando se resolvió la violación (ticket atendido o cancelado)';
