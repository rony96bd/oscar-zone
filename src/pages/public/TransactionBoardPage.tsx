import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine, Activity, Flame, RefreshCw, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { getTransactionBoard } from '@/services/engagement'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useSettingsStore } from '@/stores/settingsStore'
import type { LiveActivity } from '@/types'

// Status config for Cash In (orders)
const LOAD_STATUS: Record<string, { label: string; color: string; icon: any; dotColor: string }> = {
  pending_payment_review: { label: 'Payment Review', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: Clock, dotColor: 'bg-yellow-400' },
  payment_verified:       { label: 'Payment Verified', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20',   icon: CheckCircle, dotColor: 'bg-blue-400' },
  processing:             { label: 'Processing', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20',   icon: Loader2, dotColor: 'bg-purple-400' },
  completed:              { label: 'Completed', color: 'text-neon-green bg-neon-green/10 border-neon-green/20',    icon: CheckCircle, dotColor: 'bg-neon-green' },
}

// Status config for Cash Out (cashout_requests)
const CASHOUT_STATUS: Record<string, { label: string; color: string; icon: any; dotColor: string }> = {
  pending:  { label: 'Pending', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: Clock, dotColor: 'bg-yellow-400' },
  approved: { label: 'Approved', color: 'text-neon-green bg-neon-green/10 border-neon-green/20',   icon: CheckCircle, dotColor: 'bg-neon-green' },
}

function StatusBadge({ activity }: { activity: LiveActivity }) {
  const map = activity.activity_type === 'load' ? LOAD_STATUS : CASHOUT_STATUS
  const cfg = map[activity.status] ?? { label: activity.status, color: 'text-white/50 bg-white/5 border-white/10', icon: AlertCircle, dotColor: 'bg-white/50' }
  const Icon = cfg.icon
  const isPulsing = activity.status === 'pending_payment_review' || activity.status === 'pending' || activity.status === 'processing'

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
      {isPulsing
        ? <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dotColor} animate-pulse`} />
        : <Icon className="h-2.5 w-2.5" />
      }
      {cfg.label}
    </span>
  )
}

function ActivityCard({ activity, index }: { activity: LiveActivity; index: number }) {
  const isLoad = activity.activity_type === 'load'
  const isDone = activity.status === 'completed' || activity.status === 'approved'

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${isLoad ? 'bg-neon-green/10' : 'bg-neon-gold/10'}`}>
        {isLoad
          ? <ArrowDownToLine className="h-4 w-4 text-neon-green" />
          : <ArrowUpFromLine className="h-4 w-4 text-neon-gold" />
        }
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-white">{activity.masked_name}</span>
          <span className="text-muted-foreground text-xs">{isLoad ? 'requested load on' : 'cashout from'}</span>
          <span className="text-xs font-medium text-white/70 truncate">{activity.game_name}</span>
          {!isLoad && isDone && activity.amount >= 500 && (
            <Flame className="h-3.5 w-3.5 text-orange-400 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-sm font-bold ${isLoad ? 'text-neon-green' : 'text-neon-gold'}`}>
            {formatCurrency(activity.amount)}
          </span>
          <span className="text-white/20">•</span>
          <span className="text-muted-foreground text-xs">{formatDateTime(activity.created_at)}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex-shrink-0">
        <StatusBadge activity={activity} />
      </div>
    </div>
  )
}


function ColumnSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[70px] rounded-xl bg-white/[0.03] animate-pulse" />
      ))}
    </div>
  )
}

export default function TransactionBoardPage() {
  const { metaTitle } = useSettingsStore()

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['transaction-board'],
    queryFn: getTransactionBoard,
    refetchInterval: 30000,
  })

  const loads = data?.loads ?? []
  const cashouts = data?.cashouts ?? []

  useEffect(() => {
    const newTitle = 'Transaction Board - Oscar Zone'
    document.title = newTitle
    const ogTitle = document.getElementById('og-title')
    const original = ogTitle?.getAttribute('content')
    if (ogTitle) ogTitle.setAttribute('content', newTitle)
    return () => {
      document.title = metaTitle || 'Oscar Zone'
      if (ogTitle && original) ogTitle.setAttribute('content', original)
    }
  }, [metaTitle])

  return (
    <div className="min-h-screen hero-bg pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">

        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-primary/20 mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
            <Activity className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Transaction Board</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-base">
            Live view of the latest game loads and cashouts on our platform. 100% transparent &amp; real transactions.
          </p>

          {/* Stats strip */}
          <div className="inline-flex items-center gap-6 mt-6 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-4 w-4 text-neon-green" />
              <span className="text-sm text-white/70">Last <span className="font-bold text-neon-green">{loads.length}</span> loads</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="h-4 w-4 text-neon-gold" />
              <span className="text-sm text-white/70">Last <span className="font-bold text-neon-gold">{cashouts.length}</span> cashouts</span>
            </div>
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Cash In Column */}
          <div className="glass-card rounded-2xl p-5 border border-neon-green/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-neon-green/15 flex items-center justify-center">
                <ArrowDownToLine className="h-4 w-4 text-neon-green" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Cash In</h2>
                <p className="text-xs text-muted-foreground">Recent game loads</p>
              </div>
              <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neon-green/10 text-neon-green border border-neon-green/20">
                {loads.length} entries
              </span>
            </div>

            {isLoading ? (
              <ColumnSkeleton />
            ) : loads.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No recent loads</div>
            ) : (
              <div className="space-y-2.5">
                {loads.map((activity, i) => (
                  <ActivityCard key={`load-${activity.created_at}-${i}`} activity={activity} index={i} />
                ))}
              </div>
            )}
          </div>

          {/* Cash Out Column */}
          <div className="glass-card rounded-2xl p-5 border border-neon-gold/10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-neon-gold/15 flex items-center justify-center">
                <ArrowUpFromLine className="h-4 w-4 text-neon-gold" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Cash Out</h2>
                <p className="text-xs text-muted-foreground">Recent approved cashouts</p>
              </div>
              <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neon-gold/10 text-neon-gold border border-neon-gold/20">
                {cashouts.length} entries
              </span>
            </div>

            {isLoading ? (
              <ColumnSkeleton />
            ) : cashouts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No recent cashouts</div>
            ) : (
              <div className="space-y-2.5">
                {cashouts.map((activity, i) => (
                  <ActivityCard key={`cashout-${activity.created_at}-${i}`} activity={activity} index={i} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trust footer note */}
        <p className="text-center text-xs text-white/30 mt-8">
          🔒 Names are partially masked for privacy. All transactions are real and verified. Auto-refreshes every 30 seconds.
        </p>
      </div>
    </div>
  )
}
