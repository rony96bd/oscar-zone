import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAdminStats } from '@/services/admin'
import { fetchActiveAccountingStats, closeAccountingCycle } from '@/services/accounting'
import { ShoppingBag, Users, DollarSign, TrendingUp, Clock, Calendar, Wallet, ArrowDownRight } from 'lucide-react'
import { formatCurrency, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel, cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

export default function AdminDashboardPage() {
  const queryClient = useQueryClient()
  const { profile, isSupportAgent } = useAuthStore()
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closeDate, setCloseDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  })

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
  })

  const { data: accounting, isLoading: accLoading, error: accError } = useQuery({
    queryKey: ['active-accounting'],
    queryFn: fetchActiveAccountingStats,
  })

  const closeMutation = useMutation({
    mutationFn: async () => {
      if (!accounting || !accounting.activeCycle) throw new Error("No active cycle")
      if (!profile) throw new Error("No user profile")
      
      const isoDate = new Date(closeDate.replace(' ', 'T')).toISOString()
      if (isoDate <= accounting.activeCycle.start_date) {
        throw new Error("Close date must be after the start date")
      }

      await closeAccountingCycle(accounting.activeCycle.id, {
        endDate: isoDate,
        totalDeposits: accounting.totalDeposits,
        totalCashouts: accounting.totalCashouts,
        totalAgentCommissions: accounting.totalAgentCommissions,
        totalGamePointsCost: accounting.totalGamePointsCost,
        netProfit: accounting.netProfit,
        closedBy: profile.id
      })
    },
    onSuccess: () => {
      toast.success('Accounting cycle closed successfully!')
      setShowCloseModal(false)
      queryClient.invalidateQueries({ queryKey: ['active-accounting'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to close accounting cycle')
    }
  })

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    )
  }

  const pendingOrders = stats?.pending_orders || 0
  const totalCustomers = stats?.total_customers || 0

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {profile?.full_name}</p>
        </div>
        <div className="flex gap-2">
          {statsError && (
            <span className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              Stats Error: {(statsError as any).message}
            </span>
          )}
          {accError && (
            <span className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              Accounting Error: {(accError as any).message}
            </span>
          )}
          {(!accounting || !accounting.activeCycle) && !accError && (
            <span className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20">
              No Active Cycle (Check RLS Policies for accounting_cycles table)
            </span>
          )}
          {!isSupportAgent() && (
            <Link to="/admin/accounting" className="btn-ghost-neon px-4 py-2 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
            </Link>
          )}
          {!isSupportAgent() && (
            <button 
              onClick={() => setShowCloseModal(true)}
              className="btn-neon px-4 py-2 flex items-center gap-2"
              disabled={!accounting?.activeCycle}
            >
              <Calendar className="h-4 w-4" />
              Close Cycle
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <Clock className="h-5 w-5 text-neon-gold mb-2" />
          <div className="stat-value text-neon-gold">{pendingOrders}</div>
          <div className="stat-label">Pending Orders</div>
        </div>
        <div className="stat-card">
          <DollarSign className="h-5 w-5 text-neon-green mb-2" />
          <div className="stat-value text-neon-green">{formatCurrency(accounting?.netProfit || 0)}</div>
          <div className="stat-label">Net Profit (Cycle)</div>
        </div>
        <div className="stat-card">
          <Wallet className="h-5 w-5 text-primary mb-2" />
          <div className="stat-value">{formatCurrency(accounting?.totalDeposits || 0)}</div>
          <div className="stat-label">Total Deposits (Cycle)</div>
        </div>
        <div className="stat-card">
          <Users className="h-5 w-5 text-purple-400 mb-2" />
          <div className="stat-value">{totalCustomers}</div>
          <div className="stat-label">Total Customers</div>
        </div>
      </div>

      {/* Accounting Cycle Summary */}
      <div className="glass-card p-6 border-neon-gold/20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-gaming font-bold text-white text-lg">Active Settlement Cycle</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Started: {accounting?.activeCycle?.start_date ? new Date(accounting.activeCycle.start_date.replace(' ', 'T')).toLocaleString() : 'N/A'}
            </p>
          </div>
          <DollarSign className="h-8 w-8 text-neon-gold/50" />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          
          {/* 1. Total Customers Deposit */}
          <div className="p-4 rounded-xl bg-black/40 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Wallet className="h-4 w-4 text-primary" />
              Total Customers Deposit
            </div>
            <p className="text-2xl font-bold text-white mb-2">{formatCurrency(accounting?.totalDeposits || 0)}</p>
            {accounting?.depositsByMethod && Object.entries(accounting.depositsByMethod).map(([method, amount]) => (
              <div key={method} className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                <span>Total {method}</span>
                <span>{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>

          {/* 2. Total Cashouts */}
          <div className="p-4 rounded-xl bg-black/40 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <ArrowDownRight className="h-4 w-4 text-neon-green" />
              Total Cashouts
            </div>
            <p className="text-2xl font-bold text-white">{formatCurrency(accounting?.totalCashouts || 0)}</p>
          </div>

          {/* 3. Agent Commissions */}
          <div className="p-4 rounded-xl bg-black/40 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Users className="h-4 w-4 text-orange-400" />
              Agent Commission
            </div>
            <p className="text-2xl font-bold text-white mb-2">{formatCurrency(accounting?.totalAgentCommissions || 0)}</p>
            {accounting?.commissionsByMethod && Object.entries(accounting.commissionsByMethod).map(([method, amount]) => (
              <div key={method} className="flex justify-between text-[11px] text-muted-foreground mt-0.5">
                <span>{method}</span>
                <span>{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>

          {/* 4. Game Points (Cost) */}
          <div className="p-4 rounded-xl bg-black/40 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingBag className="h-4 w-4 text-blue-400" />
                Game Points (Cost)
              </div>
            </div>
            <p className="text-2xl font-bold text-white mb-2">{formatCurrency(accounting?.totalGamePointsCost || 0)}</p>
            <Link to="/admin/point-purchases" className="text-[11px] text-primary hover:underline">
              Load new points →
            </Link>
          </div>
          
          {/* 5. Net Profit / Loss */}
          <div className="p-4 rounded-xl bg-neon-gold/10 border border-neon-gold/30">
            <div className="flex items-center gap-2 text-sm text-neon-gold mb-2 font-bold">
              <TrendingUp className="h-4 w-4" />
              Net Profit / Loss
            </div>
            <p className="text-2xl font-bold text-neon-gold">{formatCurrency(accounting?.netProfit || 0)}</p>
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="font-gaming font-bold text-white">Recent Orders</h2>
          <Link to="/admin/orders" className="text-sm text-neon-gold hover:underline">View All</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-black/20">
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Game</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats?.recent_orders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 text-sm text-muted-foreground">
                    {formatRelativeTime(order.created_at)}
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white">{order.profile?.full_name || 'Unknown'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-white">{order.game?.name}</div>
                  </td>
                  <td className="p-4 font-bold text-white">
                    {formatCurrency(order.base_amount)}
                  </td>
                  <td className="p-4">
                    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", getOrderStatusClass(order.status))}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </td>
                </tr>
              ))}
              {stats?.recent_orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No recent orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="font-gaming font-bold text-xl text-white mb-2">Close Accounting Cycle</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Select the exact cut-off time. All transactions up to this time will be settled, and a new cycle will start exactly from this time.
            </p>
            
            <div className="mb-6">
              <label className="text-sm font-medium text-white mb-2 block">Cut-off Date & Time</label>
              <input 
                type="datetime-local" 
                className="game-input w-full"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowCloseModal(false)}
                className="btn-secondary px-4 py-2"
                disabled={closeMutation.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={() => closeMutation.mutate()}
                className="btn-neon px-4 py-2"
                disabled={closeMutation.isPending}
              >
                {closeMutation.isPending ? 'Closing...' : 'Close Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
