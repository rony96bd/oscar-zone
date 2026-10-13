import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  X, Search, Receipt, ExternalLink, User, Gamepad2, 
  DollarSign, CheckCircle2, Clock, XCircle, ZoomIn, 
  RefreshCw, Tag, ChevronRight, AlertCircle, ArrowUpRight
} from 'lucide-react'
import { fetchPaymentMethodDeposits } from '@/services/payments'
import { getScreenshotSignedUrl } from '@/services/r2'
import { 
  cn, formatCurrency, formatDateTime, formatRelativeTime, 
  getOrderStatusClass, getOrderStatusLabel 
} from '@/lib/utils'
import type { PaymentMethod } from '@/types'

/* ────── Screenshot Thumbnail Component ────── */
function ScreenshotThumb({ 
  path, 
  onExpand 
}: { 
  path: string
  onExpand: (url: string) => void 
}) {
  const { data: url, isLoading } = useQuery({
    queryKey: ['deposit-screenshot-url', path],
    queryFn: () => getScreenshotSignedUrl(path),
    staleTime: 1000 * 60 * 15,
  })

  if (isLoading) {
    return <div className="h-10 w-10 rounded-lg bg-white/5 animate-pulse border border-white/10" />
  }

  if (!url) {
    return <span className="text-[11px] text-muted-foreground/40 italic">None</span>
  }

  return (
    <button
      type="button"
      onClick={() => onExpand(url)}
      className="relative group h-11 w-11 rounded-lg overflow-hidden border border-white/10 hover:border-primary transition-all flex-shrink-0 shadow-sm"
      title="Click to zoom screenshot"
    >
      <img src={url} alt="Proof" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
        <ZoomIn className="h-4 w-4 text-white" />
      </div>
    </button>
  )
}

interface PaymentMethodDepositsModalProps {
  method: PaymentMethod | null
  onClose: () => void
}

export function PaymentMethodDepositsModal({ 
  method, 
  onClose 
}: PaymentMethodDepositsModalProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'rejected'>('all')
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  const { data: deposits = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['payment-method-deposits', method?.id],
    queryFn: () => fetchPaymentMethodDeposits(method!.id),
    enabled: !!method?.id,
  })

  // Summary statistics
  const stats = useMemo(() => {
    let totalDeposited = 0
    let completedVolume = 0
    let completedCount = 0
    let pendingCount = 0
    let rejectedCount = 0

    deposits.forEach((d: any) => {
      const amount = Number(d.base_amount || 0)
      totalDeposited += amount
      if (d.status === 'completed') {
        completedVolume += amount
        completedCount++
      } else if (d.status === 'pending_payment_review' || d.status === 'payment_verified' || d.status === 'processing') {
        pendingCount++
      } else if (d.status === 'rejected' || d.status === 'cancelled') {
        rejectedCount++
      }
    })

    return {
      totalCount: deposits.length,
      totalDeposited,
      completedVolume,
      completedCount,
      pendingCount,
      rejectedCount,
    }
  }, [deposits])

  // Filtered deposits
  const filteredDeposits = useMemo(() => {
    return deposits.filter((d: any) => {
      // Status filter
      if (statusFilter === 'completed' && d.status !== 'completed') return false
      if (statusFilter === 'pending' && !['pending_payment_review', 'payment_verified', 'processing'].includes(d.status)) return false
      if (statusFilter === 'rejected' && !['rejected', 'cancelled'].includes(d.status)) return false

      // Search filter
      if (!search.trim()) return true
      const q = search.toLowerCase().trim()
      const orderNum = (d.order_number || '').toLowerCase()
      const gameUsername = (d.username || '').toLowerCase()
      const customerName = (d.profile?.full_name || '').toLowerCase()
      const customerUser = (d.profile?.username || '').toLowerCase()
      const customerEmail = (d.profile?.email || '').toLowerCase()
      const paymentTag = (d.customer_payment_tag || '').toLowerCase()
      const guestName = (d.guest_name || '').toLowerCase()
      const gameName = (d.game?.name || '').toLowerCase()

      return (
        orderNum.includes(q) ||
        gameUsername.includes(q) ||
        customerName.includes(q) ||
        customerUser.includes(q) ||
        customerEmail.includes(q) ||
        paymentTag.includes(q) ||
        guestName.includes(q) ||
        gameName.includes(q)
      )
    })
  }, [deposits, statusFilter, search])

  if (!method) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
          onClick={onClose} 
        />

        {/* Modal Window */}
        <div className="relative w-full max-w-5xl rounded-2xl bg-game-dark border border-game-border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-scale-in z-10">
          
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-white/10 flex items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-card/80 to-card/40 flex-shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 border border-white/15 flex-shrink-0 overflow-hidden shadow-inner">
                {method.logo_url ? (
                  <img src={method.logo_url} alt={method.name} className="h-10 w-10 object-contain" />
                ) : (
                  <span className="font-bold text-primary text-xl font-gaming">{method.name.substring(0, 2).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold font-gaming text-white tracking-wide">{method.name}</h2>
                  <span className={cn(
                    'text-xs px-2.5 py-0.5 rounded-full font-semibold',
                    method.is_active ? 'bg-neon-green/15 text-neon-green border border-neon-green/30' : 'bg-muted text-muted-foreground'
                  )}>
                    {method.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {method.is_agent && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-neon-gold/15 text-neon-gold border border-neon-gold/30">
                      Agent Method
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                  {method.tag && (
                    <span className="flex items-center gap-1 font-mono text-primary font-semibold">
                      <Tag className="h-3 w-3" /> {method.tag}
                    </span>
                  )}
                  {method.account_name && (
                    <span>Account: <strong className="text-white">{method.account_name}</strong></span>
                  )}
                  <span>Limit: ${method.minimum_amount} - ${method.maximum_amount}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isRefetching}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                title="Refresh deposits"
              >
                <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin text-primary")} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-black/30 border-b border-white/5 flex-shrink-0">
            <div className="glass-card p-3 rounded-xl border border-white/10">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Completed Volume</p>
              <p className="text-lg sm:text-xl font-bold text-neon-green mt-0.5">{formatCurrency(stats.completedVolume)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stats.completedCount} successful loads</p>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/10">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Total Received</p>
              <p className="text-lg sm:text-xl font-bold text-white mt-0.5">{formatCurrency(stats.totalDeposited)}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stats.totalCount} total submissions</p>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/10">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Pending Review</p>
              <p className={cn("text-lg sm:text-xl font-bold mt-0.5", stats.pendingCount > 0 ? "text-amber-400" : "text-white")}>
                {stats.pendingCount}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting staff action</p>
            </div>
            <div className="glass-card p-3 rounded-xl border border-white/10">
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">Rejected / Cancelled</p>
              <p className="text-lg sm:text-xl font-bold text-destructive mt-0.5">{stats.rejectedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Declined payments</p>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between border-b border-white/5 flex-shrink-0 bg-card/30">
            {/* Status tabs */}
            <div className="flex gap-1 p-1 bg-black/40 rounded-xl border border-white/5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                  statusFilter === 'all'
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                All ({deposits.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                  statusFilter === 'completed'
                    ? 'bg-neon-green/20 text-neon-green border border-neon-green/30'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                Completed ({stats.completedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                  statusFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                Pending ({stats.pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('rejected')}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap',
                  statusFilter === 'rejected'
                    ? 'bg-destructive/20 text-destructive border border-destructive/30'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                Rejected ({stats.rejectedCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sender, cashtag, order #..."
                className="game-input pl-9 py-1.5 text-xs w-full"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Deposits List Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-20 skeleton rounded-xl" />
                ))}
              </div>
            ) : filteredDeposits.length === 0 ? (
              <div className="glass-card p-12 text-center my-6">
                <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-base font-semibold text-white">
                  {search || statusFilter !== 'all' ? 'No matching deposit logs found' : 'No deposits recorded yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {search || statusFilter !== 'all'
                    ? 'Try adjusting your search terms or status filter.'
                    : `Customers haven't submitted any load orders using ${method.name} yet.`}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredDeposits.map((d: any) => {
                  const screenshotPath = d.payment_screenshot_path || d.payment_screenshot_key

                  return (
                    <div 
                      key={d.id} 
                      className="glass-card p-4 rounded-xl border border-white/10 hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left side: Order & Sender Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Screenshot thumbnail */}
                        {screenshotPath ? (
                          <ScreenshotThumb path={screenshotPath} onExpand={(url) => setPreviewImageUrl(url)} />
                        ) : (
                          <div className="h-11 w-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-muted-foreground/40">
                            <Receipt className="h-5 w-5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          {/* Order Number & Status badge & Date */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Link 
                              to={`/admin/orders/${d.id}`}
                              target="_blank"
                              className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1"
                              title="Open Order Details in new tab"
                            >
                              {d.order_number}
                              <ArrowUpRight className="h-3 w-3" />
                            </Link>

                            <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-semibold', getOrderStatusClass(d.status))}>
                              {getOrderStatusLabel(d.status)}
                            </span>

                            <span className="text-[11px] text-muted-foreground">
                              {formatRelativeTime(d.created_at)}
                            </span>
                          </div>

                          {/* WHO SENT IT (Customer & Sender Tag) */}
                          <div className="flex items-center gap-2 flex-wrap text-sm">
                            {d.is_guest ? (
                              <span className="font-semibold text-white flex items-center gap-1">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-normal">Guest</span>
                                {d.guest_name || d.username}
                              </span>
                            ) : (
                              <Link 
                                to={`/admin/customers/${d.user_id}`}
                                target="_blank"
                                className="font-semibold text-white hover:text-primary transition-colors flex items-center gap-1"
                                title="View Customer Profile"
                              >
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                                {d.profile?.full_name || 'Customer'}
                                {d.profile?.username && (
                                  <span className="text-xs font-normal text-muted-foreground">(@{d.profile.username})</span>
                                )}
                              </Link>
                            )}

                            {/* Prominent Sender Cashtag / Tag / Handle */}
                            {d.customer_payment_tag && (
                              <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-md bg-neon-gold/15 text-neon-gold border border-neon-gold/30 font-mono font-medium">
                                <Tag className="h-3 w-3" />
                                Sender: {d.customer_payment_tag}
                              </span>
                            )}
                          </div>

                          {/* Game and In-game account */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1 text-gray-300">
                              <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                              {d.game?.name || 'Game'}: <strong className="text-white font-mono">{d.username}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDateTime(d.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: Amount, Game Credit & Link */}
                      <div className="flex items-center justify-between md:justify-end gap-4 flex-shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                        <div className="text-left md:text-right">
                          <p className="text-base font-bold text-white font-mono tracking-tight">
                            {formatCurrency(d.base_amount)}
                          </p>
                          <p className="text-xs text-neon-green font-medium">
                            +{Math.ceil(d.final_game_credit)} credits
                          </p>
                        </div>

                        <Link
                          to={`/admin/orders/${d.id}`}
                          target="_blank"
                          className="btn-ghost-neon px-3 py-1.5 text-xs flex items-center gap-1 flex-shrink-0"
                          title="Open order in new tab"
                        >
                          View Order
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-muted-foreground bg-black/40 flex-shrink-0">
            <span>Showing {filteredDeposits.length} of {deposits.length} deposit records</span>
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost-neon px-4 py-1.5 text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Full-Screen Screenshot Viewer Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-game-dark border border-white/20 rounded-2xl p-2 overflow-hidden shadow-2xl flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-2 mb-2 border-b border-white/10">
              <span className="text-sm font-semibold text-white">Deposit Proof Screenshot</span>
              <div className="flex items-center gap-2">
                <a 
                  href={previewImageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-primary hover:underline flex items-center gap-1 px-2 py-1 rounded bg-primary/10 border border-primary/20"
                >
                  Open Original <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImageUrl(null)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <img 
              src={previewImageUrl} 
              alt="Deposit proof full" 
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  )
}
