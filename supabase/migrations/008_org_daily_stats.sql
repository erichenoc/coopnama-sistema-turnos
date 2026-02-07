-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 008: Organization-level daily stats function
-- ============================================

-- Function to get daily stats aggregated per branch for an organization
-- Returns one row per branch with stats, allowing the frontend to sum totals
CREATE OR REPLACE FUNCTION get_org_daily_stats(
  p_organization_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE(
  branch_id UUID,
  branch_name TEXT,
  total_tickets BIGINT,
  completed_tickets BIGINT,
  waiting_tickets BIGINT,
  serving_tickets BIGINT,
  no_show_tickets BIGINT,
  cancelled_tickets BIGINT,
  avg_wait_time_seconds NUMERIC,
  avg_service_time_seconds NUMERIC,
  active_agents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS branch_id,
    b.name::TEXT AS branch_name,
    COALESCE(COUNT(t.id), 0)::BIGINT AS total_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'completed')::BIGINT AS completed_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'waiting')::BIGINT AS waiting_tickets,
    COUNT(t.id) FILTER (WHERE t.status IN ('called', 'serving'))::BIGINT AS serving_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'no_show')::BIGINT AS no_show_tickets,
    COUNT(t.id) FILTER (WHERE t.status = 'cancelled')::BIGINT AS cancelled_tickets,
    COALESCE(AVG(t.wait_time_seconds), 0)::NUMERIC AS avg_wait_time_seconds,
    COALESCE(AVG(t.service_time_seconds) FILTER (WHERE t.status = 'completed'), 0)::NUMERIC AS avg_service_time_seconds,
    (
      SELECT COUNT(*)::BIGINT
      FROM agent_sessions ags
      WHERE ags.branch_id = b.id
        AND ags.is_active = true
    ) AS active_agents
  FROM branches b
  LEFT JOIN tickets t
    ON t.branch_id = b.id
    AND t.created_at::date = p_date
  WHERE b.organization_id = p_organization_id
    AND b.is_active = true
  GROUP BY b.id, b.name
  ORDER BY b.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_org_daily_stats IS 'Obtiene estadísticas del día agrupadas por sucursal para toda la organización';
