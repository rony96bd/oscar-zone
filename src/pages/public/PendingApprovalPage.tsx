import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { LogOut, Send, MessageCircle, Phone, Mail } from 'lucide-react'
import { useEffect } from 'react'

export default function PendingApprovalPage() {
  const { profile, signOut, refreshProfile } = useAuthStore()
  const settings = useSettingsStore()

  // Auto-refresh profile every 10 seconds to check if approved
  useEffect(() => {
    const interval = setInterval(() => {
      refreshProfile()
    }, 10000)
    return () => clearInterval(interval)
  }, [refreshProfile])

  if (!profile) return null

  if (profile.account_status === 'active') {
    // If they got approved while on this page, reload to go to dashboard
    window.location.href = '/dashboard'
    return null
  }

  return (
    <div className="py-12 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-gold via-orange-500 to-neon-gold" />
        
        <div className="h-16 w-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="h-4 w-4 bg-orange-500 rounded-full animate-ping absolute" />
          <div className="h-8 w-8 bg-orange-500 rounded-full relative" />
        </div>

        <h1 className="text-2xl font-gaming font-bold text-white mb-2">Registration Successful!</h1>
        
        <div className="bg-black/40 rounded-xl p-4 mb-6 border border-border">
          <p className="text-orange-400 font-medium mb-1">Account Pending Approval</p>
          <p className="text-sm text-muted-foreground">
            Your account ({profile.username}) has been created successfully, but it requires admin approval before you can access the portal and request Game IDs.
          </p>
        </div>

        <p className="text-sm text-white mb-4">Please contact our support team to get your account approved instantly:</p>

        <div className="space-y-3 mb-8 text-left">
          {settings.supportTelegram && (
            <a href={settings.supportTelegram} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-[#0088cc]/10 hover:bg-[#0088cc]/20 border border-[#0088cc]/30 transition-colors">
              <Send className="h-5 w-5 text-[#0088cc]" />
              <div>
                <div className="text-sm font-medium text-white">Telegram Support</div>
                <div className="text-xs text-muted-foreground">Fastest response time</div>
              </div>
            </a>
          )}
          {settings.supportFacebook && (
            <a href={settings.supportFacebook} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/30 transition-colors">
              <MessageCircle className="h-5 w-5 text-[#1877F2]" />
              <div>
                <div className="text-sm font-medium text-white">Facebook Messenger</div>
                <div className="text-xs text-muted-foreground">Available 24/7</div>
              </div>
            </a>
          )}
          {settings.supportPhone && (
            <a href={	el:} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-border transition-colors">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <div className="text-sm font-medium text-white">{settings.supportPhone}</div>
                <div className="text-xs text-muted-foreground">Call or WhatsApp</div>
              </div>
            </a>
          )}
        </div>

        <button 
          onClick={() => signOut()} 
          className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
