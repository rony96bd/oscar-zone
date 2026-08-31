import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import type { StaffPermissionKey, StaffPermissions, Profile } from '@/types'
import { X, ShieldCheck } from 'lucide-react'

interface Permission {
  key: StaffPermissionKey
  label: string
  description: string
  group: string
}

const ALL_PERMISSIONS: Permission[] = [
  { key: 'view_orders',       label: 'View Orders',          description: 'See the orders list and order details',         group: 'Orders' },
  { key: 'manage_orders',     label: 'Manage Orders',        description: 'Update order status (approve / reject)',        group: 'Orders' },
  { key: 'view_cashout',      label: 'View Cashout',         description: 'See cashout requests',                          group: 'Cashout' },
  { key: 'manage_cashout',    label: 'Manage Cashout',       description: 'Approve or reject cashout requests',            group: 'Cashout' },
  { key: 'view_customers',    label: 'View Customers',       description: 'Browse the customer list and profiles',         group: 'Customers' },
  { key: 'manage_customers',  label: 'Manage Customers',     description: 'Edit, ban, or suspend customer accounts',       group: 'Customers' },
  { key: 'view_chat',         label: 'Live Chat',            description: 'View and reply to customer live chats',         group: 'Chat' },
  { key: 'view_games',        label: 'View Games',           description: 'See the games catalog and player accounts',     group: 'Games' },
  { key: 'manage_games',      label: 'Manage Games',         description: 'Add / edit games and approve game requests',    group: 'Games' },
  { key: 'view_free_plays',   label: 'View Free Plays',      description: 'See free play requests',                        group: 'Free Plays' },
  { key: 'manage_free_plays', label: 'Manage Free Plays',    description: 'Approve or reject free play requests',          group: 'Free Plays' },
  { key: 'view_reports',      label: 'Reports & Accounting', description: 'View revenue reports and accounting data',      group: 'Reports' },
  { key: 'send_notifications',label: 'Send Notifications',   description: 'Broadcast notifications to customers',          group: 'Reports' },
]

const GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))]

interface Props {
  staff: Profile
  isOpen: boolean
  onClose: () => void
}

export function StaffPermissionsModal({ staff, isOpen, onClose }: Props) {
  const qc = useQueryClient()
  const [perms, setPerms] = useState<StaffPermissions>(staff.permissions ?? {})
  const [isSaving, setIsSaving] = useState(false)

  if (!isOpen) return null

  const toggle = (key: StaffPermissionKey) => {
    setPerms(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: perms })
        .eq('id', staff.id)
      if (error) throw error
      toast.success('Permissions saved!')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save permissions')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-lg font-bold text-white">Staff Permissions</h2>
              <p className="text-xs text-muted-foreground">{staff.full_name || staff.username}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Permissions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {GROUPS.map(group => (
            <div key={group}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{group}</h3>
              <div className="space-y-2">
                {ALL_PERMISSIONS.filter(p => p.group === group).map(p => (
                  <label
                    key={p.key}
                    className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-border hover:border-primary/30 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.description}</p>
                    </div>
                    {/* Toggle Switch */}
                    <div
                      onClick={() => toggle(p.key)}
                      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${perms[p.key] ? 'bg-primary' : 'bg-white/10'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${perms[p.key] ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-border">
          <button onClick={onClose} className="btn-ghost-neon px-5 py-2">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="btn-neon px-6 py-2">
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  )
}
