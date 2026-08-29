import { useQuery } from '@tanstack/react-query'
import { Trophy, Star, MessageSquare } from 'lucide-react'
import { fetchApprovedTestimonials } from '@/services/engagement'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'

export default function WinnersCirclePage() {
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['winners-circle'],
    queryFn: fetchApprovedTestimonials,
  })

  return (
    <div className="min-h-screen hero-bg pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-neon-gold/20 mb-4 shadow-[0_0_30px_rgba(255,215,0,0.3)]">
            <Trophy className="h-10 w-10 text-neon-gold" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4">Winner's Circle</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            See recent big wins and cashouts from our players. Play your favorite games and join the Winner's Circle today!
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-r-transparent animate-spin" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
            <Trophy className="h-16 w-16 text-white/20 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No winners shared yet!</h3>
            <p className="text-muted-foreground">Cashout and share your success to be the first.</p>
          </div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
            {testimonials.map((t, i) => (
              <div 
                key={t.id} 
                className="break-inside-avoid bg-game-card border border-white/10 rounded-2xl p-6 relative overflow-hidden group hover:border-neon-gold/50 transition-all duration-300 shadow-lg hover:shadow-neon-gold/20 animate-scale-in"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-gold/5 rounded-full blur-3xl group-hover:bg-neon-gold/10 transition-colors" />
                
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {t.profiles?.username ? (t.profiles.username.substring(0, 2) + '***' + t.profiles.username.substring(t.profiles.username.length - 1)) : 'Player'}
                    </h3>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(t.created_at)}</p>
                  </div>
                  <div className="bg-neon-gold/20 text-neon-gold font-bold px-3 py-1 rounded-full text-sm border border-neon-gold/30">
                    {formatCurrency(t.amount)}
                  </div>
                </div>

                <div className="mb-4 relative z-10">
                  <span className="inline-block px-2.5 py-1 rounded-md bg-white/5 text-xs text-primary font-semibold mb-3 border border-primary/20">
                    {t.game_name}
                  </span>
                  
                  {t.message && (
                    <div className="flex items-start gap-3 bg-black/40 p-4 rounded-xl">
                      <MessageSquare className="h-4 w-4 text-white/40 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-white/90 italic leading-relaxed">
                        "{t.message}"
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 text-neon-gold relative z-10">
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                  <Star className="h-3 w-3 fill-current" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
