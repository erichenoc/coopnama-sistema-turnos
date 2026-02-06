-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 005: Row Level Security Policies
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Función para obtener organization_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Función para obtener branch_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_branch_id()
RETURNS UUID AS $$
  SELECT branch_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Función para verificar rol del usuario
CREATE OR REPLACE FUNCTION user_has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = ANY(required_roles)
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

-- Usuarios autenticados pueden ver su propia organización
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = get_user_organization_id());

-- Solo superadmin y owner pueden modificar
CREATE POLICY "Owners can update organization"
  ON organizations FOR UPDATE
  USING (
    id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner'])
  );

-- ============================================
-- BRANCHES POLICIES
-- ============================================

-- Usuarios pueden ver branches de su organización
CREATE POLICY "Users can view org branches"
  ON branches FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Admins pueden gestionar branches
CREATE POLICY "Admins can manage branches"
  ON branches FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

-- ============================================
-- SERVICES POLICIES
-- ============================================

-- Usuarios pueden ver servicios de su organización
CREATE POLICY "Users can view org services"
  ON services FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Admins pueden gestionar servicios
CREATE POLICY "Admins can manage services"
  ON services FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

-- PÚBLICO: Servicios activos visibles para kiosk/TV (anon users)
CREATE POLICY "Public can view active services"
  ON services FOR SELECT
  USING (is_active = true);

-- ============================================
-- STATIONS POLICIES
-- ============================================

-- Usuarios pueden ver estaciones de su organización
CREATE POLICY "Users can view branch stations"
  ON stations FOR SELECT
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
  );

-- Managers pueden gestionar estaciones
CREATE POLICY "Managers can manage stations"
  ON stations FOR ALL
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- PÚBLICO: Estaciones activas visibles para TV display
CREATE POLICY "Public can view active stations"
  ON stations FOR SELECT
  USING (is_active = true);

-- ============================================
-- MEMBERS POLICIES
-- ============================================

-- Usuarios pueden ver miembros de su organización
CREATE POLICY "Users can view org members"
  ON members FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Staff puede crear/actualizar miembros
CREATE POLICY "Staff can manage members"
  ON members FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent', 'receptionist'])
  );

-- ============================================
-- USERS POLICIES
-- ============================================

-- Usuarios pueden ver otros usuarios de su organización
CREATE POLICY "Users can view org users"
  ON users FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Usuario puede actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Admins pueden gestionar usuarios
CREATE POLICY "Admins can manage users"
  ON users FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin'])
  );

-- ============================================
-- TICKETS POLICIES
-- ============================================

-- PÚBLICO: Cualquiera puede crear tickets (kiosk, web, etc.)
CREATE POLICY "Anyone can create tickets"
  ON tickets FOR INSERT
  WITH CHECK (true);

-- PÚBLICO: Tickets activos visibles para TV display
CREATE POLICY "Public can view active tickets"
  ON tickets FOR SELECT
  USING (status IN ('waiting', 'called', 'serving'));

-- Usuarios autenticados pueden ver todos los tickets de su organización
CREATE POLICY "Users can view org tickets"
  ON tickets FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Agentes pueden actualizar tickets
CREATE POLICY "Agents can update tickets"
  ON tickets FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor', 'agent'])
  );

-- ============================================
-- TICKET_HISTORY POLICIES
-- ============================================

-- Usuarios pueden ver historial de tickets de su organización
CREATE POLICY "Users can view ticket history"
  ON ticket_history FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM tickets WHERE organization_id = get_user_organization_id()
    )
  );

-- Sistema puede insertar historial
CREATE POLICY "System can insert history"
  ON ticket_history FOR INSERT
  WITH CHECK (true);

-- ============================================
-- DAILY_COUNTERS POLICIES
-- ============================================

-- Acceso público para crear tickets (necesario para generar números)
CREATE POLICY "Public can manage counters"
  ON daily_counters FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- AGENT_SESSIONS POLICIES
-- ============================================

-- Usuarios pueden ver sesiones de su branch
CREATE POLICY "Users can view branch sessions"
  ON agent_sessions FOR SELECT
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
  );

-- Agentes pueden gestionar sus propias sesiones
CREATE POLICY "Agents can manage own sessions"
  ON agent_sessions FOR ALL
  USING (
    agent_id = auth.uid()
    OR user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager', 'supervisor'])
  );

-- ============================================
-- BRANCH_SERVICES & STATION_SERVICES POLICIES
-- ============================================

CREATE POLICY "Users can view branch_services"
  ON branch_services FOR SELECT
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Public can view branch_services"
  ON branch_services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage branch_services"
  ON branch_services FOR ALL
  USING (
    branch_id IN (
      SELECT id FROM branches WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

CREATE POLICY "Users can view station_services"
  ON station_services FOR SELECT
  USING (
    station_id IN (
      SELECT s.id FROM stations s
      JOIN branches b ON s.branch_id = b.id
      WHERE b.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Admins can manage station_services"
  ON station_services FOR ALL
  USING (
    station_id IN (
      SELECT s.id FROM stations s
      JOIN branches b ON s.branch_id = b.id
      WHERE b.organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- ============================================
-- USER_SERVICES POLICIES
-- ============================================

CREATE POLICY "Users can view user_services"
  ON user_services FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "Admins can manage user_services"
  ON user_services FOR ALL
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id = get_user_organization_id()
    )
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================

-- Habilitar realtime para tickets (para TV display y dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE agent_sessions;
