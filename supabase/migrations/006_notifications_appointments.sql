-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 006: Notifications, Appointments, Push Subscriptions
-- ============================================

-- ============================================
-- NOTIFICATIONS TABLE
-- Log de todas las notificaciones enviadas
-- ============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,

  -- Destinatario
  recipient_phone TEXT,
  recipient_email TEXT,
  recipient_push_endpoint TEXT,

  -- Canal y contenido
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'push', 'email', 'in_app')),
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'ticket_created', 'ticket_called', 'ticket_reminder',
    'ticket_completed', 'appointment_reminder', 'appointment_confirmed',
    'custom'
  )),
  title TEXT,
  body TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  -- Estado de entrega
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  external_id TEXT, -- ID del proveedor (Twilio SID, n8n execution ID, etc.)
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_ticket ON notifications(ticket_id);
CREATE INDEX idx_notifications_member ON notifications(member_id);
CREATE INDEX idx_notifications_channel_status ON notifications(channel, status);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ============================================
-- PUSH SUBSCRIPTIONS TABLE
-- Suscripciones Web Push de navegadores
-- ============================================
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Web Push subscription data
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,

  -- Metadata
  device_type TEXT DEFAULT 'unknown', -- 'desktop', 'mobile', 'tablet'
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT push_sub_unique_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subs_member ON push_subscriptions(member_id) WHERE is_active = true;
CREATE INDEX idx_push_subs_user ON push_subscriptions(user_id) WHERE is_active = true;

-- ============================================
-- APPOINTMENT SLOTS TABLE
-- Horarios disponibles para citas
-- ============================================
CREATE TABLE appointment_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,

  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_appointments INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT slot_time_valid CHECK (end_time > start_time),
  CONSTRAINT slot_capacity_valid CHECK (booked_count <= max_appointments),
  CONSTRAINT slot_unique UNIQUE (branch_id, service_id, slot_date, start_time)
);

CREATE INDEX idx_slots_branch_date ON appointment_slots(branch_id, slot_date);
CREATE INDEX idx_slots_available ON appointment_slots(is_available, slot_date) WHERE is_available = true;

-- ============================================
-- APPOINTMENTS TABLE
-- Citas agendadas
-- ============================================
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES appointment_slots(id) ON DELETE SET NULL,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL, -- linked ticket when checked in

  -- Info del cliente
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_cedula TEXT,
  customer_email TEXT,

  -- Detalles de la cita
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  notes TEXT,

  -- Estado
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN (
    'pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'
  )),
  confirmation_code TEXT NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 6)),

  -- Recordatorios
  reminder_sent_at TIMESTAMPTZ,
  reminder_24h_sent BOOLEAN NOT NULL DEFAULT false,
  reminder_1h_sent BOOLEAN NOT NULL DEFAULT false,

  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_appointments_org ON appointments(organization_id);
CREATE INDEX idx_appointments_branch_date ON appointments(branch_id, appointment_date);
CREATE INDEX idx_appointments_member ON appointments(member_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_code ON appointments(confirmation_code);
CREATE INDEX idx_appointments_upcoming ON appointments(appointment_date, appointment_time)
  WHERE status IN ('confirmed', 'pending');

-- ============================================
-- HOLIDAYS TABLE
-- Dias no laborables
-- ============================================
CREATE TABLE holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE, -- NULL = aplica a toda la org

  holiday_date DATE NOT NULL,
  name TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false, -- aplica todos los anios

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT holiday_unique UNIQUE (organization_id, branch_id, holiday_date)
);

CREATE INDEX idx_holidays_org_date ON holidays(organization_id, holiday_date);

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER set_updated_at_push_subscriptions
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_appointments
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org notifications"
  ON notifications FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Push Subscriptions
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can manage push subscriptions"
  ON push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Appointment Slots
ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view available slots"
  ON appointment_slots FOR SELECT
  USING (is_available = true);

CREATE POLICY "Staff can manage slots"
  ON appointment_slots FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- Appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can create appointments"
  ON appointments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can view own appointment by code"
  ON appointments FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage org appointments"
  ON appointments FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- Holidays
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view holidays"
  ON holidays FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage holidays"
  ON holidays FOR ALL
  USING (organization_id = get_user_organization_id() AND user_has_role(ARRAY['admin', 'owner', 'superadmin']))
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Funcion para verificar si una fecha es dia laborable
CREATE OR REPLACE FUNCTION is_working_day(
  p_organization_id UUID,
  p_branch_id UUID,
  p_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_holiday BOOLEAN;
  v_day_of_week INTEGER;
  v_working_days INTEGER[];
BEGIN
  -- Check if holiday
  SELECT EXISTS(
    SELECT 1 FROM holidays
    WHERE organization_id = p_organization_id
      AND (branch_id IS NULL OR branch_id = p_branch_id)
      AND (holiday_date = p_date OR (is_recurring AND EXTRACT(MONTH FROM holiday_date) = EXTRACT(MONTH FROM p_date) AND EXTRACT(DAY FROM holiday_date) = EXTRACT(DAY FROM p_date)))
  ) INTO v_is_holiday;

  IF v_is_holiday THEN
    RETURN false;
  END IF;

  -- Check working days
  SELECT working_days INTO v_working_days
  FROM branches WHERE id = p_branch_id;

  v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER;

  RETURN v_day_of_week = ANY(v_working_days);
END;
$$ LANGUAGE plpgsql STABLE;

-- Funcion para generar slots de citas
CREATE OR REPLACE FUNCTION generate_appointment_slots(
  p_organization_id UUID,
  p_branch_id UUID,
  p_service_id UUID,
  p_date DATE,
  p_slot_duration_minutes INTEGER DEFAULT 30,
  p_max_per_slot INTEGER DEFAULT 1
) RETURNS SETOF appointment_slots AS $$
DECLARE
  v_opening TIME;
  v_closing TIME;
  v_current_time TIME;
  v_slot appointment_slots;
BEGIN
  -- Get branch hours
  SELECT opening_time, closing_time INTO v_opening, v_closing
  FROM branches WHERE id = p_branch_id;

  -- Verify working day
  IF NOT is_working_day(p_organization_id, p_branch_id, p_date) THEN
    RETURN;
  END IF;

  v_current_time := v_opening;

  WHILE v_current_time + (p_slot_duration_minutes || ' minutes')::INTERVAL <= v_closing LOOP
    INSERT INTO appointment_slots (
      organization_id, branch_id, service_id,
      slot_date, start_time, end_time, max_appointments
    ) VALUES (
      p_organization_id, p_branch_id, p_service_id,
      p_date, v_current_time, v_current_time + (p_slot_duration_minutes || ' minutes')::INTERVAL,
      p_max_per_slot
    )
    ON CONFLICT (branch_id, service_id, slot_date, start_time) DO NOTHING
    RETURNING * INTO v_slot;

    IF v_slot IS NOT NULL THEN
      RETURN NEXT v_slot;
    END IF;

    v_current_time := v_current_time + (p_slot_duration_minutes || ' minutes')::INTERVAL;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE notifications IS 'Log de notificaciones enviadas por todos los canales';
COMMENT ON TABLE push_subscriptions IS 'Suscripciones Web Push de navegadores';
COMMENT ON TABLE appointment_slots IS 'Horarios disponibles para citas';
COMMENT ON TABLE appointments IS 'Citas agendadas por clientes';
COMMENT ON TABLE holidays IS 'Dias no laborables por organizacion/sucursal';
COMMENT ON FUNCTION is_working_day IS 'Verifica si una fecha es dia laborable';
COMMENT ON FUNCTION generate_appointment_slots IS 'Genera slots de citas para un dia';
