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

interface OrgContextValue {
  organizationId: string
  branchId: string
  agentId: string | null
  user: User | null
  supabaseUser: SupabaseUser | null
  loading: boolean
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined)

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [organizationId, setOrganizationId] = useState<string>(DEMO_ORG_ID)
  const [branchId, setBranchId] = useState<string>(DEMO_BRANCH_ID)
  const [agentId, setAgentId] = useState<string | null>(DEMO_AGENT_ID)
  const [user, setUser] = useState<User | null>(null)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)

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

        // Set context from user profile
        setOrganizationId(userProfile.organization_id)
        setBranchId(userProfile.branch_id || DEMO_BRANCH_ID)
        setAgentId(userProfile.id)
        setUser(userProfile as User)
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

  const value: OrgContextValue = {
    organizationId,
    branchId,
    agentId,
    user,
    supabaseUser,
    loading,
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
