import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchOrders, updateOrderStatus, updateOrderFields, deleteOrder } from '@/services/orders'
import { Search, RefreshCw, ChevronRight, CheckCircle, XCircle, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { formatCurrency, formatPoints, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
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

  // Edit modal state
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    username: '',
    base_amount: '',
    final_game_credit: '',
    customer_payment_tag: '',
    status: '' as OrderStatus | '',
    admin_note: '',
  })

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

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
      qc.invalidateQueries({ queryKey: ['game-point-balances'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const editMutation = useMutation({
    mutationFn: () => updateOrderFields(editTarget.id, {
      username: editForm.username.trim() || undefined,
      base_amount: editForm.base_amount !== '' ? Number(editForm.base_amount) : undefined,
      final_game_credit: editForm.final_game_credit !== '' ? Number(editForm.final_game_credit) : undefined,
      customer_payment_tag: editForm.customer_payment_tag.trim() || undefined,
      status: (editForm.status || undefined) as OrderStatus | undefined,
      admin_note: editForm.admin_note || undefined,
    }),
    onSuccess: () => {
      toast.success('Order updated successfully')
      setEditTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['active-accounting'] })
      qc.invalidateQueries({ queryKey: ['game-point-balances'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update order'),
  })

  const deleteMutation = useMutation({
    mutationFn: (targetId: string) => deleteOrder(targetId),
    onSuccess: (_, deletedId) => {
      toast.success('Order deleted successfully')
      setDeleteTarget(null)
      qc.setQueriesData({ queryKey: ['admin-orders'] }, (old: any) => {
        if (!old?.data) return old
        return {
          ...old,
          data: old.data.filter((item: any) => item.id !== deletedId),
          count: Math.max(0, (old.count || 0) - 1),
        }
      })
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['active-accounting'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete order'),
  })

  const canManage = usePermission('manage_orders')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Orders</h1>
          <p className="text-muted-foreground text-sm">{total} total orders</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="btn-ghost-neon px-3 py-2 text-sm" title="Refresh">
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
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-gaming font-bold text-white text-sm">{order.game?.name}</span>
                    <span className={getOrderStatusClass(order.status)}>{getOrderStatusLabel(order.status)}</span>
                    {order.is_guest && <span className="badge text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full">Guest</span>}
                    {(order.is_free_play || order.admin_note?.includes('Free Play') || (order.base_amount === 0 && order.final_game_credit > 0)) && (
                      <span className="badge text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                        🎁 Free Play
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {order.order_number} • {order.is_guest ? ` ${order.username}` : ` ${order.profile?.full_name || 'User'}`} •
                    {formatRelativeTime(order.created_at)}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right lg:min-w-[100px]">
                  <p className="font-bold text-white font-mono">{formatPoints(order.final_game_credit)}</p>
                  <p className="text-xs text-muted-foreground">
                    {(order.is_free_play || order.admin_note?.includes('Free Play') || (order.base_amount === 0 && order.final_game_credit > 0)) 
                      ? '🎁 Free Play' 
                      : `$${order.base_amount} paid`}
                  </p>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-1 flex-wrap items-center">
                  {canManage && order.status === 'pending_payment_review' && (
                    <>
                      <button
                        onClick={() => statusMutation.mutate({ orderId: order.id, newStatus: 'completed' })}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/30 transition-colors text-neon-green"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => statusMutation.mutate({ orderId: order.id, newStatus: 'rejected' })}
                        disabled={statusMutation.isPending}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted/30 transition-colors text-destructive"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {canManage && (
                    <>
                      <button
                        onClick={() => {
                          setEditForm({
                            username: order.username || '',
                            base_amount: String(order.base_amount ?? ''),
                            final_game_credit: String(order.final_game_credit ?? ''),
                            customer_payment_tag: order.customer_payment_tag || '',
                            status: order.status || '',
                            admin_note: order.admin_note || '',
                          })
                          setEditTarget(order)
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                        title="Edit Order"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(order)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete Order"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </>
                  )}
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

      {/* Edit Order Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditTarget(null)}>
          <div className="glass-card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Edit Order</h2>
                <p className="text-xs text-muted-foreground font-mono">{editTarget.order_number}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Game Username</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))}
                  className="game-input w-full"
                  placeholder="Game username"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Base Amount ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.base_amount}
                    onChange={e => setEditForm(f => ({ ...f, base_amount: e.target.value }))}
                    className="game-input w-full"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Final Points</label>
                  <input
                    type="number"
                    step="any"
                    value={editForm.final_game_credit}
                    onChange={e => setEditForm(f => ({ ...f, final_game_credit: e.target.value }))}
                    className="game-input w-full"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Payment Tag / Customer Name</label>
                <input
                  type="text"
                  value={editForm.customer_payment_tag}
                  onChange={e => setEditForm(f => ({ ...f, customer_payment_tag: e.target.value }))}
                  className="game-input w-full"
                  placeholder="e.g. $Cashtag or Customer Name"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as OrderStatus }))}
                  className="game-input w-full"
                >
                  <option value="pending_payment_review">Pending Payment Review</option>
                  <option value="completed">Completed / Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="processing">Processing</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Admin Note</label>
                <textarea
                  value={editForm.admin_note}
                  onChange={e => setEditForm(f => ({ ...f, admin_note: e.target.value }))}
                  className="game-input w-full h-20 resize-none"
                  placeholder="Optional admin note..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex-1 btn-ghost-neon py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending}
                className="flex-1 btn-neon py-2 text-sm flex items-center justify-center gap-2"
              >
                {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="glass-card w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white">Delete Order?</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete order <span className="text-white font-mono font-semibold">{deleteTarget.order_number}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 btn-ghost-neon py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-destructive text-white hover:bg-destructive/80 transition-colors flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <CreateOrderModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </div>
  )
}
