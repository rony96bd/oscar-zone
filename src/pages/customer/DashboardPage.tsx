import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import {
  Zap, ShoppingBag, Users, TrendingUp,
  ChevronRight, CheckCircle, Trophy, Copy, Share2, ArrowRight
} from "lucide-react"
import { useAuthStore } from "@/stores/authStore"
import { fetchCustomerGames } from "@/services/games"
import { fetchCustomerOrders } from "@/services/orders"
import { fetchActivePromotions } from "@/services/promotions"
import { fetchReferralStats, fetchReferralLevels } from "@/services/referrals"
import { fetchNotifications } from "@/services/notifications"
import { useNotificationStore } from "@/stores/notificationStore"
import { SavedGameCard } from "@/components/customer/GameCard"
import { formatCurrency, formatRelativeTime, getOrderStatusClass, getOrderStatusLabel, generateReferralUrl, copyToClipboard } from "@/lib/utils"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { profile } = useAuthStore()
  const { setNotifications } = useNotificationStore()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ["customer-games", profile?.id],
    queryFn: () => fetchCustomerGames(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: recentOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["customer-orders", profile?.id],
    queryFn: () => fetchCustomerOrders(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions", "active"],
    queryFn: fetchActivePromotions,
  })

  const { data: referralStats } = useQuery({
    queryKey: ["referral-stats", profile?.id],
    queryFn: () => fetchReferralStats(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: levels = [] } = useQuery({
    queryKey: ["referral-levels"],
    queryFn: fetchReferralLevels,
  })

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", profile?.id],
    queryFn: () => fetchNotifications(profile!.id),
    enabled: !!profile?.id,
  })

  useEffect(() => {
    if (notifications.length) setNotifications(notifications)
  }, [notifications, setNotifications])

  const activePromo = promotions.find((p: any) => p.type !== "regular")

  // Referral level calculation
  const qualifiedCount = referralStats?.qualified_referrals || 0
  const currentLevel = (levels as any[]).find(
    (l: any) => qualifiedCount >= l.min_referrals && (l.max_referrals === null || qualifiedCount <= l.max_referrals)
  )
  const nextLevel = (levels as any[]).find((l: any) => l.level === (currentLevel?.level || 0) + 1)
  const progressMax = nextLevel ? nextLevel.min_referrals : (currentLevel?.max_referrals || 10)
  const progressStart = currentLevel?.min_referrals || 0
  const progress = nextLevel
    ? Math.min(100, ((qualifiedCount - progressStart) / (nextLevel.min_referrals - progressStart)) * 100)
    : qualifiedCount > 0 ? 100 : 0

  const referralUrl = profile ? generateReferralUrl(profile.referral_code) : ""

  const handleCopy = async () => {
    await copyToClipboard(referralUrl)
    setCopied(true)
    toast.success("Referral link copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const levelColors: Record<number, { border: string; bg: string; text: string; bar: string }> = {
    1: { border: "border-blue-500/40", bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-400" },
    2: { border: "border-purple-500/40", bg: "bg-purple-500/10", text: "text-purple-400", bar: "bg-purple-400" },
    3: { border: "border-neon-gold/40", bg: "bg-neon-gold/10", text: "text-neon-gold", bar: "bg-neon-gold" },
  }
  const lc = levelColors[currentLevel?.level || 0] || { border: "border-primary/30", bg: "bg-primary/10", text: "text-primary", bar: "bg-primary" }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8 max-w-3xl">

      {/* === HEADER === */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-gaming font-bold text-white">
            Welcome back, <span className="text-gradient-blue">{profile?.full_name?.split(" ")[0] || "Player"}</span> 🔥
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {profile?.is_vip && <span className="text-neon-gold font-semibold mr-2">★ VIP Member</span>}
            {activePromo
              ? <span className="text-neon-green">{activePromo.bonus_percentage}% Bonus Active — {activePromo.name}!</span>
              : "Load your games and earn commissions by referring friends!"}
          </p>
        </div>
        <Link to="/load" className="btn-neon px-4 py-2.5 text-sm flex-shrink-0 hidden sm:flex">
          <Zap className="h-4 w-4" /> Load
        </Link>
      </div>

      {/* === PROMO BANNER === */}
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

      {/* === REFERRAL LEVEL CARD === */}
      <div className={cn("relative overflow-hidden rounded-2xl p-5 mb-6 border", lc.border, lc.bg)}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className={cn("text-xs font-bold uppercase tracking-widest mb-1 opacity-70", lc.text)}>Referral Level</p>
            <h2 className="text-xl font-gaming font-bold text-white">
              {currentLevel ? `Level ${currentLevel.level} — ${currentLevel.label}` : "Not Ranked Yet"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {qualifiedCount} qualified referral{qualifiedCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <Trophy className={cn("h-5 w-5 mb-1 ml-auto", lc.text)} />
            <p className={cn("text-2xl font-gaming font-bold", lc.text)}>{currentLevel?.commission_percentage || 0}%</p>
            <p className="text-xs text-muted-foreground">commission</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-black/30 rounded-full overflow-hidden mb-1.5">
          <div
            className={cn("h-full rounded-full transition-all duration-700", lc.bar)}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {nextLevel
              ? `${nextLevel.min_referrals - qualifiedCount} more to Level ${nextLevel.level} (${nextLevel.commission_percentage}%)`
              : qualifiedCount > 0 ? "🏆 Max level reached!" : "Refer friends to start ranking up!"}
          </p>
          <Link to="/earnings" className={cn("text-xs flex items-center gap-1 font-medium", lc.text)}>
            View Details <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* === REFERRAL QUICK SHARE === */}
      <div className="glass-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Share2 className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-white text-sm">Refer & Earn</h2>
          <span className="text-xs text-muted-foreground ml-1">— Earn {currentLevel?.commission_percentage || 2}% on every load</span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-game-darker border border-border rounded-xl px-3 py-2.5 font-mono text-xs text-muted-foreground truncate">
            {referralUrl}
          </div>
          <button onClick={handleCopy} className="btn-neon px-3 py-2.5 flex-shrink-0 text-xs gap-1.5">
            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Code: <span className="font-mono text-primary font-bold">{profile?.referral_code}</span>
          </p>
          <Link to="/earnings" className="text-xs text-primary flex items-center gap-0.5 hover:text-primary/80">
            Full dashboard <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* === QUICK STATS GRID === */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="stat-card">
          <ShoppingBag className="h-5 w-5 text-primary mb-2" />
          <div className="stat-value">{(recentOrders as any[]).length}</div>
          <div className="stat-label">Orders</div>
        </div>
        <div className="stat-card">
          <CheckCircle className="h-5 w-5 text-neon-green mb-2" />
          <div className="stat-value">{(recentOrders as any[]).filter((o: any) => o.status === "completed").length}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <Users className="h-5 w-5 text-neon-gold mb-2" />
          <div className="stat-value">{referralStats?.qualified_referrals || 0}</div>
          <div className="stat-label">Referrals</div>
        </div>
        <div className="stat-card">
          <TrendingUp className="h-5 w-5 text-purple-400 mb-2" />
          <div className="stat-value">{formatCurrency(referralStats?.total_earnings || 0)}</div>
          <div className="stat-label">Earned</div>
        </div>
      </div>

      {/* === MY GAMES === */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-gaming font-bold text-white text-lg">My Games</h2>
          <Link to="/my-games" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {gamesLoading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
        ) : games.length === 0 ? (
          <div className="game-card p-6 text-center">
            <p className="text-muted-foreground text-sm mb-3">No games assigned yet.</p>
            <Link to="/my-games" className="btn-ghost-neon px-4 py-2 text-sm">Request Game ID</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(games as any[]).slice(0, 3).map((cg: any) => (
              <SavedGameCard
                key={cg.id}
                gameName={cg.game?.name || "Game"}
                gameSlug={cg.game?.slug || ""}
                username={cg.username}
                logoUrl={cg.game?.logo_url}
                downloadUrl={cg.game?.download_url}
                onLoad={() => navigate("/load", { state: { customerGameId: cg.id, gameId: cg.game_id } })}
              />
            ))}
          </div>
        )}
      </section>

      {/* === RECENT ORDERS === */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-gaming font-bold text-white text-lg">Recent Orders</h2>
          <Link to="/orders" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {ordersLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
        ) : (recentOrders as any[]).length === 0 ? (
          <div className="game-card p-6 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No orders yet. Load your first game!</p>
            <Link to="/load" className="btn-neon mt-4 px-6 py-2.5 text-sm inline-flex"><Zap className="h-4 w-4" /> Load Now</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {(recentOrders as any[]).slice(0, 5).map((order: any) => (
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
                  <p className="font-semibold text-white text-sm">{Math.round(order.final_game_credit)}</p>
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
