import { useQuery } from '@tanstack/react-query'
import { fetchActivePromotions } from '@/services/promotions'
import { Star, Clock, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

export default function PromotionsPage() {
  const { isAuthenticated } = useAuthStore()
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: fetchActivePromotions,
  })

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-gaming font-bold text-gradient-white mb-2">Promotions & Bonuses</h1>
        <p className="text-muted-foreground">Maximize your loads with our current bonuses</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl" />
          ))}
        </div>
      ) : promotions.length === 0 ? (
        <div className="text-center py-16">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No active promotions right now. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {promotions.map((promo) => (
            <div key={promo.id} className="game-card p-6">
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-gold/20 border border-neon-gold/30">
                    <Star className="h-5 w-5 text-neon-gold" fill="currentColor" />
                  </div>
                  <span className="badge-completed">Active</span>
                </div>
                <h3 className="font-gaming font-bold text-white text-lg mb-2">{promo.name}</h3>
                {promo.description && (
                  <p className="text-sm text-muted-foreground mb-4">{promo.description}</p>
                )}
                <div className="flex items-center gap-6 mb-4">
                  <div>
                    <div className="text-3xl font-gaming font-bold text-neon-gold">+{promo.bonus_percentage}%</div>
                    <div className="text-xs text-muted-foreground">Bonus</div>
                  </div>
                  {promo.minimum_amount > 0 && (
                    <div>
                      <div className="text-lg font-bold text-foreground">${promo.minimum_amount}+</div>
                      <div className="text-xs text-muted-foreground">Min. Load</div>
                    </div>
                  )}
                </div>
                {promo.end_date && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Ends {formatDate(promo.end_date)}
                  </div>
                )}
                <Link
                  to="/load"
                  className="btn-neon w-full mt-4 py-2.5 text-sm"
                >
                  <Zap className="h-4 w-4" /> Claim Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
