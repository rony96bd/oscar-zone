import { useQuery } from '@tanstack/react-query'
import { fetchAdminStats } from '@/services/admin'
import { fetchFinanceReport } from '@/services/finance'
import { ShoppingBag, Users, DollarSign, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, ArrowDownRight, ArrowUpRight, Wallet } from 'lucide-react'
import { formatCurrency, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
import { Link } from 'react-router-dom'

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: fetchAdminStats,
    refetchInterval: 30000,
  })

  const today = new Date().toISOString().split('T')[0]
  const { data: finance } = useQuery({
    queryKey: ['finance', today, today],
    queryFn: () => fetchFinanceReport(today, today),
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton rounded-xl" />)}
        </div>
        <div className="h-64 skeleton rounded-xl" />
      </div>
    )
  }

  const todayOrders = stats?.today_orders || 0
  const pendingOrders = stats?.pending_orders || 0
  const todayRevenue = stats?.today_revenue || 0
  const totalCustomers = stats?.total_customers || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-gaming font-bold text-white">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Real-time overview of your gaming portal</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <ShoppingBag className="h-5 w-5 text-primary mb-2" />
          <div className="stat-value">{todayOrders}</div>
          <div className="stat-label">Orders Today</div>
        </div>
        <div className="stat-card">
          <Clock className="h-5 w-5 text-neon-gold mb-2" />
          <div className="stat-value text-neon-gold">{pendingOrders}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-card border-neon-gold/30 bg-neon-gold/5">
          <DollarSign className="h-5 w-5 text-neon-gold mb-2" />
          <div className="stat-value text-neon-gold">{finance ? formatCurrency(finance.netProfit) : '...'}</div>
          <div className="stat-label">Today's Net Profit</div>
        </div>
        <div className="stat-card">
          <Users className="h-5 w-5 text-purple-400 mb-2" />
          <div className="stat-value">{totalCustomers}</div>
          <div className="stat-label">Total Customers</div>
        </div>
      </div>

      {/* Today's Finance Summary */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gaming font-bold text-white">Today's Financial Summary</h2>
          <Link to="/admin/reports" className="text-xs text-primary hover:text-primary/80">Detailed Report</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-black/40 border border-neon-green/20">
            <div className="flex items-center gap-2 mb-2 text-neon-green">
              <ArrowDownRight className="h-4 w-4" />
              <span className="font-semibold text-sm">Money In (Loads)</span>
            </div>
            <p className="text-xl font-bold text-white">{finance ? formatCurrency(finance.totalLoads) : '...'}</p>
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2 text-orange-500">
              <Wallet className="h-4 w-4" />
              <span className="font-semibold text-sm">Point Purchases</span>
            </div>
            <p className="text-xl font-bold text-white">{finance ? formatCurrency(finance.totalPurchases) : '...'}</p>
          </div>
          <div className="p-4 rounded-xl bg-black/40 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2 text-destructive">
              <ArrowUpRight className="h-4 w-4" />
              <span className="font-semibold text-sm">Cashouts</span>
            </div>
            <p className="text-xl font-bold text-white">{finance ? formatCurrency(finance.totalCashouts) : '...'}</p>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gaming font-bold text-white">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs text-primary hover:text-primary/80">View All</Link>
        </div>
        <div className="space-y-2">
          {(stats?.recent_orders || []).map((order: any) => (
            <Link
              key={order.id}
              to={`/admin/orders/${order.id}`}
              className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{order.game?.name} — {order.username}</p>
                <p className="text-xs text-muted-foreground">{order.order_number} • {order.is_guest ? `Guest: ${order.username}` : 'User'} • {formatRelativeTime(order.created_at)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-white text-sm">{formatCurrency(order.final_game_credit)}</p>
                <span className={getOrderStatusClass(order.status)}>{getOrderStatusLabel(order.status)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link to="/admin/orders?status=pending_payment_review" className="btn-neon py-3 text-sm">
          <Clock className="h-4 w-4" /> Pending Orders
        </Link>
        <Link to="/admin/customers" className="btn-ghost-neon py-3 text-sm">
          <Users className="h-4 w-4" /> Customers
        </Link>
        <Link to="/admin/bonuses" className="btn-ghost-neon py-3 text-sm">
          <TrendingUp className="h-4 w-4" /> Bonuses
        </Link>
        <Link to="/admin/chat" className="btn-ghost-neon py-3 text-sm">
          <AlertCircle className="h-4 w-4" /> Support
        </Link>
      </div>
    </div>
  )
}
