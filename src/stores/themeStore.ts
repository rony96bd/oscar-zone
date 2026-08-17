import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type ThemeName = 'theme-cyberpunk' | 'theme-casino' | 'theme-vibrant'

interface ThemeState {
  theme: ThemeName
  isLoading: boolean
  setTheme: (theme: ThemeName) => void
  fetchTheme: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'theme-cyberpunk', // Default
  isLoading: true,
  
  setTheme: (theme) => {
    set({ theme })
    document.documentElement.className = theme
  },

  fetchTheme: async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'site_theme')
        .maybeSingle()
        
      if (!error && data?.value) {
        set({ theme: data.value as ThemeName, isLoading: false })
        document.documentElement.className = data.value
      } else {
        set({ isLoading: false })
        document.documentElement.className = 'theme-cyberpunk' // Fallback
      }
    } catch (err) {
      console.error('Failed to fetch theme:', err)
      set({ isLoading: false })
      document.documentElement.className = 'theme-cyberpunk'
    }
  }
}))
