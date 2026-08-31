import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Profile, UserRole, StaffPermissionKey } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  // Actions
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  hasRole: (role: UserRole | UserRole[]) => boolean
  isAdmin: () => boolean
  isCustomer: () => boolean
  isSupportAgent: () => boolean
  hasPermission: (key: StaffPermissionKey) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      profile: null,
      isLoading: true,
      isAuthenticated: false,

      setProfile: (profile) =>
        set({
          profile,
          isAuthenticated: !!profile,
          isLoading: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      signOut: async () => {
        await supabase.auth.signOut()
        set({ profile: null, isAuthenticated: false })
      },

      refreshProfile: async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          set({ profile: null, isAuthenticated: false, isLoading: false })
          return
        }
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (data) {
          set({ profile: data, isAuthenticated: true, isLoading: false })
        } else {
          set({ profile: null, isAuthenticated: false, isLoading: false })
        }
      },

      hasRole: (role) => {
        const profile = get().profile
        if (!profile) return false
        if (Array.isArray(role)) return role.includes(profile.role)
        return profile.role === role
      },

      isAdmin: () => {
        const profile = get().profile
        return profile?.role === 'admin' || profile?.role === 'super_admin'
      },

      isCustomer: () => {
        return get().profile?.role === 'customer'
      },

      isSupportAgent: () => {
        return get().profile?.role === 'support_agent'
      },

      // Admins always have all permissions; staff only if explicitly granted
      hasPermission: (key: StaffPermissionKey) => {
        const profile = get().profile
        if (!profile) return false
        if (profile.role === 'admin' || profile.role === 'super_admin') return true
        return profile.permissions?.[key] === true
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({ profile: state.profile }),
    }
  )
)
