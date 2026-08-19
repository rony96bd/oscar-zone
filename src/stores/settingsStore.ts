import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface SettingsState {
  siteLogoUrl: string | null
  allowRegistration: boolean
  isLoading: boolean
  fetchSettings: () => Promise<void>
  setSiteLogoUrl: (url: string) => void
  setAllowRegistration: (allow: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  siteLogoUrl: null,
  allowRegistration: true, // Default to true
  isLoading: true,

  fetchSettings: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        
      if (!error && data) {
        const logoSetting = data.find(d => d.key === 'site_logo_url')
        let url = logoSetting?.value || null
        if (typeof url === 'string' && url.startsWith('"') && url.endsWith('"')) {
          url = url.slice(1, -1)
        }

        const regSetting = data.find(d => d.key === 'allow_registration')
        let allowReg = true
        if (regSetting) {
          allowReg = regSetting.value === 'true' || regSetting.value === true
        }

        set({ siteLogoUrl: url, allowRegistration: allowReg, isLoading: false })
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
  
  setAllowRegistration: (allow: boolean) => {
    set({ allowRegistration: allow })
  }
}))
