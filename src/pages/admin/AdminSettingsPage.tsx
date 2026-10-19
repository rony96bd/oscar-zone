import { useState, useEffect, useMemo } from 'react'
import { Check, Loader2, Paintbrush, Save, Image as ImageIcon, Upload, X, Users, Phone, Share2, Layout, Wrench, Gift, Compass, Menu } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useThemeStore, ThemeName } from '@/stores/themeStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import { ChangePassword } from '@/components/auth/ChangePassword'

const PUBLIC_MENU_ITEMS = [
  { id: 'home', label: 'Home', path: '/', description: 'Public landing & home page' },
  { id: 'games', label: 'Games', path: '/games', description: 'Catalog of games with download and load links' },
  { id: 'promotions', label: 'Promotions', path: '/promotions', description: 'Active promotions, deposit rules and bonus banners' },
  { id: 'payment-tags', label: 'Payment Tags', path: '/payment-tags', description: 'Payment account numbers, tags and QR codes' },
  { id: 'contact', label: 'Support', path: '/contact', description: 'Contact details, email, phone and live support channels' },
  { id: 'transaction-board', label: 'Transaction Board', path: '/transaction-board', description: 'Live animated feed of recent loads and cashouts' },
  { id: 'winners-circle', label: "Winner's Circle", path: '/winners-circle', description: 'Community payouts, win proofs and testimonials' },
  { id: 'how-it-works', label: 'How It Works', path: '/how-it-works', description: 'Step-by-step beginner guide to loading games' },
  { id: 'referral', label: 'Refer & Earn', path: '/referral', description: 'Public affiliate and referral reward details' },
]

const CUSTOMER_MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', description: 'Main player hub with quick balance and activity' },
  { id: 'my-games', label: 'My Games', path: '/my-games', description: 'Customer in-game usernames and direct launch buttons' },
  { id: 'games', label: 'Game Links', path: '/games', description: 'Browse and download available sweepstakes games' },
  { id: 'load', label: 'Load Game', path: '/load', description: 'Main deposit / purchase credits flow' },
  { id: 'cashout', label: 'Cashout', path: '/cashout', description: 'Redeem winnings to CashApp, PayPal, Chime, etc.' },
  { id: 'orders', label: 'Orders', path: '/orders', description: 'Track payment statuses, receipts and transaction history' },
  { id: 'earnings', label: 'Referral', path: '/earnings', description: 'Referral earnings, statistics and commission payouts' },
  { id: 'free-play', label: 'Free Play', path: '/free-play', description: 'Daily free play bonus claim portal' },
  { id: 'notifications', label: 'Notifications', path: '/notifications', description: 'Real-time alert center for approvals and updates' },
  { id: 'chat', label: 'Support', path: '/chat', description: 'Dedicated live customer support messenger' },
  { id: 'profile', label: 'Profile', path: '/profile', description: 'Account settings, password reset and contact details' },
]

const THEMES = [
  {
    id: 'theme-cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Dark blue and cyan with neon green accents.',
    colors: ['#040a14', '#00d4ff', '#00ff88']
  },
  {
    id: 'theme-casino',
    name: 'Royal Casino',
    description: 'Deep red, dark brown, and gold accents.',
    colors: ['#0f0505', '#ffcc00', '#ff0032']
  },
  {
    id: 'theme-vibrant',
    name: 'Vibrant Gaming',
    description: 'Deep purple with bright pink neon vibes.',
    colors: ['#12091a', '#ff00c8', '#8a2be2']
  }
]

import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function AdminSettingsPage() {
  const { isSupportAgent } = useAuthStore()

  if (isSupportAgent()) {
    return <Navigate to="/admin" replace />
  }

  const { theme: currentTheme, fetchTheme, setTheme: setGlobalTheme } = useThemeStore()
  const { siteLogoUrl, setSiteLogoUrl, fetchSettings, updateSupportSettings, updateMetaSettings, metaTitle, metaDescription } = useSettingsStore()
  
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(currentTheme)
  const [isSaving, setIsSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(siteLogoUrl)
  const [isUploading, setIsUploading] = useState(false)

  const { allowRegistration, setAllowRegistration } = useSettingsStore()
  const [selectedAllowReg, setSelectedAllowReg] = useState(allowRegistration)
  const [isSavingReg, setIsSavingReg] = useState(false)

  // Ticker Settings
  const { tickerPosition, updateTickerPosition, showCashinTicker, showCashoutTicker, updateTickerVisibilities } = useSettingsStore()
  const [selectedTickerPos, setSelectedTickerPos] = useState<'header'|'banner'|'hidden'>(tickerPosition)
  const [selectedCashin, setSelectedCashin] = useState(showCashinTicker)
  const [selectedCashout, setSelectedCashout] = useState(showCashoutTicker)
  const [isSavingTicker, setIsSavingTicker] = useState(false)

  // Contact Support Settings
  const { supportEmail, supportPhone, supportTelegram, supportFacebook } = useSettingsStore()
  const [contactData, setContactData] = useState({
    supportEmail,
    supportPhone,
    supportTelegram,
    supportFacebook
  })
  const [isSavingContact, setIsSavingContact] = useState(false)

  // SEO / Meta Settings
  const [metaData, setMetaData] = useState({
    metaTitle,
    metaDescription
  })
  const [isSavingMeta, setIsSavingMeta] = useState(false)

  // Maintenance Mode
  const { maintenanceMode, setMaintenanceMode } = useSettingsStore()
  const [selectedMaintenance, setSelectedMaintenance] = useState(maintenanceMode)
  const [isSavingMaintenance, setIsSavingMaintenance] = useState(false)

  // Free Play Settings
  const { freePlayMode, freePlayDailyLimit, freePlayDepositRequirement, updateFreePlaySettings } = useSettingsStore()
  const [selectedFpMode, setSelectedFpMode] = useState<'deposit_based' | 'daily_limit'>(freePlayMode)
  const [selectedFpDailyLimit, setSelectedFpDailyLimit] = useState(freePlayDailyLimit)
  const [selectedFpDepositReq, setSelectedFpDepositReq] = useState(freePlayDepositRequirement)
  const [isSavingFreePlay, setIsSavingFreePlay] = useState(false)

  // Keep local state in sync with global state initially
  useEffect(() => {
    setSelectedTheme(currentTheme)
  }, [currentTheme])

  useEffect(() => {
    setSelectedAllowReg(allowRegistration)
  }, [allowRegistration])

  useEffect(() => {
    setLogoPreview(siteLogoUrl)
  }, [siteLogoUrl])
  
  useEffect(() => {
    setContactData({
      supportEmail,
      supportPhone,
      supportTelegram,
      supportFacebook
    })
  }, [supportEmail, supportPhone, supportTelegram, supportFacebook])

  useEffect(() => {
    setSelectedMaintenance(maintenanceMode)
  }, [maintenanceMode])

  useEffect(() => {
    setMetaData({
      metaTitle,
      metaDescription
    })
  }, [metaTitle, metaDescription])

  useEffect(() => {
    setSelectedFpMode(freePlayMode)
    setSelectedFpDailyLimit(freePlayDailyLimit)
    setSelectedFpDepositReq(freePlayDepositRequirement)
  }, [freePlayMode, freePlayDailyLimit, freePlayDepositRequirement])

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image must be less than 2MB')
        return
      }
      setLogoFile(file)
      setLogoPreview(URL.createObjectURL(file))
    }
  }

  const handleSaveLogo = async () => {
    if (!logoFile) return
    setIsUploading(true)
    try {
      const fileExt = logoFile.name.split('.').pop()
      const fileName = `site_logo_${Date.now()}.${fileExt}`

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('system-assets')
        .upload(fileName, logoFile, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('system-assets')
        .getPublicUrl(fileName)

      const { error: dbError } = await supabase
        .from('system_settings')
        .upsert({
          key: 'site_logo_url',
          value: JSON.stringify(publicUrl),
          description: 'Global site logo URL'
        }, { onConflict: 'key' })

      if (dbError) throw dbError

      setSiteLogoUrl(publicUrl)
      setLogoFile(null)
      toast.success('Site logo updated successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to upload logo: ' + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleResetLogo = async () => {
    setIsUploading(true)
    try {
      const { error: dbError } = await supabase
        .from('system_settings')
        .delete()
        .eq('key', 'site_logo_url')

      if (dbError) throw dbError

      setSiteLogoUrl('')
      setLogoPreview(null)
      setLogoFile(null)
      await fetchSettings() // refresh
      toast.success('Logo reset to default.')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to reset logo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Upsert the system setting
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'site_theme',
          value: selectedTheme,
          description: 'Global site theme'
        }, { onConflict: 'key' })
        
      if (error) throw error

      setGlobalTheme(selectedTheme) // Update locally instantly
      toast.success('Theme updated successfully! All users will now see this theme.')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update theme')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveRegistration = async () => {
    setIsSavingReg(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'allow_registration',
          value: selectedAllowReg ? 'true' : 'false',
          description: 'Allow new user registrations'
        }, { onConflict: 'key' })
        
      if (error) throw error
      
      setAllowRegistration(selectedAllowReg)
      toast.success('Registration settings updated.')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update registration settings')
    } finally {
      setIsSavingReg(false)
    }
  }

  const handleSaveTicker = async () => {
    setIsSavingTicker(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert([
          { key: 'ticker_position', value: selectedTickerPos, description: 'Live ticker position' },
          { key: 'show_cashin_ticker', value: String(selectedCashin), description: 'Show Cash In Ticker' },
          { key: 'show_cashout_ticker', value: String(selectedCashout), description: 'Show Cash Out Ticker' }
        ], { onConflict: 'key' })
        
      if (error) throw error
  
      updateTickerPosition(selectedTickerPos)
      updateTickerVisibilities(selectedCashin, selectedCashout)
      toast.success('Ticker settings updated.')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update ticker settings')
    } finally {
      setIsSavingTicker(false)
    }
  }

  const handleSaveContact = async () => {
    setIsSavingContact(true)
    try {
      const updates = [
        { key: 'support_email', value: contactData.supportEmail, description: 'Support Email Address' },
        { key: 'support_phone', value: contactData.supportPhone, description: 'Support Phone Number' },
        { key: 'support_telegram', value: contactData.supportTelegram, description: 'Support Telegram Link' },
        { key: 'support_facebook', value: contactData.supportFacebook, description: 'Support Facebook Link' }
      ]
      
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' })
        
      if (error) throw error
      
      updateSupportSettings(contactData)
      toast.success('Support contact settings updated.')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update contact settings')
    } finally {
      setIsSavingContact(false)
    }
  }

  const handleSaveMeta = async () => {
    setIsSavingMeta(true)
    try {
      const updates = [
        { key: 'meta_title', value: metaData.metaTitle, description: 'Site Meta Title (SEO/Social)' },
        { key: 'meta_description', value: metaData.metaDescription, description: 'Site Meta Description (SEO/Social)' }
      ]
      
      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' })
        
      if (error) throw error
      
      updateMetaSettings(metaData)
      toast.success('SEO & Social Share settings updated.')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update meta settings')
    } finally {
      setIsSavingMeta(false)
    }
  }


  const handleSaveMaintenance = async () => {
    setIsSavingMaintenance(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'maintenance_mode',
          value: selectedMaintenance ? 'true' : 'false',
          description: 'Put the site into maintenance mode'
        }, { onConflict: 'key' })

      if (error) throw error

      setMaintenanceMode(selectedMaintenance)
      toast.success(
        selectedMaintenance
          ? '🔧 Maintenance mode is now ON. Only admins can access the site.'
          : '✅ Maintenance mode is OFF. The site is live for all users.'
      )
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update maintenance mode')
    } finally {
      setIsSavingMaintenance(false)
    }
  }

  const handleSaveFreePlay = async () => {
    setIsSavingFreePlay(true)
    try {
      const updates = [
        { key: 'free_play_mode', value: selectedFpMode, description: 'Free play eligibility system mode' },
        { key: 'free_play_daily_limit', value: String(selectedFpDailyLimit), description: 'Daily limit for free play requests per customer' },
        { key: 'free_play_deposit_requirement', value: String(selectedFpDepositReq), description: 'Deposit amount required to unlock free play' }
      ]

      const { error } = await supabase
        .from('system_settings')
        .upsert(updates, { onConflict: 'key' })

      if (error) throw error

      updateFreePlaySettings(selectedFpMode, selectedFpDailyLimit, selectedFpDepositReq)
      toast.success(
        selectedFpMode === 'daily_limit'
          ? `Free Play system set to Daily Limit (${selectedFpDailyLimit} request(s)/day).`
          : `Free Play system set to Deposit-Based ($${selectedFpDepositReq} required).`
      )
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update Free Play settings: ' + err.message)
    } finally {
      setIsSavingFreePlay(false)
    }
  }

  // Navigation Menu Management State & Handlers
  const { publicNavMenus, customerNavMenus, updateNavMenuSettings } = useSettingsStore()
  const [selectedPublicMenus, setSelectedPublicMenus] = useState<Record<string, boolean>>(publicNavMenus)
  const [selectedCustomerMenus, setSelectedCustomerMenus] = useState<Record<string, boolean>>(customerNavMenus)
  const [isSavingMenus, setIsSavingMenus] = useState(false)
  const [navMenuTab, setNavMenuTab] = useState<'public' | 'customer'>('public')

  useEffect(() => {
    setSelectedPublicMenus(publicNavMenus)
  }, [publicNavMenus])

  useEffect(() => {
    setSelectedCustomerMenus(customerNavMenus)
  }, [customerNavMenus])

  const handleTogglePublicMenu = (id: string) => {
    setSelectedPublicMenus((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }))
  }

  const handleToggleCustomerMenu = (id: string) => {
    setSelectedCustomerMenus((prev) => ({
      ...prev,
      [id]: prev[id] === false ? true : false,
    }))
  }

  const handleSetAllPublic = (enabled: boolean) => {
    const updated: Record<string, boolean> = {}
    PUBLIC_MENU_ITEMS.forEach((item) => {
      updated[item.id] = enabled
    })
    setSelectedPublicMenus(updated)
  }

  const handleSetAllCustomer = (enabled: boolean) => {
    const updated: Record<string, boolean> = {}
    CUSTOMER_MENU_ITEMS.forEach((item) => {
      updated[item.id] = enabled
    })
    setSelectedCustomerMenus(updated)
  }

  const handleSaveNavMenus = async () => {
    setIsSavingMenus(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert([
          {
            key: 'public_nav_menus',
            value: JSON.stringify(selectedPublicMenus),
            description: 'Visibility of homepage/public navigation menu items',
          },
          {
            key: 'customer_nav_menus',
            value: JSON.stringify(selectedCustomerMenus),
            description: 'Visibility of customer logged-in navigation menu items',
          },
        ], { onConflict: 'key' })

      if (error) throw error

      updateNavMenuSettings(selectedPublicMenus, selectedCustomerMenus)
      toast.success('Navigation menu settings updated successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to update menu settings')
    } finally {
      setIsSavingMenus(false)
    }
  }

  const hasMenuChanges = useMemo(() => {
    const pubChanged = JSON.stringify(selectedPublicMenus) !== JSON.stringify(publicNavMenus)
    const custChanged = JSON.stringify(selectedCustomerMenus) !== JSON.stringify(customerNavMenus)
    return pubChanged || custChanged
  }, [selectedPublicMenus, selectedCustomerMenus, publicNavMenus, customerNavMenus])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">System Settings</h1>
          <p className="text-muted-foreground text-sm">Configure global platform settings</p>
        </div>
      </div>

      {/* Logo Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <ImageIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-white">Site Logo</h2>
            <p className="text-sm text-muted-foreground">Upload a custom logo for the platform. This will also be used as the social sharing image.</p>
          </div>
          {(logoFile || siteLogoUrl) && (
            <button
              onClick={handleResetLogo}
              disabled={isUploading}
              className="btn-ghost text-destructive hover:text-destructive hover:bg-destructive/10 px-4 py-2 text-sm"
            >
              Reset to Default
            </button>
          )}
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-48 h-48 rounded-xl bg-game-darker border-2 border-dashed border-border flex items-center justify-center relative overflow-hidden group">
            {logoPreview ? (
              <img src={logoPreview} alt="Logo Preview" className="max-w-full max-h-full object-contain p-4" />
            ) : (
              <div className="text-center p-4">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <span className="text-xs text-muted-foreground">Default Logo</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" /> Change Image
              </span>
            </div>
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-sm font-medium text-white mb-1">Upload Guidelines</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Recommended size: 256x256 or similar square/horizontal ratio.</li>
                <li>Format: PNG, JPG, or SVG (Transparent PNG recommended).</li>
                <li>Max file size: 2MB.</li>
              </ul>
            </div>
            {logoFile && (
              <button
                onClick={handleSaveLogo}
                disabled={isUploading}
                className="btn-neon w-full sm:w-auto px-8 py-2"
              >
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {isUploading ? 'Uploading...' : 'Save New Logo'}
              </button>
            )}
          </div>
        </div>

        <ChangePassword />
      </div>
      
      {/* SEO / Meta Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <Share2 className="h-5 w-5 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">SEO & Social Sharing</h2>
              <p className="text-sm text-muted-foreground">Configure how your site looks when shared on WhatsApp, Facebook, etc.</p>
            </div>
          </div>
          <button
            onClick={handleSaveMeta}
            disabled={isSavingMeta}
            className="btn-neon px-6 py-2 text-sm"
          >
            {isSavingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save SEO Settings
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Website Title</label>
            <input 
              type="text" 
              value={metaData.metaTitle}
              onChange={e => setMetaData({...metaData, metaTitle: e.target.value})}
              className="game-input text-sm" 
              placeholder="Oscar Zone - Premium Gaming Top-up"
            />
            <p className="text-xs text-muted-foreground mt-1">This is the main title shown on the browser tab and when shared.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Website Description</label>
            <textarea 
              value={metaData.metaDescription}
              onChange={e => setMetaData({...metaData, metaDescription: e.target.value})}
              className="game-input text-sm resize-none"
              rows={3}
              placeholder="Load your favorite games instantly with Oscar Zone. Premium gaming top-up service."
            />
            <p className="text-xs text-muted-foreground mt-1">This description appears below the title when shared on social media and in search engine results.</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Paintbrush className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Platform Theme</h2>
              <p className="text-sm text-muted-foreground">Select the visual theme for all users</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || selectedTheme === currentTheme}
            className="btn-neon px-6 py-2 text-sm"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Theme
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {THEMES.map(theme => (
            <div
              key={theme.id}
              onClick={() => setSelectedTheme(theme.id as ThemeName)}
              className={cn(
                "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
                selectedTheme === theme.id 
                  ? "border-primary bg-primary/10 shadow-neon-blue" 
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex gap-2 mb-4">
                {theme.colors.map(color => (
                  <div 
                    key={color} 
                    className="h-6 w-6 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              
              <h3 className="font-bold text-white mb-1">{theme.name}</h3>
              <p className="text-xs text-muted-foreground">{theme.description}</p>
              
              {selectedTheme === theme.id && (
                <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Maintenance Mode */}
      <div className={`glass-card p-6 border-2 transition-colors ${selectedMaintenance ? 'border-red-500/50 bg-red-500/5' : 'border-border'}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedMaintenance ? 'bg-red-500/20' : 'bg-slate-500/20'}`}>
              <Wrench className={`h-5 w-5 ${selectedMaintenance ? 'text-red-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Maintenance Mode</h2>
              <p className="text-sm text-muted-foreground">Take the site offline for all non-admin users</p>
            </div>
          </div>
          <button
            onClick={handleSaveMaintenance}
            disabled={isSavingMaintenance || selectedMaintenance === maintenanceMode}
            className={`px-6 py-2 text-sm rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed ${selectedMaintenance ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'btn-neon'}`}
          >
            {isSavingMaintenance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Status
          </button>
        </div>

        {selectedMaintenance && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <span className="text-red-400 text-lg mt-0.5">⚠️</span>
            <div>
              <p className="text-red-300 text-sm font-semibold">Site is currently in Maintenance Mode</p>
              <p className="text-red-400/80 text-xs mt-0.5">All visitors and logged-in customers will see the maintenance page. Admins can still access the site normally.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-black/20">
          <div className="flex-1">
            <h3 className="font-bold text-white">Enable Maintenance Mode</h3>
            <p className="text-xs text-muted-foreground">When enabled, guests and customers will see a "Under Maintenance" page. Admin accounts bypass this restriction.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={selectedMaintenance}
              onChange={(e) => setSelectedMaintenance(e.target.checked)}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.1)] peer-checked:shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
          </label>
        </div>
      </div>

      {/* Free Play System Configuration */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-neon-gold/20 flex items-center justify-center">
              <Gift className="h-5 w-5 text-neon-gold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Free Play System</h2>
              <p className="text-sm text-muted-foreground">Select and configure the customer Free Play eligibility rule</p>
            </div>
          </div>
          <button
            onClick={handleSaveFreePlay}
            disabled={isSavingFreePlay || (selectedFpMode === freePlayMode && selectedFpDailyLimit === freePlayDailyLimit && selectedFpDepositReq === freePlayDepositRequirement)}
            className="btn-neon px-6 py-2 text-sm"
          >
            {isSavingFreePlay ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Free Play
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div
            onClick={() => setSelectedFpMode('deposit_based')}
            className={cn(
              "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
              selectedFpMode === 'deposit_based'
                ? "border-primary bg-primary/10 shadow-neon-blue"
                : "border-border bg-card hover:border-primary/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">🪙</span>
              <h3 className="font-bold text-white">Deposit-Based Mode</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Customers must deposit a specific total amount (e.g. $10) to unlock each Free Play request.
            </p>
            {selectedFpMode === 'deposit_based' && (
              <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </div>

          <div
            onClick={() => setSelectedFpMode('daily_limit')}
            className={cn(
              "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
              selectedFpMode === 'daily_limit'
                ? "border-neon-gold bg-neon-gold/10 shadow-[0_0_15px_rgba(255,215,0,0.2)]"
                : "border-border bg-card hover:border-neon-gold/50"
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">📅</span>
              <h3 className="font-bold text-white">Daily Limit Mode</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Customers are allowed to request Free Play up to a fixed number of times per day, without requiring deposits.
            </p>
            {selectedFpMode === 'daily_limit' && (
              <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-neon-gold flex items-center justify-center">
                <Check className="h-4 w-4 text-black" />
              </div>
            )}
          </div>
        </div>

        {/* Parameter fields depending on mode */}
        <div className="p-4 rounded-xl border border-border bg-black/20">
          {selectedFpMode === 'daily_limit' ? (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white">
                Daily Limit Per Customer (Requests / Day)
              </label>
              <p className="text-xs text-muted-foreground">
                Set how many times a customer can submit a Free Play request each calendar day (resets daily at midnight).
              </p>
              <div className="flex items-center gap-3 mt-2 max-w-xs">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={selectedFpDailyLimit}
                  onChange={(e) => setSelectedFpDailyLimit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="game-input text-sm font-bold text-neon-gold"
                  placeholder="1"
                />
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">request(s) / day</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-white">
                Required Deposit Amount ($)
              </label>
              <p className="text-xs text-muted-foreground">
                Set the completed deposit amount required since the last Free Play request before a customer can request again.
              </p>
              <div className="flex items-center gap-3 mt-2 max-w-xs">
                <div className="relative w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={selectedFpDepositReq}
                    onChange={(e) => setSelectedFpDepositReq(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="game-input text-sm font-bold text-neon-green pl-7"
                    placeholder="10"
                  />
                </div>
                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">required deposit</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Registration Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Public Registration</h2>
              <p className="text-sm text-muted-foreground">Allow or block new users from signing up</p>
            </div>
          </div>
          <button
            onClick={handleSaveRegistration}
            disabled={isSavingReg || selectedAllowReg === allowRegistration}
            className="btn-neon px-6 py-2 text-sm"
          >
            {isSavingReg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Status
          </button>
        </div>

        <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-black/20">
          <div className="flex-1">
            <h3 className="font-bold text-white">Enable Sign Ups</h3>
            <p className="text-xs text-muted-foreground">If turned off, the Sign Up button will be hidden and registration will be blocked. Useful to prevent fake accounts for referral abuse.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={selectedAllowReg}
              onChange={(e) => setSelectedAllowReg(e.target.checked)}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-green shadow-[0_0_10px_rgba(0,255,136,0.2)] peer-checked:shadow-[0_0_15px_rgba(0,255,136,0.5)]"></div>
          </label>
        </div>
      </div>

      {/* Navigation Menu Management */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Compass className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Navigation Menu Management
                <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded bg-muted">
                  Menu Visibility
                </span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Control which menu links appear on the public homepage and after customer login
              </p>
            </div>
          </div>
          <button
            onClick={handleSaveNavMenus}
            disabled={isSavingMenus || !hasMenuChanges}
            className="btn-neon px-6 py-2 text-sm flex items-center gap-2 self-start sm:self-auto"
          >
            {isSavingMenus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Menu Settings
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 mb-6 border-b border-border pb-3">
          <button
            type="button"
            onClick={() => setNavMenuTab('public')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              navMenuTab === 'public'
                ? 'bg-primary text-primary-foreground shadow-neon-blue'
                : 'bg-muted/30 text-muted-foreground hover:text-white hover:bg-muted/50'
            }`}
          >
            <span>Homepage / Public Menus</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                navMenuTab === 'public' ? 'bg-black/30 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {PUBLIC_MENU_ITEMS.filter((m) => selectedPublicMenus[m.id] !== false).length}/{PUBLIC_MENU_ITEMS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setNavMenuTab('customer')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              navMenuTab === 'customer'
                ? 'bg-primary text-primary-foreground shadow-neon-blue'
                : 'bg-muted/30 text-muted-foreground hover:text-white hover:bg-muted/50'
            }`}
          >
            <span>Customer Logged-In Menus</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                navMenuTab === 'customer' ? 'bg-black/30 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {CUSTOMER_MENU_ITEMS.filter((m) => selectedCustomerMenus[m.id] !== false).length}/{CUSTOMER_MENU_ITEMS.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Public Menus */}
        {navMenuTab === 'public' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-black/20 border border-border">
              <p className="text-xs text-muted-foreground">
                These menu links are displayed to visitors on the public website before logging in.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAllPublic(true)}
                  className="px-2.5 py-1 text-xs rounded bg-muted/40 hover:bg-muted text-slate-300 font-medium"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllPublic(false)}
                  className="px-2.5 py-1 text-xs rounded bg-muted/40 hover:bg-muted text-slate-300 font-medium"
                >
                  Disable All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {PUBLIC_MENU_ITEMS.map((item) => {
                const isEnabled = selectedPublicMenus[item.id] !== false
                return (
                  <div
                    key={item.id}
                    onClick={() => handleTogglePublicMenu(item.id)}
                    className={cn(
                      'p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 select-none',
                      isEnabled
                        ? 'bg-primary/5 border-primary/30 hover:border-primary/50'
                        : 'bg-muted/10 border-border/60 opacity-60 hover:opacity-80'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-cyan-400">
                          {item.path}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="mt-2">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isEnabled
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isEnabled ? '● Active in Menu' : '○ Hidden from Menu'}
                        </span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer pointer-events-none mt-1">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        readOnly
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-[0_0_10px_rgba(0,212,255,0.1)] peer-checked:shadow-[0_0_12px_rgba(0,212,255,0.5)]"></div>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Customer Logged-In Menus */}
        {navMenuTab === 'customer' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-black/20 border border-border">
              <p className="text-xs text-muted-foreground">
                These menu links are displayed to logged-in customers (top bar, "More" dropdown, drawer, and bottom app bar).
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSetAllCustomer(true)}
                  className="px-2.5 py-1 text-xs rounded bg-muted/40 hover:bg-muted text-slate-300 font-medium"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllCustomer(false)}
                  className="px-2.5 py-1 text-xs rounded bg-muted/40 hover:bg-muted text-slate-300 font-medium"
                >
                  Disable All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {CUSTOMER_MENU_ITEMS.map((item) => {
                const isEnabled = selectedCustomerMenus[item.id] !== false
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCustomerMenu(item.id)}
                    className={cn(
                      'p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 select-none',
                      isEnabled
                        ? 'bg-primary/5 border-primary/30 hover:border-primary/50'
                        : 'bg-muted/10 border-border/60 opacity-60 hover:opacity-80'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{item.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/40 text-cyan-400">
                          {item.path}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {item.description}
                      </p>
                      <div className="mt-2">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isEnabled
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {isEnabled ? '● Active in Menu' : '○ Hidden from Menu'}
                        </span>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer pointer-events-none mt-1">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        readOnly
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary shadow-[0_0_10px_rgba(0,212,255,0.1)] peer-checked:shadow-[0_0_12px_rgba(0,212,255,0.5)]"></div>
                    </label>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Ticker Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <Layout className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Live Ticker Position</h2>
              <p className="text-sm text-muted-foreground">Choose where the Live Activity Ticker should appear</p>
            </div>
          </div>
          <button
            onClick={handleSaveTicker}
            disabled={isSavingTicker || (selectedTickerPos === tickerPosition && selectedCashin === showCashinTicker && selectedCashout === showCashoutTicker)}
            className="btn-neon px-6 py-2 text-sm"
          >
            {isSavingTicker ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Ticker
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { id: 'header', label: 'Fixed Header', desc: 'Stays pinned at the top of the screen' },
            { id: 'banner', label: 'Hero Banner', desc: 'Shows inside the homepage hero section' },
            { id: 'hidden', label: 'Hidden', desc: 'Disable the ticker completely' }
          ].map(pos => (
            <div
              key={pos.id}
              onClick={() => setSelectedTickerPos(pos.id as any)}
              className={cn(
                "relative p-4 rounded-xl border-2 cursor-pointer transition-all",
                selectedTickerPos === pos.id 
                  ? "border-neon-gold bg-neon-gold/10 shadow-[0_0_15px_rgba(255,215,0,0.2)]" 
                  : "border-border bg-card hover:border-neon-gold/50"
              )}
            >
              <h3 className="font-bold text-white mb-1">{pos.label}</h3>
              <p className="text-xs text-muted-foreground">{pos.desc}</p>
              
              {selectedTickerPos === pos.id && (
                <div className="absolute top-4 right-4 h-6 w-6 rounded-full bg-neon-gold flex items-center justify-center">
                  <Check className="h-4 w-4 text-black" />
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedTickerPos !== 'hidden' && (
          <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-bold text-white mb-2">Display Preferences</h3>
            
            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-black/20">
              <div className="flex-1">
                <h3 className="font-bold text-white">Show Cash In (Loads)</h3>
                <p className="text-xs text-muted-foreground">Show recent player top-ups in the live ticker</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={selectedCashin}
                  onChange={(e) => setSelectedCashin(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-green shadow-[0_0_10px_rgba(0,255,136,0.2)] peer-checked:shadow-[0_0_15px_rgba(0,255,136,0.5)]"></div>
              </label>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-black/20">
              <div className="flex-1">
                <h3 className="font-bold text-white">Show Cash Out (Redeems)</h3>
                <p className="text-xs text-muted-foreground">Show recent player withdrawals in the live ticker</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={selectedCashout}
                  onChange={(e) => setSelectedCashout(e.target.checked)}
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-gold shadow-[0_0_10px_rgba(255,215,0,0.2)] peer-checked:shadow-[0_0_15px_rgba(255,215,0,0.5)]"></div>
              </label>
            </div>
          </div>
        )}
      </div>
      
      {/* Contact Settings */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Phone className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Contact & Support Settings</h2>
              <p className="text-sm text-muted-foreground">Manage links displayed on the Contact page</p>
            </div>
          </div>
          <button
            onClick={handleSaveContact}
            disabled={isSavingContact}
            className="btn-neon px-6 py-2 text-sm"
          >
            {isSavingContact ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Contacts
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email Address</label>
            <input 
              type="email" 
              value={contactData.supportEmail}
              onChange={e => setContactData({...contactData, supportEmail: e.target.value})}
              className="game-input text-sm" 
              placeholder="support@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone Number (Optional)</label>
            <input 
              type="text" 
              value={contactData.supportPhone}
              onChange={e => setContactData({...contactData, supportPhone: e.target.value})}
              className="game-input text-sm" 
              placeholder="+1 555-0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Telegram Link</label>
            <input 
              type="url" 
              value={contactData.supportTelegram}
              onChange={e => setContactData({...contactData, supportTelegram: e.target.value})}
              className="game-input text-sm" 
              placeholder="https://t.me/yourchannel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Facebook Page Link</label>
            <input 
              type="url" 
              value={contactData.supportFacebook}
              onChange={e => setContactData({...contactData, supportFacebook: e.target.value})}
              className="game-input text-sm" 
              placeholder="https://facebook.com/yourpage"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
