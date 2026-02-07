-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 010: Knowledge Base System
-- ============================================

-- ============================================
-- TABLAS
-- ============================================

-- knowledge_base: Base de conocimiento para copilot de agentes
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contenido
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',

  -- Estado
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ÍNDICES
-- ============================================

-- Búsqueda por organización
CREATE INDEX IF NOT EXISTS idx_knowledge_base_organization ON knowledge_base(organization_id);

-- Búsqueda por organización y categoría
CREATE INDEX IF NOT EXISTS idx_knowledge_base_org_category ON knowledge_base(organization_id, category);

-- Búsqueda por organización y estado (activos)
CREATE INDEX IF NOT EXISTS idx_knowledge_base_org_active ON knowledge_base(organization_id, is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- ============================================
-- KNOWLEDGE_BASE POLICIES
-- ============================================

-- Usuarios pueden ver entradas de base de conocimiento de su organización
CREATE POLICY "Users can view org knowledge_base"
  ON knowledge_base FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Admins pueden gestionar entradas de base de conocimiento
CREATE POLICY "Admins can manage knowledge_base"
  ON knowledge_base FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE knowledge_base IS 'Base de conocimiento para copilot de agentes de atención';

COMMENT ON COLUMN knowledge_base.organization_id IS 'ID de la organización propietaria de la entrada';
COMMENT ON COLUMN knowledge_base.title IS 'Título o nombre de la entrada de conocimiento';
COMMENT ON COLUMN knowledge_base.content IS 'Contenido completo de la entrada';
COMMENT ON COLUMN knowledge_base.category IS 'Categoría de la entrada (ej: general, faq, procedimiento, politica)';
COMMENT ON COLUMN knowledge_base.tags IS 'Etiquetas para búsqueda y clasificación';
COMMENT ON COLUMN knowledge_base.is_active IS 'Si true, la entrada está disponible para el copilot';
