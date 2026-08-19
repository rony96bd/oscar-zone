import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import {
  Zap, ShoppingBag, DollarSign, Users, TrendingUp,
  ChevronRight, CheckCircle
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { fetchCustomerGames } from '@/services/games'
import { fetchCustomerOrders } from '@/services/orders'
import { fetchActivePromotions } from '@/services/promotions'
import { fetchReferralStats } from '@/services/referrals'
import { fetchNotifications } from '@/services/notifications'
import { useNotificationStore } from '@/stores/notificationStore'
import { SavedGameCard } from '@/components/customer/GameCard'
import { formatCurrency, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const { setNotifications } = useNotificationStore()
  const navigate = useNavigate()

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['customer-games', profile?.id],
    queryFn: () => fetchCustomerGames(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['customer-orders', profile?.id],
    queryFn: () => fetchCustomerOrders(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: fetchActivePromotions,
  })

  const { data: referralStats } = useQuery({
    queryKey: ['referral-stats', profile?.id],
    queryFn: () => fetchReferralStats(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => fetchNotifications(profile!.id),
    enabled: !!profile?.id,
  })

  useEffect(() => {
    if (notifications.length) setNotifications(notifications)
  }, [notifications, setNotifications])

  const activePromo = promotions.find((p: any) => p.type !== 'regular')

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-gaming font-bold text-white">
          Welcome back, <span className="text-gradient-blue">{profile?.full_name?.split(' ')[0] || 'Player'}</span> 🔥
        </h1>
        <p className="text-muted-foreground mt-1">
          {profile?.is_vip && <span className="text-neon-gold font-semibold mr-2">★ VIP Member</span>}
          {activePromo ? (
            <span className="text-neon-green">{activePromo.bonus_percentage}% Bonus Active — {activePromo.name}!</span>
          ) : 'Load your games and earn bonuses!'}
        </p>
      </div>

      {activePromo && (
        <div className="relative overflow-hidden rounded-xl p-4 mb-6 border border-neon-gold/30 bg-neon-gold/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-neon-gold uppercase tracking-wide">Limited Offer</p>
              <p className="font-gaming font-bold text-white">{activePromo.name}</p>
              <p className="text-sm text-muted-foreground">+{activePromo.bonus_percentage}% bonus on loads of ${activePromo.minimum_amount}+</p>
            </div>
            <Link to="/load" className="btn-neon-gold px-4 py-2 text-sm flex-shrink-0">
              <Zap className="h-4 w-4" /> Load Now
            </Link>
          </div>
        </div>
      )}

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gaming font-bold text-white text-lg">My Games</h2>
          <Link to="/my-games" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {gamesLoading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
        ) : games.length === 0 ? (
          <div className="game-card p-6 text-center">
            <p className="text-muted-foreground text-sm mb-3">No games assigned yet. Contact support to add your games.</p>
            <Link to="/contact" className="btn-ghost-neon px-4 py-2 text-sm">Contact Support</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {games.slice(0, 3).map((cg: any) => (
              <SavedGameCard
                key={cg.id}
                gameName={cg.game?.name || 'Game'}
                gameSlug={cg.game?.slug || ''}
                username={cg.username}
                logoUrl={cg.game?.logo_url}
                onLoad={() => navigate('/load', { state: { customerGameId: cg.id, gameId: cg.game_id } })}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="stat-card">
          <ShoppingBag className="h-5 w-5 text-primary mb-2" />
          <div className="stat-value">{recentOrders.length}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <CheckCircle className="h-5 w-5 text-neon-green mb-2" />
          <div className="stat-value">{recentOrders.filter((o: any) => o.status === 'completed').length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <Users className="h-5 w-5 text-neon-gold mb-2" />
          <div className="stat-value">{referralStats?.qualified_referrals || 0}</div>
          <div className="stat-label">Referrals</div>
        </div>
        <div className="stat-card">
          <DollarSign className="h-5 w-5 text-purple-400 mb-2" />
          <div className="stat-value">{formatCurrency(referralStats?.total_earnings || 0)}</div>
          <div className="stat-label">Earned</div>
        </div>
      </div>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-gaming font-bold text-white text-lg">Recent Orders</h2>
          <Link to="/orders" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {ordersLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
        ) : recentOrders.length === 0 ? (
          <div className="game-card p-6 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No orders yet. Load your first game!</p>
            <Link to="/load" className="btn-neon mt-4 px-6 py-2.5 text-sm inline-flex">Load Now</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.slice(0, 5).map((order: any) => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="game-card p-4 flex items-center gap-4 hover:border-primary/40 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm">{order.game?.name}</p>
                  <p className="text-xs text-muted-foreground">{order.order_number} • {formatRelativeTime(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-white text-sm">{formatCurrency(order.final_game_credit)}</p>
                  <span className={getOrderStatusClass(order.status)}>{getOrderStatusLabel(order.status)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
