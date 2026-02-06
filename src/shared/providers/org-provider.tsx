'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/shared/types/domain'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/**
 * COOPNAMA Sistema de Turnos
 * Organization Context Provider
 *
 * Provides organization, branch, and agent context throughout the app.
 * Falls back to demo IDs when no user is authenticated.
 */

// Demo fallback IDs
const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000001'
const DEMO_AGENT_ID = '00000000-0000-0000-0000-000000000001'

interface Branch {
  id: string
  name: string
  code: string
  is_active: boolean
}

interface OrgContextValue {
  organizationId: string
  branchId: string
  agentId: string | null
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
  branches: Branch[]
  switchBranch: (branchId: string) => void
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string>(DEMO_ORG_ID)
  const [branchId, setBranchId] = useState<string>(DEMO_BRANCH_ID)
  const [agentId, setAgentId] = useState<string | null>(DEMO_AGENT_ID)
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [branches, setBranches] = useState<Branch[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function fetchUserContext() {
      try {
        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
          // No authenticated user - use demo IDs
          setOrganizationId(DEMO_ORG_ID)
          setBranchId(DEMO_BRANCH_ID)
          setAgentId(DEMO_AGENT_ID)
          setUser(null)
          setSupabaseUser(null)
          setLoading(false)
          return
        }

        setSupabaseUser(authUser)

        // Fetch user profile from users table
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError || !userProfile) {
          console.error('Error fetching user profile:', profileError)
          // Fall back to demo IDs if profile not found
          setOrganizationId(DEMO_ORG_ID)
          setBranchId(DEMO_BRANCH_ID)
          setAgentId(DEMO_AGENT_ID)
          setUser(null)
          setLoading(false)
          return
        }

        // Set organization context
        setOrganizationId(userProfile.organization_id)
        setAgentId(userProfile.id)
        setUser(userProfile as User)

        // Fetch org branding colors and apply as CSS variables
        const { data: orgData } = await supabase
          .from('organizations')
          .select('primary_color, secondary_color')
          .eq('id', userProfile.organization_id)
          .single()

        if (orgData) {
          if (orgData.primary_color) {
            document.documentElement.style.setProperty('--coopnama-primary', orgData.primary_color)
          }
          if (orgData.secondary_color) {
            document.documentElement.style.setProperty('--coopnama-secondary', orgData.secondary_color)
          }
        }

        // Fetch branches for this organization
        const { data: branchList } = await supabase
          .from('branches')
          .select('id, name, code, is_active')
          .eq('organization_id', userProfile.organization_id)
          .eq('is_active', true)
          .order('name')

        if (branchList) {
          setBranches(branchList as Branch[])

          // Check localStorage for saved branch preference
          const savedBranch = localStorage.getItem('selected_branch_id')
          if (savedBranch && branchList.some((b) => b.id === savedBranch)) {
            setBranchId(savedBranch)
          } else {
            setBranchId(userProfile.branch_id || DEMO_BRANCH_ID)
          }
        } else {
          setBranchId(userProfile.branch_id || DEMO_BRANCH_ID)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error in OrgProvider:', error)
        // Fall back to demo IDs on error
        setOrganizationId(DEMO_ORG_ID)
        setBranchId(DEMO_BRANCH_ID)
        setAgentId(DEMO_AGENT_ID)
        setUser(null)
        setSupabaseUser(null)
        setLoading(false)
      }
    }

    fetchUserContext()
  }, [])

  const switchBranch = (newBranchId: string) => {
    setBranchId(newBranchId)
    localStorage.setItem('selected_branch_id', newBranchId)
  }

  const value: OrgContextValue = {
    organizationId,
    branchId,
    agentId,
    user,
    supabaseUser,
    loading,
    branches,
    switchBranch,
  }

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

/**
 * Hook to access organization context
 * @throws Error if used outside OrgProvider
 */
export function useOrg(): OrgContextValue {
  const context = useContext(OrgContext)
  if (context === undefined) {
    throw new Error('useOrg must be used within OrgProvider')
  }
  return context
}
