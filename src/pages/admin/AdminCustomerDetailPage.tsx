import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCustomerDetail, updateCustomerStatus, assignCustomerGame, updateCustomerProfile, deleteCustomer } from '@/services/admin'
import { fetchGames } from '@/services/games'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
import { Shield, ShoppingBag, Star, Lock, Edit2, X, Check, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editData, setEditData] = useState({ full_name: '', username: '' })

  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => fetchCustomerDetail(id!),
    enabled: !!id,
  })

  useEffect(() => {
    if (customer) {
      setEditData({ full_name: customer.full_name || '', username: customer.username || '' })
    }
  }, [customer])

  const { data: games } = useQuery({
    queryKey: ['games-active'],
    queryFn: fetchGames,
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateCustomerStatus(id!, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['admin-customer', id] }) },
  })
  
  const updateProfileMutation = useMutation({
    mutationFn: (data: { full_name: string; username: string }) => updateCustomerProfile(id!, data),
    onSuccess: () => {
      toast.success('Profile updated successfully')
      setIsEditingProfile(false)
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update profile')
  })

  const updateVisibilityMutation = useMutation({
    mutationFn: async (is_hidden: boolean) => {
      const { error } = await supabase.from('profiles').update({ is_hidden_from_public: is_hidden }).eq('id', id!)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Visibility updated')
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update visibility')
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteCustomer(id!),
    onSuccess: () => {
      toast.success('Customer and all related data deleted successfully')
      navigate('/admin/customers')
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete customer')
  })

  const passwordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { data, error } = await supabase.functions.invoke('admin-set-password', {
        body: { userId: id, newPassword: password }
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
    onSuccess: () => {
      toast.success('Password updated successfully')
      setNewPassword('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update password')
    }
  })

  const assignGameMutation = useMutation({
    mutationFn: (data: { gameId: string; username: string; status: string; password?: string }) => 
      assignCustomerGame(id!, data.gameId, data.username, data.password),
    onSuccess: () => {
      toast.success('Game account linked successfully')
      qc.invalidateQueries({ queryKey: ['admin-customer', id] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  if (isLoading) return <PageLoader />
  if (!customer) return <div className="text-center text-muted-foreground py-12">Customer not found</div>

  const c = customer as any

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
          <span className="text-2xl font-gaming font-bold text-primary">{(c.full_name || c.username)?.charAt(0)?.toUpperCase() || '?'}</span>
        </div>
        <div className="flex-1">
          {isEditingProfile ? (
            <div className="space-y-2 max-w-sm">
              <input
                type="text"
                className="game-input text-sm py-1 px-2 w-full"
                placeholder="Full Name"
                value={editData.full_name}
                onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
              />
              <input
                type="text"
                className="game-input text-sm py-1 px-2 w-full"
                placeholder="Username"
                value={editData.username}
                onChange={(e) => setEditData({ ...editData, username: e.target.value })}
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => updateProfileMutation.mutate(editData)}
                  disabled={updateProfileMutation.isPending}
                  className="btn-neon px-3 py-1 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" /> Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingProfile(false)
                    setEditData({ full_name: c.full_name || '', username: c.username || '' })
                  }}
                  className="btn-ghost-neon px-3 py-1 text-xs"
                >
                  <X className="h-3 w-3 mr-1" /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-gaming font-bold text-white">{c.full_name || c.username || 'No Name'}</h1>
                {c.is_vip && <span className="text-neon-gold text-sm">★ VIP</span>}
                <button onClick={() => setIsEditingProfile(true)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-muted-foreground text-sm">@{c.username}</p>
              {c.telegram && <p className="text-xs text-muted-foreground">Telegram: {c.telegram}</p>}
            </>
          )}
        </div>
      </div>

      {/* Account Status */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">Account Status</h2>
        <div className="flex gap-2 mb-6">
          {['pending', 'active', 'suspended', 'restricted'].map(status => (
            <button
              key={status}
              onClick={() => statusMutation.mutate(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all capitalize ${
                c.account_status === status ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <h2 className="font-semibold text-white mb-4 pt-4 border-t border-border flex items-center gap-2">
          <Lock className="h-4 w-4" /> Security
        </h2>
        <div className="flex flex-col gap-2 max-w-sm mb-6">
          <label className="text-xs text-muted-foreground">Force Password Reset</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="New Password (min 6 chars)" 
              className="game-input flex-1"
              onChange={(e) => setNewPassword(e.target.value)}
              value={newPassword}
            />
            <button
              onClick={() => passwordMutation.mutate(newPassword)}
              className="btn-neon px-4"
              disabled={!newPassword || newPassword.length < 6 || passwordMutation.isPending}
            >
              {passwordMutation.isPending ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>

        <h2 className="font-semibold text-white mb-4 pt-4 border-t border-border flex items-center gap-2">
          <Trophy className="h-4 w-4 text-neon-gold" /> Public Visibility
        </h2>
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 max-w-md">
          <div>
            <p className="text-sm font-medium text-white">Hide from public ticker?</p>
            <p className="text-[10px] text-muted-foreground">If hidden, their loads and cashouts won't appear on the live ticker.</p>
          </div>
          <button
            onClick={() => updateVisibilityMutation.mutate(!c.is_hidden_from_public)}
            disabled={updateVisibilityMutation.isPending}
            className={`w-12 h-6 rounded-full relative transition-colors ${c.is_hidden_from_public ? 'bg-primary' : 'bg-white/20'}`}
          >
            <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${c.is_hidden_from_public ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Recent Orders</h2>
          <Link to={`/admin/orders?user=${id}`} className="text-xs text-primary">View All</Link>
        </div>
        <div className="space-y-2">
          {(c.orders || []).slice(0, 5).map((order: any) => (
            <Link key={order.id} to={`/admin/orders/${order.id}`}
              className="flex justify-between items-center py-2 border-b border-border hover:text-primary transition-colors"
            >
              <div>
                <p className="text-sm text-foreground">{order.game?.name} — {order.username}</p>
                <p className="text-xs text-muted-foreground">{order.order_number} • {formatRelativeTime(order.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-white">{formatCurrency(order.final_game_credit)}</p>
                <span className={getOrderStatusClass(order.status)}>{getOrderStatusLabel(order.status)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile Info */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">Profile Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Referral Code', value: c.referral_code },
            { label: 'Role', value: c.role },
            { label: 'Custom Bonus', value: c.custom_bonus_percentage != null ? `${c.custom_bonus_percentage}%` : 'Default' },
            { label: 'Member Since', value: formatRelativeTime(c.created_at) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-medium text-white">{value || 'N/A'}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Customer Games (Game IDs) */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-neon-gold" /> In-Game Accounts</h2>
        
        {/* List of their games */}
        <div className="space-y-2 mb-6">
          {(c.customer_games || []).map((cg: any) => (
            <div key={cg.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
              <div>
                <p className="text-sm font-semibold text-white">{cg.game?.name || 'Unknown Game'}</p>
                <p className="text-xs font-mono mt-0.5">
                  <span className="text-primary mr-2">{cg.username}</span>
                  {cg.game_password && <span className="text-muted-foreground">Pass: {cg.game_password}</span>}
                </p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full uppercase font-bold ${cg.status === 'active' ? 'bg-neon-green/20 text-neon-green' : 'bg-destructive/20 text-destructive'}`}>
                {cg.status}
              </span>
            </div>
          ))}
          {(!c.customer_games || c.customer_games.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-2">No game accounts linked yet.</p>
          )}
        </div>

        {/* Add new game form */}
        <form onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          const gameId = fd.get('game_id') as string
          const username = fd.get('username') as string
          const password = fd.get('password') as string
          if (!gameId || !username) return toast.error('Fill required fields')
          assignGameMutation.mutate({ gameId, username, status: 'active', password })
          e.currentTarget.reset()
        }} className="p-4 rounded-xl border border-border bg-black/20 space-y-4">
          <h3 className="text-sm font-semibold text-white">Assign New Game Account</h3>
          <div className="flex flex-col sm:flex-row gap-3">
              <select name="game_id" className="game-input bg-black/40" required>
                <option value="">-- Select Game --</option>
                {games?.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <input type="text" name="username" placeholder="In-Game Username" className="game-input flex-1" required />
              <input type="text" name="password" placeholder="Password (default: aaa111)" className="game-input flex-1" />
              <button type="submit" disabled={assignGameMutation.isPending} className="btn-neon px-4">
                Add
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">This username will be selectable by the customer when loading funds, and verified for guests.</p>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-6 border-red-500/30 bg-red-500/5">
        <h2 className="font-semibold text-red-500 mb-4 flex items-center gap-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting a customer will permanently remove their account, all related transactions, orders, cashout requests, and linked games. This action cannot be undone.
        </p>
        <button
          onClick={() => {
            if (window.confirm('Are you absolutely sure you want to delete this customer? This action is irreversible.')) {
              deleteMutation.mutate()
            }
          }}
          disabled={deleteMutation.isPending}
          className="btn-ghost text-red-500 border border-red-500/30 hover:bg-red-500/20 px-4 py-2"
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Customer'}
        </button>
      </div>
    </div>
  )
}
