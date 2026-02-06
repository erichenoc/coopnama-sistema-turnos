-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 002: Users and Members
-- ============================================

-- members (socios/clientes de la cooperativa)
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  cedula TEXT,
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  member_number TEXT, -- Número de socio interno
  priority_level INTEGER DEFAULT 0 CHECK (priority_level BETWEEN 0 AND 2), -- 0=normal, 1=preferencial, 2=VIP
  priority_reason TEXT, -- 'senior', 'pregnant', 'disability', 'vip_member'
  date_of_birth DATE,
  notes TEXT,
  total_visits INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, cedula)
);

-- users (empleados del sistema - vinculados a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  role TEXT NOT NULL CHECK (role IN (
    'superadmin',      -- Administrador de plataforma
    'owner',           -- Dueño de organización
    'admin',           -- Administrador de organización
    'branch_manager',  -- Gerente de sucursal
    'supervisor',      -- Supervisor
    'agent',           -- Agente de atención
    'receptionist',    -- Recepcionista
    'kiosk'            -- Usuario de kiosko
  )),
  full_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  employee_id TEXT, -- ID de empleado interno
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- user_services (qué servicios puede atender cada agente)
CREATE TABLE IF NOT EXISTS user_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, service_id)
);

-- Triggers para updated_at
CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS idx_members_organization ON members(organization_id);
CREATE INDEX IF NOT EXISTS idx_members_cedula ON members(cedula);
CREATE INDEX IF NOT EXISTS idx_members_phone ON members(phone);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Comentarios
COMMENT ON TABLE members IS 'Socios/clientes de la cooperativa';
COMMENT ON TABLE users IS 'Empleados del sistema, vinculados a Supabase Auth';
COMMENT ON TABLE user_services IS 'Servicios que puede atender cada agente';
COMMENT ON COLUMN members.priority_level IS '0=normal, 1=preferencial (adultos mayores, embarazadas, discapacidad), 2=VIP';
COMMENT ON COLUMN users.role IS 'Rol del usuario en el sistema';
