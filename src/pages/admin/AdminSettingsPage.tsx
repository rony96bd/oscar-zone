import { useState, useEffect } from 'react'
import { Check, Loader2, Paintbrush, Save, Image as ImageIcon, Upload, X, Users, Phone, Share2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useThemeStore, ThemeName } from '@/stores/themeStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'

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

export default function AdminSettingsPage() {
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
    setMetaData({
      metaTitle,
      metaDescription
    })
  }, [metaTitle, metaDescription])

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
          description: 'Allow or block new public user registrations'
        }, { onConflict: 'key' })
        
      if (error) throw error

      setAllowRegistration(selectedAllowReg)
      toast.success(selectedAllowReg ? 'Public registration enabled.' : 'Public registration blocked.')
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to update registration settings')
    } finally {
      setIsSavingReg(false)
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
