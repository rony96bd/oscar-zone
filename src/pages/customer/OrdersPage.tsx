import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { fetchCustomerOrders } from '@/services/orders'
import { EmptyState } from '@/components/shared/EmptyState'
import { ShoppingBag, Search } from 'lucide-react'
import { cn, formatCurrency, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending_payment_review' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
]

export default function OrdersPage() {
  const { profile } = useAuthStore()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['customer-orders', profile?.id],
    queryFn: () => fetchCustomerOrders(profile!.id),
    enabled: !!profile?.id,
  })

  const filtered = orders.filter((o: any) => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = !search || o.order_number.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-gaming font-bold text-gradient-white">My Orders</h1>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex overflow-x-auto no-scrollbar gap-1 p-1 rounded-xl bg-muted/30 border border-border">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                filter === value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >{label}</button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID..." className="game-input pl-10" />
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-12 w-12" />} title="No orders found" description="Submit your first load order" action={<Link to="/load" className="btn-neon px-6 py-3">Load Game</Link>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((order: any) => (
            <Link key={order.id} to={`/orders/${order.id}`}
              className="game-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/40 transition-all"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-gaming font-bold text-white text-sm">{order.game?.name}</span>
                  <span className={getOrderStatusClass(order.status)}>{getOrderStatusLabel(order.status)}</span>
                </div>
                <p className="text-xs text-muted-foreground">{order.order_number} • {order.username} • {formatRelativeTime(order.created_at)}</p>
              </div>
              <div className="text-sm sm:text-right">
                <div className="font-bold text-white">{Math.ceil(order.final_game_credit)}</div>
                <div className="text-xs text-muted-foreground">Paid: {formatCurrency(order.base_amount)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
