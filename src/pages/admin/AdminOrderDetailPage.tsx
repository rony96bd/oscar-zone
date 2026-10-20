import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchOrderById, updateOrderStatus, migrateGuestOrderToUser, updateOrderFields, deleteOrder } from '@/services/orders'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatPoints, formatDateTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
import { CheckCircle, ExternalLink, UserCheck, Loader2, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getScreenshotSignedUrl } from '@/services/r2'
import { useState } from 'react'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/stores/authStore'

function ScreenshotViewer({ path }: { path: string }) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['screenshot-url', path],
    queryFn: () => getScreenshotSignedUrl(path),
    staleTime: 1000 * 60 * 5 // 5 mins
  })

  if (isLoading) return <p className="text-xs text-muted-foreground animate-pulse">Loading screenshot...</p>
  if (!url) return <p className="text-xs text-destructive">Failed to load screenshot</p>

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex flex-col gap-2 group">
      <div className="relative h-32 w-32 rounded-lg overflow-hidden border border-border group-hover:border-primary transition-colors">
        <img src={url} alt="Screenshot" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <ExternalLink className="h-5 w-5 text-white" />
        </div>
      </div>
      <span className="text-xs text-primary group-hover:underline">View Full Image</span>
    </a>
  )
}

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const canManage = usePermission('manage_orders')
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [migrateUserId, setMigrateUserId] = useState('')

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    base_amount: '',
    final_game_credit: '',
    customer_payment_tag: '',
    status: '' as OrderStatus | '',
    admin_note: '',
  })
  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  const { profile } = useAuthStore()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: OrderStatus; note?: string }) =>
      updateOrderStatus(id!, status, note, profile?.id),
    onSuccess: () => { 
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['order', id] }) 
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['active-accounting'] })
      qc.invalidateQueries({ queryKey: ['game-point-balances'] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const editMutation = useMutation({
    mutationFn: () => updateOrderFields(id!, {
      username: editForm.username.trim() || undefined,
      base_amount: editForm.base_amount !== '' ? Number(editForm.base_amount) : undefined,
      final_game_credit: editForm.final_game_credit !== '' ? Number(editForm.final_game_credit) : undefined,
      customer_payment_tag: editForm.customer_payment_tag.trim() || undefined,
      status: (editForm.status || undefined) as OrderStatus | undefined,
      admin_note: editForm.admin_note || undefined,
    }),
    onSuccess: () => {
      toast.success('Order updated successfully')
      setEditOpen(false)
      qc.invalidateQueries({ queryKey: ['order', id] })
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['active-accounting'] })
      qc.invalidateQueries({ queryKey: ['game-point-balances'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update order'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrder(id!),
    onSuccess: () => {
      toast.success('Order deleted successfully')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      navigate('/admin/orders')
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete order'),
  })

  const migrateMutation = useMutation({
    mutationFn: () => migrateGuestOrderToUser(id!, migrateUserId),
    onSuccess: () => { toast.success('Order migrated to user account'); qc.invalidateQueries({ queryKey: ['order', id] }) },
    onError: () => toast.error('Failed to migrate order'),
  })

  if (isLoading) return <PageLoader />
  if (!order) return <div className="text-center py-12 text-muted-foreground">Order not found</div>

  const o = order as any
  const ALLOWED: Record<string, OrderStatus[]> = {
    pending_payment_review: ['completed', 'rejected'],
    completed: [],
    rejected: []
  }
  const allowedTransitions = ALLOWED[o.status] || []

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-gaming font-bold text-white">{o.order_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={getOrderStatusClass(o.status)}>{getOrderStatusLabel(o.status)}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <>
              <button
                onClick={() => {
                  setEditForm({
                    username: o.username || '',
                    base_amount: String(o.base_amount ?? ''),
                    final_game_credit: String(o.final_game_credit ?? ''),
                    customer_payment_tag: o.customer_payment_tag || '',
                    status: o.status || '',
                    admin_note: o.admin_note || '',
                  })
                  setEditOpen(true)
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
          <button onClick={() => navigate(-1)} className="btn-ghost-neon px-4 py-2 text-sm">Back</button>
        </div>
      </div>

      {/* Payment Screenshot */}
      {(o.payment_screenshot_key || o.payment_screenshot_path) && (
        <div className="glass-card p-4">
          <h2 className="font-semibold text-white mb-3 text-sm">Payment Screenshot</h2>
          <ScreenshotViewer path={(o.payment_screenshot_key || o.payment_screenshot_path)!} />
        </div>
      )}

      {/* Order Info */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">Order Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Game', value: o.game?.name },
            { label: 'Username', value: o.username },
            { label: 'Payment Method', value: (o.is_free_play || o.admin_note?.includes('Free Play') || (o.base_amount === 0 && o.final_game_credit > 0)) ? '🎁 Free Play (No Payment Method)' : (o.payment_method?.name || '—') },
            { label: 'Payment Tag / Name', value: o.customer_payment_tag },
            { label: 'Type', value: (o.is_free_play || o.admin_note?.includes('Free Play')) ? '🎁 Free Play' : (o.is_guest ? 'Guest Order' : 'Registered User') },
            ...(o.is_guest ? [
              { label: 'Guest Username', value: o.username },
            ] : [
              { label: 'Customer', value: o.profile?.full_name },
            ]),
            ...(o.admin_note ? [
              { label: 'Admin Note', value: o.admin_note },
            ] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bonus */}
      <div className="bonus-preview">
        <h2 className="font-semibold text-white mb-4">Bonus Breakdown</h2>
        <div className="bonus-line">
          <span className="text-muted-foreground">
            {(o.is_free_play || o.admin_note?.includes('Free Play') || (o.base_amount === 0 && o.final_game_credit > 0)) ? 'Deposit Paid' : 'Paid'}
          </span>
          <span>{formatCurrency(o.base_amount)}</span>
        </div>
        {o.regular_bonus_pct > 0 && <div className="bonus-line"><span className="text-muted-foreground">Regular Bonus ({o.regular_bonus_pct}%)</span><span className="text-neon-green">+{formatCurrency(o.regular_bonus_amount)}</span></div>}
        {o.promo_bonus_pct > 0 && <div className="bonus-line"><span className="text-muted-foreground">Promo Bonus ({o.promo_bonus_pct}%)</span><span className="text-neon-gold">+{formatCurrency(o.promo_bonus_amount)}</span></div>}
        <div className="bonus-total"><span>Total Points</span><span className="text-xl text-gradient-green font-mono">{formatPoints(o.final_game_credit)}</span></div>
      </div>

      {/* Status Actions */}
      {allowedTransitions.length > 0 && canManage && (
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-4">Update Status</h2>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add admin note (optional)..."
            className="game-input mb-4 h-20 resize-none"
          />
          <div className="flex flex-wrap gap-2">
            {allowedTransitions.map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate({ status: s, note })}
                disabled={statusMutation.isPending}
                className={s === 'rejected' || s === 'cancelled' ? 'border border-destructive/40 text-destructive px-4 py-2 rounded-lg text-sm hover:bg-destructive/10 transition-colors' : 'btn-neon px-4 py-2 text-sm'}
              >
                {statusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}
                {getOrderStatusLabel(s)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Guest Migration */}
      {o.is_guest && !o.user_id && (
        <div className="glass-card p-6 border border-neon-gold/30">
          <h2 className="font-semibold text-white mb-2 flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-neon-gold" /> Migrate to User Account
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Transfer this guest order to a registered user account.</p>
          <div className="flex gap-3">
            <input
              type="text"
              value={migrateUserId}
              onChange={e => setMigrateUserId(e.target.value)}
              placeholder="User ID or email..."
              className="game-input flex-1"
            />
            <button
              onClick={() => migrateMutation.mutate()}
              disabled={!migrateUserId || migrateMutation.isPending}
              className="btn-neon-gold px-4 py-2.5 text-sm"
            >
              {migrateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Migrate
            </button>
          </div>
        </div>
      )}

      {/* Status History */}
      {o.status_history?.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-4">Status History</h2>
          <div className="space-y-3">
            {o.status_history.map((h: any) => (
              <div key={h.id} className="flex gap-3">
                <CheckCircle className="h-4 w-4 text-neon-green mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{getOrderStatusLabel(h.status)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}{h.changed_by_profile && ` by ${h.changed_by_profile.full_name}`}</p>
                  {h.note && <p className="text-xs text-muted-foreground mt-0.5">{h.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditOpen(false)}>
          <div className="glass-card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Edit Order</h2>
              <button onClick={() => setEditOpen(false)} className="text-muted-foreground hover:text-white">
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
                onClick={() => setEditOpen(false)}
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
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)}>
          <div className="glass-card w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white">Delete Order?</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete order <span className="text-white font-mono font-semibold">{o.order_number}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 btn-ghost-neon py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate()}
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
    </div>
  )
}
