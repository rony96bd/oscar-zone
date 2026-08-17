import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface SettingsState {
  siteLogoUrl: string | null
  isLoading: boolean
  fetchSettings: () => Promise<void>
  setSiteLogoUrl: (url: string) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  siteLogoUrl: null,
  isLoading: true,

  fetchSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'site_logo_url')
        .maybeSingle()
        
      if (!error && data) {
        let url = data.value
        if (typeof url === 'string' && url.startsWith('"') && url.endsWith('"')) {
          url = url.slice(1, -1)
        }
        set({ siteLogoUrl: url, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      set({ isLoading: false })
    }
  },

  setSiteLogoUrl: (url: string) => {
    set({ siteLogoUrl: url })
  },
}))
