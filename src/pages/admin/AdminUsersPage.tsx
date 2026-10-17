import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCustomers, deleteCustomer } from '@/services/admin'
import { Shield, Plus, ShieldCheck, Pencil, KeyRound, Trash2 } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { CreateUserModal } from '@/components/admin/CreateUserModal'
import { EditUserModal } from '@/components/admin/EditUserModal'
import { ChangeUserPasswordModal } from '@/components/admin/ChangeUserPasswordModal'
import { StaffPermissionsModal } from '@/components/admin/StaffPermissionsModal'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import type { Profile } from '@/types'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { toast } from 'sonner'

export default function AdminUsersPage() {
  const { isSupportAgent, profile: currentAdmin } = useAuthStore()
  const qc = useQueryClient()

  if (isSupportAgent()) {
    return <Navigate to="/admin" replace />
  }

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedStaffForPerms, setSelectedStaffForPerms] = useState<Profile | null>(null)
  const [userToEdit, setUserToEdit] = useState<Profile | null>(null)
  const [userToChangePassword, setUserToChangePassword] = useState<Profile | null>(null)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => fetchCustomers({ search: '', role: 'admin,support_agent,super_admin' }),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteCustomer(userId),
    onSuccess: () => {
      toast.success('Staff user deleted successfully')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setUserToDelete(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete user')
    }
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
        <button onClick={() => setIsCreateModalOpen(true)} className="btn-neon text-sm px-4 py-2">
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(users as any[]).map((user: any) => {
            const isSelf = currentAdmin?.id === user.id
            const canDelete = !isSelf && user.role !== 'super_admin'

            return (
              <div key={user.id} className="glass-card p-5 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-primary text-lg">{(user.full_name || user.username)?.charAt(0)?.toUpperCase() || '?'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-white truncate">{user.full_name || user.username || 'No Name'}</p>
                        <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setUserToEdit(user as Profile)}
                        title="Edit user"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setUserToChangePassword(user as Profile)}
                        title="Change password"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => setUserToDelete(user as Profile)}
                          title="Delete user"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-xs px-2 py-0.5 rounded border', 
                      user.role === 'super_admin' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      user.role === 'admin' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    )}>
                      {user.role}
                    </span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                      user.account_status === 'active' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                      'bg-destructive/20 text-destructive border-destructive/30'
                    )}>{user.account_status}</span>
                    {isSelf && (
                      <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                        You
                      </span>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground pt-3 border-t border-white/10 flex flex-col gap-1">
                    {user.email && <p className="truncate">Email: {user.email}</p>}
                    {user.phone && <p>Phone: {user.phone}</p>}
                    {user.telegram && <p>Telegram: {user.telegram}</p>}
                    <p>Created: {formatRelativeTime(user.created_at)}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex flex-col gap-2">
                  {user.role === 'support_agent' && (
                    <button
                      onClick={() => setSelectedStaffForPerms(user as Profile)}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Edit Permissions
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setUserToEdit(user as Profile)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
                    >
                      <Pencil className="h-3 w-3" /> Edit Profile
                    </button>
                    <button
                      onClick={() => setUserToChangePassword(user as Profile)}
                      className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-muted-foreground hover:text-primary hover:bg-primary/10 border border-white/10 transition-colors"
                    >
                      <KeyRound className="h-3 w-3" /> Password
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultRole="support_agent"
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={userToEdit}
        isOpen={!!userToEdit}
        onClose={() => setUserToEdit(null)}
        currentUserId={currentAdmin?.id}
      />

      {/* Change Password Modal */}
      <ChangeUserPasswordModal
        user={userToChangePassword}
        isOpen={!!userToChangePassword}
        onClose={() => setUserToChangePassword(null)}
      />

      {/* Staff Permissions Modal */}
      {selectedStaffForPerms && (
        <StaffPermissionsModal
          staff={selectedStaffForPerms}
          isOpen={!!selectedStaffForPerms}
          onClose={() => setSelectedStaffForPerms(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Delete Staff Account?"
        description={`Are you sure you want to delete ${userToDelete?.full_name || userToDelete?.username}? This will permanently remove their login and all associated data.`}
        confirmLabel="Delete User"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (userToDelete?.id) {
            deleteMutation.mutate(userToDelete.id)
          }
        }}
      />
    </div>
  )
}

