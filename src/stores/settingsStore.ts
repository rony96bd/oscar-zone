import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface SettingsState {
  siteName: string
  siteTagline: string
  siteLogoUrl: string | null
  allowRegistration: boolean
  supportEmail: string
  supportPhone: string
  supportTelegram: string
  supportFacebook: string
  metaTitle: string
  metaDescription: string
  tickerPosition: 'header' | 'banner' | 'hidden'
  isLoading: boolean
  fetchSettings: () => Promise<void>
  setSiteLogoUrl: (url: string) => void
  setAllowRegistration: (allow: boolean) => void
  updateSupportSettings: (updates: Partial<SettingsState>) => void
  updateMetaSettings: (updates: Partial<SettingsState>) => void
  updateTickerPosition: (position: 'header' | 'banner' | 'hidden') => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  siteName: import.meta.env.VITE_APP_NAME || 'GameZone',
  siteTagline: import.meta.env.VITE_APP_TAGLINE || 'Top Up. Play More. Win Big.',
  siteLogoUrl: null,
  allowRegistration: true,
  supportEmail: import.meta.env.VITE_DEFAULT_SUPPORT_EMAIL || '',
  supportPhone: '',
  supportTelegram: import.meta.env.VITE_DEFAULT_SUPPORT_TELEGRAM || '',
  supportFacebook: import.meta.env.VITE_DEFAULT_SUPPORT_FACEBOOK || '',
  metaTitle: import.meta.env.VITE_APP_NAME || 'GameZone',
  metaDescription: import.meta.env.VITE_APP_DESCRIPTION || 'Premium game top-up service.',
  tickerPosition: 'banner',
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
        
        const mTitle = data.find(d => d.key === 'meta_title')?.value
        const mDesc = data.find(d => d.key === 'meta_description')?.value
        const tPosition = data.find(d => d.key === 'ticker_position')?.value
        const sName = data.find(d => d.key === 'site_name')?.value
        const sTagline = data.find(d => d.key === 'site_tagline')?.value

        const defaultAppName = import.meta.env.VITE_APP_NAME || 'GameZone'
        const defaultAppDesc = import.meta.env.VITE_APP_DESCRIPTION || 'Premium game top-up service.'

        const title = mTitle ? cleanValue(mTitle) : defaultAppName
        const desc = mDesc ? cleanValue(mDesc) : defaultAppDesc
        let parsedPosition: 'header' | 'banner' | 'hidden' = 'banner'
        if (tPosition) {
          const rawPos = cleanValue(tPosition)
          if (rawPos === 'header' || rawPos === 'banner' || rawPos === 'hidden') {
            parsedPosition = rawPos
          }
        }

        set({ 
          siteName: sName ? cleanValue(sName) : defaultAppName,
          siteTagline: sTagline ? cleanValue(sTagline) : (import.meta.env.VITE_APP_TAGLINE || 'Top Up. Play More. Win Big.'),
          siteLogoUrl: url, 
          allowRegistration: allowReg, 
          supportEmail: sEmail ? cleanValue(sEmail) : (import.meta.env.VITE_DEFAULT_SUPPORT_EMAIL || ''),
          supportPhone: sPhone ? cleanValue(sPhone) : '',
          supportTelegram: sTelegram ? cleanValue(sTelegram) : (import.meta.env.VITE_DEFAULT_SUPPORT_TELEGRAM || ''),
          supportFacebook: sFacebook ? cleanValue(sFacebook) : (import.meta.env.VITE_DEFAULT_SUPPORT_FACEBOOK || ''),
          metaTitle: title,
          metaDescription: desc,
          tickerPosition: parsedPosition,
          isLoading: false 
        })

        // Update DOM meta tags
        document.title = title
        document.getElementById('og-title')?.setAttribute('content', title)
        document.getElementById('og-desc')?.setAttribute('content', desc)
        if (url) {
          document.getElementById('og-image')?.setAttribute('content', url)
        }

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
    document.getElementById('og-image')?.setAttribute('content', url)
  },
  
  setAllowRegistration: (allow: boolean) => {
    set({ allowRegistration: allow })
  },

  updateSupportSettings: (updates: Partial<SettingsState>) => {
    set((state) => ({ ...state, ...updates }))
  },
  
  updateMetaSettings: (updates: Partial<SettingsState>) => {
    set((state) => {
      const newState = { ...state, ...updates }
      document.title = newState.metaTitle
      document.getElementById('og-title')?.setAttribute('content', newState.metaTitle)
      document.getElementById('og-desc')?.setAttribute('content', newState.metaDescription)
      return newState
    })
  },
  
  updateTickerPosition: (position: 'header' | 'banner' | 'hidden') => {
    set({ tickerPosition: position })
  }
}))
