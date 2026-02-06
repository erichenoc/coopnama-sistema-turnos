-- ============================================
-- COOPNAMA Sistema de Turnos
-- Seed Data: Initial data for testing
-- ============================================

-- Organización COOPNAMA
INSERT INTO organizations (id, name, slug, primary_color, secondary_color) VALUES
  ('00000000-0000-0000-0000-000000000001', 'COOPNAMA', 'coopnama', '#1e40af', '#10b981')
ON CONFLICT (slug) DO NOTHING;

-- Sucursal Santo Domingo Este
INSERT INTO branches (id, organization_id, name, code, address, city, phone, opening_time, closing_time) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Santo Domingo Este', 'SDE', 'Av. San Vicente de Paúl #123', 'Santo Domingo Este', '809-555-0100', '08:00', '17:00')
ON CONFLICT (organization_id, code) DO NOTHING;

-- Servicios
INSERT INTO services (id, organization_id, name, code, description, icon, color, category, avg_duration_minutes, sort_order) VALUES
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Préstamos', 'A', 'Solicitud, consulta y pago de préstamos', '💰', '#3b82f6', 'creditos', 15, 1),
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Caja', 'B', 'Depósitos, retiros y pagos', '💳', '#10b981', 'servicios', 8, 2),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Ahorros', 'C', 'Apertura y gestión de cuentas de ahorro', '🏦', '#8b5cf6', 'ahorros', 12, 3),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Atención General', 'D', 'Consultas y otros servicios', '📋', '#f59e0b', 'general', 10, 4)
ON CONFLICT (organization_id, code) DO NOTHING;

-- Ventanillas
INSERT INTO stations (id, branch_id, name, station_number, station_type, display_name) VALUES
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'Ventanilla 1', 1, 'general', 'Ventanilla 1'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'Ventanilla 2', 2, 'general', 'Ventanilla 2'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000002', 'Ventanilla 3', 3, 'general', 'Ventanilla 3'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000002', 'Ventanilla 4', 4, 'priority', 'Ventanilla 4 (Preferencial)')
ON CONFLICT (branch_id, station_number) DO NOTHING;

-- Branch Services (todos los servicios disponibles en la sucursal)
INSERT INTO branch_services (branch_id, service_id, is_active) VALUES
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', true),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', true),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', true),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000013', true)
ON CONFLICT (branch_id, service_id) DO NOTHING;

-- Station Services (qué servicios puede atender cada ventanilla)
INSERT INTO station_services (station_id, service_id) VALUES
  -- Ventanilla 1: Préstamos y Atención General
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000013'),
  -- Ventanilla 2: Caja
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011'),
  -- Ventanilla 3: Ahorros y Atención General
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000013'),
  -- Ventanilla 4 (Preferencial): Todos los servicios
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000013')
ON CONFLICT (station_id, service_id) DO NOTHING;

-- Miembros de ejemplo
INSERT INTO members (organization_id, cedula, full_name, first_name, last_name, phone, priority_level, priority_reason) VALUES
  ('00000000-0000-0000-0000-000000000001', '001-1234567-8', 'Juan Carlos Pérez', 'Juan Carlos', 'Pérez', '809-555-1001', 0, NULL),
  ('00000000-0000-0000-0000-000000000001', '001-2345678-9', 'María Elena García', 'María Elena', 'García', '809-555-1002', 1, 'senior'),
  ('00000000-0000-0000-0000-000000000001', '001-3456789-0', 'Carlos Manuel Rodríguez', 'Carlos Manuel', 'Rodríguez', '809-555-1003', 2, 'vip_member'),
  ('00000000-0000-0000-0000-000000000001', '001-4567890-1', 'Ana Isabel Martínez', 'Ana Isabel', 'Martínez', '809-555-1004', 0, NULL),
  ('00000000-0000-0000-0000-000000000001', '001-5678901-2', 'Pedro José Sánchez', 'Pedro José', 'Sánchez', '809-555-1005', 1, 'disability')
ON CONFLICT (organization_id, cedula) DO NOTHING;

-- Tickets de ejemplo (para el día actual)
-- Nota: Estos tickets son solo para demostración
DO $$
DECLARE
  v_org_id UUID := '00000000-0000-0000-0000-000000000001';
  v_branch_id UUID := '00000000-0000-0000-0000-000000000002';
BEGIN
  -- Solo insertar si no hay tickets para hoy
  IF NOT EXISTS (SELECT 1 FROM tickets WHERE branch_id = v_branch_id AND created_at::date = CURRENT_DATE) THEN
    -- Ticket en espera - Préstamos
    PERFORM create_ticket(v_org_id, v_branch_id, '00000000-0000-0000-0000-000000000010', 'Juan Pérez', '001-1234567-8', '809-555-1001', 0, NULL, 'kiosk');

    -- Ticket en espera - Caja (preferencial)
    PERFORM create_ticket(v_org_id, v_branch_id, '00000000-0000-0000-0000-000000000011', 'María García', '001-2345678-9', '809-555-1002', 1, 'senior', 'kiosk');

    -- Ticket en espera - Ahorros (VIP)
    PERFORM create_ticket(v_org_id, v_branch_id, '00000000-0000-0000-0000-000000000012', 'Carlos Rodríguez', '001-3456789-0', '809-555-1003', 2, 'vip_member', 'kiosk');

    -- Ticket en espera - Caja
    PERFORM create_ticket(v_org_id, v_branch_id, '00000000-0000-0000-0000-000000000011', 'Ana Martínez', '001-4567890-1', '809-555-1004', 0, NULL, 'kiosk');

    -- Ticket en espera - Atención General
    PERFORM create_ticket(v_org_id, v_branch_id, '00000000-0000-0000-0000-000000000013', 'Pedro Sánchez', '001-5678901-2', '809-555-1005', 1, 'disability', 'kiosk');
  END IF;
END $$;
