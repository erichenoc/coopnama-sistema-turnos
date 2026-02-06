-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 004: Functions and Procedures
-- ============================================

-- Función para generar número de ticket
CREATE OR REPLACE FUNCTION generate_ticket_number(
  p_branch_id UUID,
  p_service_id UUID
) RETURNS TABLE(ticket_number TEXT, daily_sequence INTEGER) AS $$
DECLARE
  v_service_code CHAR(1);
  v_next_number INTEGER;
BEGIN
  -- Obtener código del servicio
  SELECT code INTO v_service_code FROM services WHERE id = p_service_id;

  IF v_service_code IS NULL THEN
    RAISE EXCEPTION 'Service not found: %', p_service_id;
  END IF;

  -- Incrementar contador atómicamente (INSERT o UPDATE)
  INSERT INTO daily_counters (branch_id, service_id, counter_date, last_number)
  VALUES (p_branch_id, p_service_id, CURRENT_DATE, 1)
  ON CONFLICT (branch_id, service_id, counter_date)
  DO UPDATE SET last_number = daily_counters.last_number + 1
  RETURNING daily_counters.last_number INTO v_next_number;

  -- Retornar número formateado (ej: A-001, B-042)
  RETURN QUERY SELECT
    v_service_code || '-' || LPAD(v_next_number::TEXT, 3, '0'),
    v_next_number;
END;
$$ LANGUAGE plpgsql;

-- Función para crear un nuevo ticket
CREATE OR REPLACE FUNCTION create_ticket(
  p_organization_id UUID,
  p_branch_id UUID,
  p_service_id UUID,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_cedula TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_priority INTEGER DEFAULT 0,
  p_priority_reason TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'kiosk',
  p_member_id UUID DEFAULT NULL
) RETURNS tickets AS $$
DECLARE
  v_ticket_number TEXT;
  v_daily_sequence INTEGER;
  v_new_ticket tickets;
BEGIN
  -- Generar número de ticket
  SELECT * INTO v_ticket_number, v_daily_sequence
  FROM generate_ticket_number(p_branch_id, p_service_id);

  -- Insertar ticket
  INSERT INTO tickets (
    organization_id,
    branch_id,
    service_id,
    member_id,
    ticket_number,
    daily_sequence,
    customer_name,
    customer_cedula,
    customer_phone,
    priority,
    priority_reason,
    source,
    status
  ) VALUES (
    p_organization_id,
    p_branch_id,
    p_service_id,
    p_member_id,
    v_ticket_number,
    v_daily_sequence,
    p_customer_name,
    p_customer_cedula,
    p_customer_phone,
    p_priority,
    p_priority_reason,
    p_source,
    'waiting'
  ) RETURNING * INTO v_new_ticket;

  -- Registrar en historial
  INSERT INTO ticket_history (ticket_id, new_status, notes)
  VALUES (v_new_ticket.id, 'waiting', 'Ticket creado desde ' || p_source);

  RETURN v_new_ticket;
END;
$$ LANGUAGE plpgsql;

-- Función para llamar el siguiente turno
CREATE OR REPLACE FUNCTION call_next_ticket(
  p_station_id UUID,
  p_agent_id UUID
) RETURNS tickets AS $$
DECLARE
  v_branch_id UUID;
  v_next_ticket tickets;
  v_service_ids UUID[];
BEGIN
  -- Obtener branch_id de la estación
  SELECT branch_id INTO v_branch_id FROM stations WHERE id = p_station_id;

  -- Obtener servicios que el agente puede atender
  SELECT ARRAY_AGG(service_id) INTO v_service_ids
  FROM user_services WHERE user_id = p_agent_id;

  -- Si el agente no tiene servicios asignados, puede atender todos
  IF v_service_ids IS NULL OR array_length(v_service_ids, 1) = 0 THEN
    SELECT ARRAY_AGG(service_id) INTO v_service_ids
    FROM station_services WHERE station_id = p_station_id;
  END IF;

  -- Buscar el siguiente ticket (prioridad DESC, luego created_at ASC)
  SELECT * INTO v_next_ticket
  FROM tickets
  WHERE branch_id = v_branch_id
    AND status = 'waiting'
    AND (v_service_ids IS NULL OR service_id = ANY(v_service_ids))
  ORDER BY priority DESC, created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_next_ticket IS NULL THEN
    RETURN NULL;
  END IF;

  -- Actualizar ticket
  UPDATE tickets
  SET
    status = 'called',
    station_id = p_station_id,
    agent_id = p_agent_id,
    called_at = now(),
    wait_time_seconds = EXTRACT(EPOCH FROM (now() - created_at))::INTEGER
  WHERE id = v_next_ticket.id
  RETURNING * INTO v_next_ticket;

  -- Registrar en historial
  INSERT INTO ticket_history (ticket_id, previous_status, new_status, changed_by, station_id, notes)
  VALUES (v_next_ticket.id, 'waiting', 'called', p_agent_id, p_station_id, 'Llamado a ventanilla');

  RETURN v_next_ticket;
END;
$$ LANGUAGE plpgsql;

-- Función para iniciar atención
CREATE OR REPLACE FUNCTION start_serving_ticket(
  p_ticket_id UUID,
  p_agent_id UUID
) RETURNS tickets AS $$
DECLARE
  v_ticket tickets;
BEGIN
  UPDATE tickets
  SET
    status = 'serving',
    started_at = now()
  WHERE id = p_ticket_id
    AND status = 'called'
  RETURNING * INTO v_ticket;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or not in called status';
  END IF;

  -- Registrar en historial
  INSERT INTO ticket_history (ticket_id, previous_status, new_status, changed_by, station_id, notes)
  VALUES (v_ticket.id, 'called', 'serving', p_agent_id, v_ticket.station_id, 'Iniciando atención');

  RETURN v_ticket;
END;
$$ LANGUAGE plpgsql;

-- Función para completar atención
CREATE OR REPLACE FUNCTION complete_ticket(
  p_ticket_id UUID,
  p_agent_id UUID,
  p_notes TEXT DEFAULT NULL
) RETURNS tickets AS $$
DECLARE
  v_ticket tickets;
BEGIN
  UPDATE tickets
  SET
    status = 'completed',
    completed_at = now(),
    service_time_seconds = EXTRACT(EPOCH FROM (now() - started_at))::INTEGER,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_ticket_id
    AND status = 'serving'
  RETURNING * INTO v_ticket;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or not in serving status';
  END IF;

  -- Registrar en historial
  INSERT INTO ticket_history (ticket_id, previous_status, new_status, changed_by, station_id, notes)
  VALUES (v_ticket.id, 'serving', 'completed', p_agent_id, v_ticket.station_id, COALESCE(p_notes, 'Atención completada'));

  -- Actualizar contador de la sesión del agente
  UPDATE agent_sessions
  SET
    tickets_served = tickets_served + 1,
    total_service_time_seconds = total_service_time_seconds + COALESCE(v_ticket.service_time_seconds, 0)
  WHERE agent_id = p_agent_id
    AND station_id = v_ticket.station_id
    AND is_active = true;

  -- Actualizar visitas del miembro si existe
  IF v_ticket.member_id IS NOT NULL THEN
    UPDATE members
    SET
      total_visits = total_visits + 1,
      last_visit_at = now()
    WHERE id = v_ticket.member_id;
  END IF;

  RETURN v_ticket;
END;
$$ LANGUAGE plpgsql;

-- Función para marcar no-show
CREATE OR REPLACE FUNCTION mark_ticket_no_show(
  p_ticket_id UUID,
  p_agent_id UUID
) RETURNS tickets AS $$
DECLARE
  v_ticket tickets;
BEGIN
  UPDATE tickets
  SET
    status = 'no_show',
    completed_at = now(),
    recall_count = recall_count + 1
  WHERE id = p_ticket_id
    AND status IN ('called', 'serving')
  RETURNING * INTO v_ticket;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or invalid status';
  END IF;

  -- Registrar en historial
  INSERT INTO ticket_history (ticket_id, previous_status, new_status, changed_by, station_id, notes)
  VALUES (v_ticket.id, 'called', 'no_show', p_agent_id, v_ticket.station_id, 'Cliente no se presentó');

  RETURN v_ticket;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas del día
CREATE OR REPLACE FUNCTION get_daily_stats(
  p_branch_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
  total_tickets BIGINT,
  completed_tickets BIGINT,
  waiting_tickets BIGINT,
  serving_tickets BIGINT,
  no_show_tickets BIGINT,
  cancelled_tickets BIGINT,
  avg_wait_time_seconds NUMERIC,
  avg_service_time_seconds NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_tickets,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_tickets,
    COUNT(*) FILTER (WHERE status = 'waiting')::BIGINT as waiting_tickets,
    COUNT(*) FILTER (WHERE status IN ('called', 'serving'))::BIGINT as serving_tickets,
    COUNT(*) FILTER (WHERE status = 'no_show')::BIGINT as no_show_tickets,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_tickets,
    AVG(wait_time_seconds)::NUMERIC as avg_wait_time_seconds,
    AVG(service_time_seconds) FILTER (WHERE status = 'completed')::NUMERIC as avg_service_time_seconds
  FROM tickets
  WHERE branch_id = p_branch_id
    AND created_at::date = p_date;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener cola activa
CREATE OR REPLACE FUNCTION get_active_queue(
  p_branch_id UUID
) RETURNS SETOF tickets AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM tickets
  WHERE branch_id = p_branch_id
    AND status IN ('waiting', 'called', 'serving')
    AND created_at::date = CURRENT_DATE
  ORDER BY
    CASE status
      WHEN 'serving' THEN 1
      WHEN 'called' THEN 2
      WHEN 'waiting' THEN 3
    END,
    priority DESC,
    created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON FUNCTION generate_ticket_number IS 'Genera un número de ticket único para el día (ej: A-001)';
COMMENT ON FUNCTION create_ticket IS 'Crea un nuevo ticket en la cola';
COMMENT ON FUNCTION call_next_ticket IS 'Llama al siguiente ticket de la cola';
COMMENT ON FUNCTION start_serving_ticket IS 'Inicia la atención de un ticket llamado';
COMMENT ON FUNCTION complete_ticket IS 'Marca un ticket como completado';
COMMENT ON FUNCTION mark_ticket_no_show IS 'Marca un ticket como no-show';
COMMENT ON FUNCTION get_daily_stats IS 'Obtiene estadísticas del día para una sucursal';
COMMENT ON FUNCTION get_active_queue IS 'Obtiene la cola activa de una sucursal';
