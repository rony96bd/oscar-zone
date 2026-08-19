import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchCustomerDetail, updateCustomerStatus, assignCustomerGame } from '@/services/admin'
import { fetchGuestOrders } from '@/services/orders'
import { fetchGames } from '@/services/games'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { Shield, ShoppingBag, Star } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()

  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => fetchCustomerDetail(id!),
    enabled: !!id,
  })

  const { data: games } = useQuery({
    queryKey: ['games-active'],
    queryFn: fetchGames,
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateCustomerStatus(id!, status),
    onSuccess: () => { toast.success('Status updated'); qc.invalidateQueries({ queryKey: ['admin-customer', id] }) },
  })

  const assignGameMutation = useMutation({
    mutationFn: (data: { gameId: string; username: string; status: string }) => 
      assignCustomerGame(id!, data.gameId, data.username),
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
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-gaming font-bold text-white">{c.full_name || c.username || 'No Name'}</h1>
            {c.is_vip && <span className="text-neon-gold text-sm">★ VIP</span>}
          </div>
          <p className="text-muted-foreground text-sm">@{c.username}</p>
          {c.telegram && <p className="text-xs text-muted-foreground">Telegram: {c.telegram}</p>}
        </div>
      </div>

      {/* Account Status */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">Account Status</h2>
        <div className="flex gap-2">
          {['active', 'suspended', 'restricted'].map(status => (
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
                <p className="text-xs text-primary font-mono">{cg.username}</p>
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
          if (!gameId || !username) return toast.error('Fill required fields')
          assignGameMutation.mutate({ gameId, username, status: 'active' })
          e.currentTarget.reset()
        }} className="p-4 rounded-xl border border-border bg-black/20 space-y-4">
          <h3 className="text-sm font-semibold text-white">Assign New Game Account</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select name="game_id" className="game-input flex-1" required>
              <option value="">-- Select Game --</option>
              {games?.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <input type="text" name="username" placeholder="In-Game Username" className="game-input flex-1" required />
            <button type="submit" disabled={assignGameMutation.isPending} className="btn-neon px-4">
              Add
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">This username will be selectable by the customer when loading funds, and verified for guests.</p>
        </form>
      </div>
    </div>
  )
}
