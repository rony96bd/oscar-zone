import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchOrders, updateOrderStatus, migrateGuestOrderToUser } from '@/services/orders'
import { Search, Filter, RefreshCw, ChevronRight, Clock, CheckCircle, XCircle, UserCheck, Plus } from 'lucide-react'
import { cn, formatCurrency, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types'
import { CreateOrderModal } from '@/components/admin/CreateOrderModal'
import { usePermission } from '@/hooks/usePermission'

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All Orders', value: '' },
  { label: 'Pending', value: 'pending_payment_review' },
  { label: 'Approve', value: 'completed' },
  { label: 'Reject', value: 'rejected' },
]

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', status, search, page],
    queryFn: () => fetchOrders(page, {
      status: status || undefined,
      search: search || undefined,
    }),
    refetchInterval: 30000,
  })

  const orders = data?.data || []
  const total = data?.count || 0

  const statusMutation = useMutation({
    mutationFn: ({ orderId, newStatus }: { orderId: string; newStatus: OrderStatus }) =>
      updateOrderStatus(orderId, newStatus),
    onSuccess: () => {
      toast.success('Order status updated')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['active-accounting'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const canManage = usePermission('manage_orders')

  const QUICK_ACTIONS: { label: string; status: OrderStatus; icon: any; color: string }[] = [
    { label: 'Approve', status: 'completed', icon: CheckCircle, color: 'text-neon-green' },
    { label: 'Reject', status: 'rejected', icon: XCircle, color: 'text-destructive' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Orders</h1>
          <p className="text-muted-foreground text-sm">{total} total orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost-neon px-3 py-2 text-sm">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-neon px-4 py-2 text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" /> Create Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={status} onChange={e => { setStatus(e.target.value as any); setPage(0) }} className="game-input">
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Search order, username, name..." className="game-input pl-10" />
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : orders.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">No orders found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order: any) => (
            <div key={order.id} className="glass-card p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Order info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-gaming font-bold text-white text-sm">{order.game?.name}</span>
                    <span className={getOrderStatusClass(order.status)}>{getOrderStatusLabel(order.status)}</span>
                    {order.is_guest && <span className="badge text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">Guest</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.order_number} • {order.is_guest ? ` ${order.username}` : ` ${order.profile?.full_name || 'User'}`} •
                    {formatRelativeTime(order.created_at)}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right lg:min-w-[100px]">
                  <p className="font-bold text-white">{Math.ceil(order.final_game_credit)}</p>
                  <p className="text-xs text-muted-foreground">${order.base_amount} paid</p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-1 flex-wrap flex-col sm:flex-row">
                  {canManage && QUICK_ACTIONS.filter(a => {
                    const allowed: Record<string, string[]> = {
                      pending_payment_review: ['completed', 'rejected'],
                    }
                    return allowed[order.status]?.includes(a.status)
                  }).map(({ label, status: s, icon: Icon, color }) => (
                    <button
                      key={s}
                      onClick={() => statusMutation.mutate({ orderId: order.id, newStatus: s })}
                      disabled={statusMutation.isPending}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/30 transition-colors ${color}`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </button>
                  ))}
                  <Link to={`/admin/orders/${order.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/30 transition-colors text-muted-foreground"
                  >
                    Details <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost-neon px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm text-muted-foreground">Page {page + 1} of {Math.ceil(total / 20)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * 20 >= total} className="btn-ghost-neon px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
      
      <CreateOrderModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  )
}
