'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/shared/types/domain'
import type { User as SupabaseUser } from '@supabase/supabase-js'

/**
 * COOPNAMA Sistema de Turnos
 * Organization Context Provider
 *
 * Provides organization, branch, and agent context throughout the app.
 * Redirects to /login when no user is authenticated (no demo fallbacks).
 */

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
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string>('')
  const [branchId, setBranchId] = useState<string>('')
  const [agentId, setAgentId] = useState<string | null>(null)
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
          // No authenticated user - redirect to login
          setUser(null)
          setSupabaseUser(null)
          setLoading(false)
          router.replace('/login')
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
          setUser(null)
          setLoading(false)
          router.replace('/login')
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
          if (savedBranch === 'all') {
            setBranchId('all')
          } else if (savedBranch && branchList.some((b) => b.id === savedBranch)) {
            setBranchId(savedBranch)
          } else {
            setBranchId(userProfile.branch_id || (branchList[0]?.id ?? ''))
          }
        } else {
          setBranchId(userProfile.branch_id || '')
        }

        setLoading(false)
      } catch (error) {
        console.error('Error in OrgProvider:', error)
        setUser(null)
        setSupabaseUser(null)
        setLoading(false)
        router.replace('/login')
      }
    }

    fetchUserContext()
  }, [router])

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
