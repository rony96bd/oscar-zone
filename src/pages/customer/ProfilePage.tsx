import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { updateProfile } from '@/services/profiles'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuthStore()
  const [form, setForm] = useState({ full_name: profile?.full_name || '', phone: profile?.phone || '' })
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await updateProfile(profile!.id, form)
      await refreshProfile()
      toast.success('Profile updated!')
    } catch { toast.error('Failed to update profile') } finally { setIsLoading(false) }
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-gaming font-bold text-gradient-white mb-6">My Profile</h1>
        <div className="game-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-2xl font-gaming font-bold text-primary">{profile?.full_name?.charAt(0) || 'U'}</span>
            </div>
            <div>
              <p className="font-semibold text-white">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
              <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className="game-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input type="email" value={profile?.email || ''} disabled className="game-input opacity-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="game-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Referral Code</label>
              <input type="text" value={profile?.referral_code || ''} disabled className="game-input opacity-50 font-mono" />
            </div>
            <button onClick={handleSave} disabled={isLoading} className="btn-neon w-full py-3">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
