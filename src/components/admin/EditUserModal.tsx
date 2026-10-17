import { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import type { Profile, UserRole, AccountStatus } from '@/types'

interface EditUserModalProps {
  user: Profile | null
  isOpen: boolean
  onClose: () => void
  currentUserId?: string
}

export function EditUserModal({ user, isOpen, onClose, currentUserId }: EditUserModalProps) {
  const qc = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [telegram, setTelegram] = useState('')
  const [role, setRole] = useState<UserRole>('support_agent')
  const [status, setStatus] = useState<AccountStatus>('active')

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setUsername(user.username || '')
      setPhone(user.phone || '')
      setTelegram(user.telegram || '')
      setRole(user.role || 'support_agent')
      setStatus(user.account_status || 'active')
    }
  }, [user])

  if (!isOpen || !user) return null

  const isSelf = currentUserId === user.id

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      toast.error('Username is required')
      return
    }

    setIsSubmitting(true)
    try {
      const updates: Partial<Profile> = {
        full_name: fullName.trim() || undefined,
        username: username.trim(),
        phone: phone.trim() || undefined,
        telegram: telegram.trim() || undefined,
        account_status: status,
      }

      // Prevent demoting or modifying own role directly
      if (!isSelf) {
        updates.role = role
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error

      toast.success('User updated successfully')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to update user')
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

        <h2 className="mb-6 text-xl font-bold text-white flex items-center gap-2">
          Edit Staff / User
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="game-input"
              placeholder="e.g. John Doe"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="game-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSelf || user.role === 'super_admin'}
                className={cn('game-input', (isSelf || user.role === 'super_admin') && 'opacity-60 cursor-not-allowed')}
              >
                <option value="support_agent">Support Agent</option>
                <option value="admin">Admin</option>
                {user.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AccountStatus)}
                disabled={isSelf}
                className={cn('game-input', isSelf && 'opacity-60 cursor-not-allowed')}
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="restricted">Restricted</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="game-input"
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Telegram</label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="game-input"
                placeholder="@username"
              />
            </div>
          </div>

          {user.email && (
            <div>
              <label className="text-xs text-muted-foreground block">Email (read-only)</label>
              <p className="text-xs text-white/70 bg-white/5 p-2 rounded-lg border border-white/10 break-all select-all">
                {user.email}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
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
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
