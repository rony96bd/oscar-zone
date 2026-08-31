import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCustomers } from '@/services/admin'
import { Shield, Plus, ShieldCheck } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { CreateUserModal } from '@/components/admin/CreateUserModal'
import { StaffPermissionsModal } from '@/components/admin/StaffPermissionsModal'
import type { Profile } from '@/types'

export default function AdminUsersPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchCustomers({ search: '', role: 'admin,support_agent,super_admin' }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Admin Users
          </h1>
          <p className="text-muted-foreground text-sm">Manage admins and support agents</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-neon text-sm px-4 py-2">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(users as any[]).map((user: any) => (
            <div key={user.id} className="glass-card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-primary text-lg">{(user.full_name || user.username)?.charAt(0)?.toUpperCase() || '?'}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{user.full_name || user.username || 'No Name'}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={cn('text-xs px-2 py-1 rounded border', 
                  user.role === 'super_admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  user.role === 'admin' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/30'
                )}>
                  {user.role}
                </span>
                <span className={cn('text-xs px-2 py-1 rounded-full border',
                  user.account_status === 'active' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                  'bg-destructive/20 text-destructive border-destructive/30'
                )}>{user.account_status}</span>
              </div>
              
              <div className="text-xs text-muted-foreground pt-3 border-t border-white/10 flex flex-col gap-1">
                {user.email && <p>Email: {user.email}</p>}
                {user.phone && <p>Phone: {user.phone}</p>}
                {user.telegram && <p>Telegram: {user.telegram}</p>}
                <p>Created: {formatRelativeTime(user.created_at)}</p>
              </div>

              {user.role === 'support_agent' && (
                <button
                  onClick={() => setSelectedStaff(user as Profile)}
                  className="mt-1 w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Edit Permissions
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateUserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} defaultRole="support_agent" />

      {selectedStaff && (
        <StaffPermissionsModal
          staff={selectedStaff}
          isOpen={!!selectedStaff}
          onClose={() => setSelectedStaff(null)}
        />
      )}
    </div>
  )
}
