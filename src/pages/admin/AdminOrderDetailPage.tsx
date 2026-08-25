import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchOrderById, updateOrderStatus, migrateGuestOrderToUser } from '@/services/orders'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatDateTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
import { CheckCircle, ExternalLink, UserCheck, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getScreenshotSignedUrl } from '@/services/r2'
import { useState } from 'react'
import { toast } from 'sonner'
import type { OrderStatus } from '@/types'

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
  const qc = useQueryClient()
  const [note, setNote] = useState('')
  const [migrateUserId, setMigrateUserId] = useState('')

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id!),
    enabled: !!id,
  })

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: OrderStatus; note?: string }) =>
      updateOrderStatus(id!, status, note),
    onSuccess: () => { 
      toast.success('Status updated'); 
      qc.invalidateQueries({ queryKey: ['order', id] }) 
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['admin-stats'] })
      qc.invalidateQueries({ queryKey: ['active-accounting'] })
    },
    onError: () => toast.error('Failed to update status'),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-gaming font-bold text-white">{o.order_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={getOrderStatusClass(o.status)}>{getOrderStatusLabel(o.status)}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</span>
          </div>
        </div>
        <button onClick={() => navigate(-1)} className="btn-ghost-neon px-4 py-2 text-sm">Back</button>
      </div>

      {/* Payment Screenshot */}
      {o.payment_screenshot_path && (
        <div className="glass-card p-4">
          <h2 className="font-semibold text-white mb-3 text-sm">Payment Screenshot</h2>
          <ScreenshotViewer path={o.payment_screenshot_path} />
        </div>
      )}

      {/* Order Info */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">Order Details</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Game', value: o.game?.name },
            { label: 'Username', value: o.username },
            { label: 'Payment', value: o.payment_method?.name },
            { label: 'Type', value: o.is_guest ? 'Guest Order' : 'Registered User' },
            ...(o.is_guest ? [
              { label: 'Guest Username', value: o.username },
            ] : [
              { label: 'Customer', value: o.profile?.full_name },
              { label: 'Customer Email', value: o.profile?.email },
            ]),
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
        <div className="bonus-line"><span className="text-muted-foreground">Paid</span><span>{formatCurrency(o.base_amount)}</span></div>
        {o.regular_bonus_pct > 0 && <div className="bonus-line"><span className="text-muted-foreground">Regular Bonus ({o.regular_bonus_pct}%)</span><span className="text-neon-green">+{formatCurrency(o.regular_bonus_amount)}</span></div>}
        {o.promo_bonus_pct > 0 && <div className="bonus-line"><span className="text-muted-foreground">Promo Bonus ({o.promo_bonus_pct}%)</span><span className="text-neon-gold">+{formatCurrency(o.promo_bonus_amount)}</span></div>}
        <div className="bonus-total"><span>Total Credit</span><span className="text-xl text-gradient-green">{Math.round(o.final_game_credit)}</span></div>
      </div>

      {/* Status Actions */}
      {allowedTransitions.length > 0 && (
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
    </div>
  )
}
