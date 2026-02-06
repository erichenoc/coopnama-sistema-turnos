-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 001: Base Tables
-- ============================================

-- organizations (cooperativas/empresas)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#1e40af',
  secondary_color TEXT DEFAULT '#10b981',
  timezone TEXT DEFAULT 'America/Santo_Domingo',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- branches (sucursales)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  city TEXT,
  phone TEXT,
  email TEXT,
  opening_time TIME DEFAULT '08:00',
  closing_time TIME DEFAULT '17:00',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 1=Monday, 7=Sunday
  max_capacity_per_hour INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- services (tipos de servicio: Préstamos, Caja, Ahorros, etc.)
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code CHAR(1) NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#3b82f6',
  category TEXT DEFAULT 'general' CHECK (category IN ('creditos', 'ahorros', 'servicios', 'general')),
  avg_duration_minutes INTEGER DEFAULT 10,
  requires_appointment BOOLEAN DEFAULT false,
  requires_member_id BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, code)
);

-- stations (ventanillas)
CREATE TABLE IF NOT EXISTS stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  station_number INTEGER NOT NULL,
  station_type TEXT DEFAULT 'general' CHECK (station_type IN ('general', 'priority', 'specialized')),
  display_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, station_number)
);

-- branch_services (qué servicios están disponibles en cada sucursal)
CREATE TABLE IF NOT EXISTS branch_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  custom_avg_duration INTEGER, -- Override del avg_duration del servicio
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, service_id)
);

-- station_services (qué servicios puede atender cada ventanilla)
CREATE TABLE IF NOT EXISTS station_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(station_id, service_id)
);

-- Triggers para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stations_updated_at
  BEFORE UPDATE ON stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE organizations IS 'Cooperativas y empresas que usan el sistema';
COMMENT ON TABLE branches IS 'Sucursales/oficinas de cada organización';
COMMENT ON TABLE services IS 'Tipos de servicio disponibles (Préstamos, Caja, Ahorros, etc.)';
COMMENT ON TABLE stations IS 'Ventanillas de atención en cada sucursal';
COMMENT ON TABLE branch_services IS 'Relación de servicios disponibles por sucursal';
COMMENT ON TABLE station_services IS 'Relación de servicios que puede atender cada ventanilla';
