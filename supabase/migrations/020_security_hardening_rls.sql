-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 020: Security Hardening - RLS Policies & Function search_path
-- ============================================
-- Purpose:
--   1. Fix overly permissive RLS policies (WITH CHECK (true))
--   2. Set search_path on SECURITY DEFINER functions to prevent attacks
--   3. Ensure all INSERT/UPDATE policies validate organization membership
--   4. Maintain kiosk functionality (anon users can create tickets)
-- ============================================

-- ============================================
-- PART 1: FIX OVERLY PERMISSIVE POLICIES
-- ============================================

-- --------------------------------------------
-- ORGANIZATIONS
-- --------------------------------------------
-- Only authenticated users can insert organizations
DROP POLICY IF EXISTS "Anyone can insert organizations" ON organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- --------------------------------------------
-- BRANCHES
-- --------------------------------------------
-- Replace the "FOR ALL" policy that has WITH CHECK (true)
DROP POLICY IF EXISTS "Admins can manage branches" ON branches;

-- Separate policies for better granularity
CREATE POLICY "Admins can insert branches"
  ON branches FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

CREATE POLICY "Admins can update branches"
  ON branches FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

CREATE POLICY "Admins can delete branches"
  ON branches FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

-- --------------------------------------------
-- SERVICES
-- --------------------------------------------
DROP POLICY IF EXISTS "Admins can manage services" ON services;

CREATE POLICY "Admins can insert services"
  ON services FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

CREATE POLICY "Admins can update services"
  ON services FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

CREATE POLICY "Admins can delete services"
  ON services FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

-- --------------------------------------------
-- STATIONS
-- --------------------------------------------
DROP POLICY IF EXISTS "Managers can manage stations" ON stations;

CREATE POLICY "Managers can insert stations"
  ON stations FOR INSERT TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Managers can update stations"
  ON stations FOR UPDATE TO authenticated
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  )
  WITH CHECK (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Managers can delete stations"
  ON stations FOR DELETE TO authenticated
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- --------------------------------------------
-- MEMBERS
-- --------------------------------------------
DROP POLICY IF EXISTS "Staff can manage members" ON members;

CREATE POLICY "Staff can insert members"
  ON members FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent', 'receptionist'])
  );

CREATE POLICY "Staff can update members"
  ON members FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent', 'receptionist'])
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent', 'receptionist'])
  );

CREATE POLICY "Staff can delete members"
  ON members FOR DELETE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent', 'receptionist'])
  );

-- --------------------------------------------
-- TICKETS
-- --------------------------------------------
-- Keep INSERT permissive for kiosk but validate branch exists and is active
DROP POLICY IF EXISTS "Anyone can create tickets" ON tickets;
CREATE POLICY "Anyone can create tickets with valid branch"
  ON tickets FOR INSERT
  WITH CHECK (
    branch_id IN (SELECT id FROM branches WHERE is_active = true)
  );

-- UPDATE: Only authenticated staff from the same org
DROP POLICY IF EXISTS "Agents can update tickets" ON tickets;
CREATE POLICY "Org staff can update tickets"
  ON tickets FOR UPDATE TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent'])
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent'])
  );

-- --------------------------------------------
-- AGENT_SESSIONS
-- --------------------------------------------
DROP POLICY IF EXISTS "Agents can manage own sessions" ON agent_sessions;

CREATE POLICY "Agents can insert own sessions"
  ON agent_sessions FOR INSERT TO authenticated
  WITH CHECK (
    agent_id = auth.uid()
    OR user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor'])
  );

CREATE POLICY "Agents can update own sessions"
  ON agent_sessions FOR UPDATE TO authenticated
  USING (
    agent_id = auth.uid()
    OR user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor'])
  )
  WITH CHECK (
    agent_id = auth.uid()
    OR user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor'])
  );

CREATE POLICY "Agents can delete own sessions"
  ON agent_sessions FOR DELETE TO authenticated
  USING (
    agent_id = auth.uid()
    OR user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor'])
  );

-- --------------------------------------------
-- BRANCH_SERVICES
-- --------------------------------------------
DROP POLICY IF EXISTS "Admins can manage branch_services" ON branch_services;

CREATE POLICY "Admins can insert branch_services"
  ON branch_services FOR INSERT TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Admins can update branch_services"
  ON branch_services FOR UPDATE TO authenticated
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  )
  WITH CHECK (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Admins can delete branch_services"
  ON branch_services FOR DELETE TO authenticated
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- --------------------------------------------
-- STATION_SERVICES
-- --------------------------------------------
DROP POLICY IF EXISTS "Admins can manage station_services" ON station_services;

CREATE POLICY "Admins can insert station_services"
  ON station_services FOR INSERT TO authenticated
  WITH CHECK (
    station_id IN (
      SELECT s.id FROM stations s
      JOIN branches b ON s.branch_id = b.id
      WHERE b.organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Admins can update station_services"
  ON station_services FOR UPDATE TO authenticated
  USING (
    station_id IN (
      SELECT s.id FROM stations s
      JOIN branches b ON s.branch_id = b.id
      WHERE b.organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  )
  WITH CHECK (
    station_id IN (
      SELECT s.id FROM stations s
      JOIN branches b ON s.branch_id = b.id
      WHERE b.organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Admins can delete station_services"
  ON station_services FOR DELETE TO authenticated
  USING (
    station_id IN (
      SELECT s.id FROM stations s
      JOIN branches b ON s.branch_id = b.id
      WHERE b.organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- --------------------------------------------
-- USER_SERVICES
-- --------------------------------------------
DROP POLICY IF EXISTS "Admins can manage user_services" ON user_services;

CREATE POLICY "Admins can insert user_services"
  ON user_services FOR INSERT TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Admins can update user_services"
  ON user_services FOR UPDATE TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Admins can delete user_services"
  ON user_services FOR DELETE TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- --------------------------------------------
-- DAILY_COUNTERS
-- --------------------------------------------
-- This table needs public access for ticket generation but should validate branch
DROP POLICY IF EXISTS "Public can manage counters" ON daily_counters;

-- Public can read/insert/update for active branches (kiosk ticket generation)
CREATE POLICY "Public can view counters for active branches"
  ON daily_counters FOR SELECT
  USING (
    branch_id IN (SELECT id FROM branches WHERE is_active = true)
  );

CREATE POLICY "Public can insert counters for active branches"
  ON daily_counters FOR INSERT
  WITH CHECK (
    branch_id IN (SELECT id FROM branches WHERE is_active = true)
  );

CREATE POLICY "Public can update counters for active branches"
  ON daily_counters FOR UPDATE
  USING (
    branch_id IN (SELECT id FROM branches WHERE is_active = true)
  )
  WITH CHECK (
    branch_id IN (SELECT id FROM branches WHERE is_active = true)
  );

-- --------------------------------------------
-- TICKET_HISTORY
-- --------------------------------------------
-- Tighten the system insert policy - validate ticket belongs to valid org
DROP POLICY IF EXISTS "System can insert history" ON ticket_history;
CREATE POLICY "System can insert history for valid tickets"
  ON ticket_history FOR INSERT
  WITH CHECK (
    ticket_id IN (SELECT id FROM tickets)
  );

-- --------------------------------------------
-- NOTIFICATIONS (Migration 006)
-- --------------------------------------------
-- Tighten system insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications for valid org"
  ON notifications FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT id FROM organizations)
  );

-- --------------------------------------------
-- PUSH_SUBSCRIPTIONS (Migration 006)
-- --------------------------------------------
-- Replace overly permissive policy
DROP POLICY IF EXISTS "Public can manage push subscriptions" ON push_subscriptions;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (
    (user_id = auth.uid())
    OR (user_id IS NULL AND member_id IS NOT NULL)
  );

CREATE POLICY "Users can view own push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    (user_id = auth.uid())
    OR (member_id IS NOT NULL)
    OR (organization_id = get_user_organization_id())
  );

CREATE POLICY "Users can update own push subscriptions"
  ON push_subscriptions FOR UPDATE
  USING (
    (user_id = auth.uid())
    OR (organization_id = get_user_organization_id() AND user_has_role(ARRAY['admin', 'owner', 'superadmin']))
  )
  WITH CHECK (
    (user_id = auth.uid())
    OR (organization_id = get_user_organization_id() AND user_has_role(ARRAY['admin', 'owner', 'superadmin']))
  );

CREATE POLICY "Users can delete own push subscriptions"
  ON push_subscriptions FOR DELETE
  USING (
    (user_id = auth.uid())
    OR (organization_id = get_user_organization_id() AND user_has_role(ARRAY['admin', 'owner', 'superadmin']))
  );

-- --------------------------------------------
-- APPOINTMENTS (Migration 006)
-- --------------------------------------------
-- Tighten the public insert policy
DROP POLICY IF EXISTS "Public can create appointments" ON appointments;
CREATE POLICY "Public can create appointments for active branches"
  ON appointments FOR INSERT
  WITH CHECK (
    branch_id IN (SELECT id FROM branches WHERE is_active = true)
  );

-- --------------------------------------------
-- APPOINTMENT_SLOTS (Migration 006)
-- --------------------------------------------
-- Already has proper WITH CHECK in migration 006, but let's make it explicit
DROP POLICY IF EXISTS "Staff can manage slots" ON appointment_slots;

CREATE POLICY "Staff can insert slots"
  ON appointment_slots FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
  );

CREATE POLICY "Staff can update slots"
  ON appointment_slots FOR UPDATE TO authenticated
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Staff can delete slots"
  ON appointment_slots FOR DELETE TO authenticated
  USING (organization_id = get_user_organization_id());

-- NOTE: sla_configs, priority_rules, sla_breaches tables do not exist yet.
-- When those tables are created, add restrictive RLS policies for them.

-- ============================================
-- PART 2: FIX MUTABLE search_path ON SECURITY DEFINER FUNCTIONS
-- ============================================
-- All SECURITY DEFINER functions must have search_path set to prevent attacks
-- Reference: https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY

-- --------------------------------------------
-- Helper functions from Migration 005
-- --------------------------------------------
ALTER FUNCTION get_user_organization_id() SET search_path = public, pg_temp;
ALTER FUNCTION get_user_branch_id() SET search_path = public, pg_temp;
ALTER FUNCTION user_has_role(TEXT[]) SET search_path = public, pg_temp;

-- --------------------------------------------
-- Ticket management functions from Migration 004
-- --------------------------------------------
ALTER FUNCTION generate_ticket_number(UUID, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION create_ticket(UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION call_next_ticket(UUID, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION start_serving_ticket(UUID, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION complete_ticket(UUID, UUID, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION mark_ticket_no_show(UUID, UUID) SET search_path = public, pg_temp;
ALTER FUNCTION get_daily_stats(UUID, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION get_active_queue(UUID) SET search_path = public, pg_temp;

-- --------------------------------------------
-- Helper function from Migration 003
-- --------------------------------------------
ALTER FUNCTION ticket_date(TIMESTAMPTZ) SET search_path = public, pg_temp;

-- --------------------------------------------
-- Appointment functions from Migration 006
-- --------------------------------------------
ALTER FUNCTION is_working_day(UUID, UUID, DATE) SET search_path = public, pg_temp;
ALTER FUNCTION generate_appointment_slots(UUID, UUID, UUID, DATE, INTEGER, INTEGER) SET search_path = public, pg_temp;

-- --------------------------------------------
-- Organization stats from Migration 008
-- --------------------------------------------
ALTER FUNCTION get_org_daily_stats(UUID, DATE) SET search_path = public, pg_temp;

-- ============================================
-- PART 3: FIX SECURITY DEFINER VIEWS
-- ============================================
-- These views bypass RLS because they run as the view owner (SECURITY DEFINER).
-- Change to SECURITY INVOKER so they respect the calling user's RLS policies.

ALTER VIEW IF EXISTS service_demand_heatmap SET (security_invoker = true);
ALTER VIEW IF EXISTS agent_performance SET (security_invoker = true);
ALTER VIEW IF EXISTS csat_summary SET (security_invoker = true);

-- ============================================
-- VERIFICATION QUERIES (FOR TESTING)
-- ============================================
-- Run these after migration to verify security:

-- 1. Check for tables without RLS enabled:
-- SELECT schemaname, tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename NOT IN (
--     SELECT tablename FROM pg_policies
--   );

-- 2. Check for policies with WITH CHECK (true):
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND with_check = 'true';

-- 3. Check for SECURITY DEFINER functions without search_path:
-- SELECT n.nspname, p.proname
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public'
--   AND p.prosecdef = true
--   AND NOT EXISTS (
--     SELECT 1 FROM pg_proc_config WHERE prooid = p.oid
--   );

-- End of security hardening migration
