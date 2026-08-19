import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface SettingsState {
  siteLogoUrl: string | null
  allowRegistration: boolean
  supportEmail: string
  supportPhone: string
  supportTelegram: string
  supportFacebook: string
  isLoading: boolean
  fetchSettings: () => Promise<void>
  setSiteLogoUrl: (url: string) => void
  setAllowRegistration: (allow: boolean) => void
  updateSupportSettings: (updates: Partial<SettingsState>) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  siteLogoUrl: null,
  allowRegistration: true,
  supportEmail: 'support@oscarzone.com',
  supportPhone: '+1 (555) 000-0000',
  supportTelegram: 'https://t.me/oscarzone',
  supportFacebook: 'https://facebook.com/oscarzone',
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

        const cleanValue = (val: any) => {
          if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
            return val.slice(1, -1)
          }
          return val
        }

        const sEmail = data.find(d => d.key === 'support_email')?.value
        const sPhone = data.find(d => d.key === 'support_phone')?.value
        const sTelegram = data.find(d => d.key === 'support_telegram')?.value
        const sFacebook = data.find(d => d.key === 'support_facebook')?.value

        set({ 
          siteLogoUrl: url, 
          allowRegistration: allowReg, 
          supportEmail: sEmail ? cleanValue(sEmail) : 'support@oscarzone.com',
          supportPhone: sPhone ? cleanValue(sPhone) : '+1 (555) 000-0000',
          supportTelegram: sTelegram ? cleanValue(sTelegram) : 'https://t.me/oscarzone',
          supportFacebook: sFacebook ? cleanValue(sFacebook) : 'https://facebook.com/oscarzone',
          isLoading: false 
        })
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
  },

  updateSupportSettings: (updates: Partial<SettingsState>) => {
    set((state) => ({ ...state, ...updates }))
  }
}))
