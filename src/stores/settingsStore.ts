import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

/**
 * Dynamically overrides the PWA manifest's icons with the site logo URL.
 * This ensures the PWA install prompt shows the correct branding for each
 * deployed site (e.g. NatashaSweeps vs OscarZone) even though they share
 * the same codebase and static build assets.
 *
 * Strategy: fetch the original static manifest first to preserve ALL required
 * PWA installability fields (scope, lang, orientation, etc.), then merge in
 * the dynamic logo. Falls back silently if anything goes wrong.
 */
async function updatePwaManifestIcons(logoUrl: string, siteName: string) {
  try {
    const existingLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null
    if (!existingLink) return

    // Persist the original static manifest href so we can always re-fetch it
    if (!existingLink.getAttribute('data-original-href')) {
      const currentHref = existingLink.getAttribute('href') || ''
      // Only save if it's a real path, not a blob we already created
      if (currentHref && !currentHref.startsWith('blob:')) {
        existingLink.setAttribute('data-original-href', currentHref)
      }
    }

    const originalHref = existingLink.getAttribute('data-original-href')
    if (!originalHref) return // Can't build a valid manifest without the base

    // Fetch the original manifest to inherit all required PWA fields
    let baseManifest: Record<string, unknown> = {}
    try {
      const res = await fetch(originalHref)
      if (res.ok) baseManifest = await res.json()
    } catch {
      // Network error – abort to avoid breaking the install prompt
      return
    }

    // Detect MIME type from URL extension (strip query params first)
    const cleanUrl = logoUrl.split('?')[0]
    const ext = cleanUrl.split('.').pop()?.toLowerCase()
    const mimeType =
      ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'webp' ? 'image/webp'
      : ext === 'svg' ? 'image/svg+xml'
      : 'image/png'

    const manifestData = {
      // Spread ALL original fields first (preserves scope, lang, orientation, etc.)
      ...baseManifest,
      // Then override only what we want to change
      name: siteName,
      short_name: siteName,
      icons: [
        { src: logoUrl, sizes: '192x192', type: mimeType },
        { src: logoUrl, sizes: '512x512', type: mimeType, purpose: 'any maskable' },
      ],
    }

    const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' })
    const newManifestUrl = URL.createObjectURL(blob)

    // Revoke the previous dynamic manifest blob URL to free memory
    const prevUrl = existingLink.getAttribute('data-dynamic-src')
    if (prevUrl) URL.revokeObjectURL(prevUrl)

    existingLink.setAttribute('href', newManifestUrl)
    existingLink.setAttribute('data-dynamic-src', newManifestUrl)
  } catch (e) {
    console.warn('Failed to update PWA manifest icons:', e)
  }
}

interface SettingsState {
  siteName: string
  siteTagline: string
  siteLogoUrl: string | null
  allowRegistration: boolean
  maintenanceMode: boolean
  supportEmail: string
  supportPhone: string
  supportTelegram: string
  supportFacebook: string
  metaTitle: string
  metaDescription: string
  tickerPosition: 'header' | 'banner' | 'hidden'
  showCashinTicker: boolean
  showCashoutTicker: boolean
  isLoading: boolean
  fetchSettings: () => Promise<void>
  setSiteLogoUrl: (url: string) => void
  setAllowRegistration: (allow: boolean) => void
  setMaintenanceMode: (enabled: boolean) => void
  updateSupportSettings: (updates: Partial<SettingsState>) => void
  updateMetaSettings: (updates: Partial<SettingsState>) => void
  updateTickerPosition: (position: 'header' | 'banner' | 'hidden') => void
  updateTickerVisibilities: (cashin: boolean, cashout: boolean) => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  siteName: import.meta.env.VITE_APP_NAME || 'GameZone',
  siteTagline: import.meta.env.VITE_APP_TAGLINE || 'Top Up. Play More. Win Big.',
  siteLogoUrl: null,
  allowRegistration: true,
  maintenanceMode: false,

  supportEmail: import.meta.env.VITE_DEFAULT_SUPPORT_EMAIL || '',
  supportPhone: '',
  supportTelegram: import.meta.env.VITE_DEFAULT_SUPPORT_TELEGRAM || '',
  supportFacebook: import.meta.env.VITE_DEFAULT_SUPPORT_FACEBOOK || '',
  metaTitle: import.meta.env.VITE_APP_NAME || 'GameZone',
  metaDescription: import.meta.env.VITE_APP_DESCRIPTION || 'Premium game top-up service.',
  tickerPosition: 'banner',
  showCashinTicker: true,
  showCashoutTicker: true,
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

        const maintSetting = data.find(d => d.key === 'maintenance_mode')
        let maintenanceMode = false
        if (maintSetting) {
          maintenanceMode = maintSetting.value === 'true' || maintSetting.value === true
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
        
        const sCashinTicker = data.find(d => d.key === 'show_cashin_ticker')?.value
        const sCashoutTicker = data.find(d => d.key === 'show_cashout_ticker')?.value

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
        
        let parsedCashin = true;
        if (sCashinTicker !== undefined) parsedCashin = sCashinTicker === 'true' || sCashinTicker === true;
        
        let parsedCashout = true;
        if (sCashoutTicker !== undefined) parsedCashout = sCashoutTicker === 'true' || sCashoutTicker === true;

        set({ 
          siteName: sName ? cleanValue(sName) : defaultAppName,
          siteTagline: sTagline ? cleanValue(sTagline) : (import.meta.env.VITE_APP_TAGLINE || 'Top Up. Play More. Win Big.'),
          siteLogoUrl: url, 
          allowRegistration: allowReg,
          maintenanceMode,
          supportEmail: sEmail ? cleanValue(sEmail) : (import.meta.env.VITE_DEFAULT_SUPPORT_EMAIL || ''),
          supportPhone: sPhone ? cleanValue(sPhone) : '',
          supportTelegram: sTelegram ? cleanValue(sTelegram) : (import.meta.env.VITE_DEFAULT_SUPPORT_TELEGRAM || ''),
          supportFacebook: sFacebook ? cleanValue(sFacebook) : (import.meta.env.VITE_DEFAULT_SUPPORT_FACEBOOK || ''),
          metaTitle: title,
          metaDescription: desc,
          tickerPosition: parsedPosition,
          showCashinTicker: parsedCashin,
          showCashoutTicker: parsedCashout,
          isLoading: false 
        })

        // Update DOM meta tags
        document.title = title
        document.getElementById('og-title')?.setAttribute('content', title)
        document.getElementById('og-desc')?.setAttribute('content', desc)
        if (url) {
          document.getElementById('og-image')?.setAttribute('content', url)
          // Dynamically override PWA manifest icons so the browser install
          // prompt shows this site's logo instead of the static build asset.
          const resolvedSiteName = sName ? cleanValue(sName) : (import.meta.env.VITE_APP_NAME || 'GameZone')
          updatePwaManifestIcons(url, resolvedSiteName)
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
    set((state) => {
      updatePwaManifestIcons(url, state.siteName)
      return { siteLogoUrl: url }
    })
    document.getElementById('og-image')?.setAttribute('content', url)
  },
  
  setAllowRegistration: (allow: boolean) => {
    set({ allowRegistration: allow })
  },

  setMaintenanceMode: (enabled: boolean) => {
    set({ maintenanceMode: enabled })
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
  },
  
  updateTickerVisibilities: (cashin: boolean, cashout: boolean) => {
    set({ showCashinTicker: cashin, showCashoutTicker: cashout })
  }
}))

