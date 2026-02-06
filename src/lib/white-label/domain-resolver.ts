import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface OrgBranding {
  id: string
  name: string
  slug: string
  logo_url: string | null
  primary_color: string
  secondary_color: string
  custom_css: string | null
  favicon_url: string | null
  meta_title: string | null
  meta_description: string | null
}

/**
 * Resolve organization by custom domain.
 * Returns org branding data if domain is verified.
 */
export async function resolveOrgByDomain(hostname: string): Promise<OrgBranding | null> {
  // Skip for default domains
  if (
    hostname === 'localhost' ||
    hostname.includes('vercel.app') ||
    hostname.includes('coopnama')
  ) {
    return null
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  const { data: domainRecord } = await supabase
    .from('custom_domains')
    .select('organization_id')
    .eq('domain', hostname)
    .eq('is_verified', true)
    .single()

  if (!domainRecord) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug, logo_url, primary_color, secondary_color, custom_css, favicon_url, meta_title, meta_description')
    .eq('id', domainRecord.organization_id)
    .single()

  return org as OrgBranding | null
}

/**
 * Generate CSS variables from org branding for injection into pages.
 */
export function generateBrandingCSS(org: OrgBranding): string {
  const vars = [
    `--brand-primary: ${org.primary_color || '#1e40af'}`,
    `--brand-secondary: ${org.secondary_color || '#059669'}`,
  ]

  let css = `:root { ${vars.join('; ')} }\n`

  if (org.custom_css) {
    css += org.custom_css
  }

  return css
}
