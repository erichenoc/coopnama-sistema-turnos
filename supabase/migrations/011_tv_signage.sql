-- ============================================
-- COOPNAMA Sistema de Turnos
-- Migration 011: TV Digital Signage Content
-- ============================================

-- signage_content: Content for TV displays between ticket calls
CREATE TABLE IF NOT EXISTS signage_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,

  -- Content
  content_type TEXT NOT NULL CHECK (content_type IN ('image','text','video','html')),
  title TEXT,
  content_url TEXT,
  content_text TEXT,

  -- Display settings
  display_duration_seconds INTEGER DEFAULT 10,
  sort_order INTEGER DEFAULT 0,

  -- Scheduling
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_signage_content_updated_at
  BEFORE UPDATE ON signage_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_signage_content_org ON signage_content(organization_id);
CREATE INDEX IF NOT EXISTS idx_signage_content_org_branch ON signage_content(organization_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_signage_content_active ON signage_content(organization_id, is_active) WHERE is_active = true;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE signage_content ENABLE ROW LEVEL SECURITY;

-- Public read for TV displays (no auth needed)
CREATE POLICY "Public can view active signage_content"
  ON signage_content FOR SELECT
  USING (is_active = true);

-- Admins can manage signage_content
CREATE POLICY "Admins can manage signage_content"
  ON signage_content FOR ALL
  USING (
    organization_id = get_user_organization_id()
    AND user_has_role(ARRAY['superadmin', 'owner', 'admin', 'branch_manager'])
  );

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE signage_content IS 'Digital signage content for TV displays between ticket calls';
COMMENT ON COLUMN signage_content.content_type IS 'Type of content: image, text, video, or html';
COMMENT ON COLUMN signage_content.content_url IS 'URL for image/video content';
COMMENT ON COLUMN signage_content.content_text IS 'Text content for text/html types';
COMMENT ON COLUMN signage_content.display_duration_seconds IS 'How long to display this content in seconds';
COMMENT ON COLUMN signage_content.starts_at IS 'Optional start date for scheduled content';
COMMENT ON COLUMN signage_content.ends_at IS 'Optional end date for scheduled content';
