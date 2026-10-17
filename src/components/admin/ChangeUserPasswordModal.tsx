import { useState } from 'react'
import { X, KeyRound, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import type { Profile } from '@/types'

interface ChangeUserPasswordModalProps {
  user: Profile | null
  isOpen: boolean
  onClose: () => void
}

export function ChangeUserPasswordModal({ user, isOpen, onClose }: ChangeUserPasswordModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !user) return null

  const handleGenerate = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%'
    let gen = ''
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(gen)
    setShowPassword(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-set-password', {
        body: { userId: user.id, newPassword: password }
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success(`Password updated for @${user.username}`)
      setPassword('')
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to update password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-game-dark border border-border p-6 shadow-2xl animate-scale-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Change Password</h2>
            <p className="text-xs text-muted-foreground">
              {user.full_name ? `${user.full_name} (@${user.username})` : `@${user.username}`}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-muted-foreground">New Password *</label>
              <button
                type="button"
                onClick={handleGenerate}
                className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
              >
                <RefreshCw className="h-3 w-3" /> Generate
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="game-input pr-10"
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground">
            This will immediately override the login password for this account.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-neon px-6 py-2 text-sm"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Set Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
