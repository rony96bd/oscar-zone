import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Zap, Star, ArrowRight, Shield, Clock, Trophy, Users, ChevronRight,
  Download, Play, Gift, TrendingUp, MessageCircle
} from 'lucide-react'
import { fetchGames } from '@/services/games'
import { fetchActivePromotions } from '@/services/promotions'
import { GameCard } from '@/components/customer/GameCard'
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '@/lib/constants'
import { useNavigate as useNav } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function HomePage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const { data: games = [] } = useQuery({
    queryKey: ['games', 'active'],
    queryFn: fetchGames,
  })

  const { data: promotions = [] } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: fetchActivePromotions,
  })

  const activePromo = promotions.find(p => p.type !== 'regular')

  const handleLoadGame = (game: any) => {
    if (isAuthenticated) {
      navigate('/load', { state: { gameId: game.id } })
    } else {
      navigate('/quick-load', { state: { gameId: game.id } })
    }
  }

  return (
    <div className="overflow-x-hidden">
      {/* ===== HERO ===== */}
      <section className="hero-bg relative min-h-screen flex items-center justify-center px-4 pt-8 pb-24">
        {/* Background stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 3 + 1 + 'px',
                height: Math.random() * 3 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: Math.random() * 0.6 + 0.1,
                animation: `glow-pulse ${Math.random() * 3 + 2}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        <div className="relative text-center max-w-4xl mx-auto">
          {/* Promo badge */}
          {activePromo && (
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-neon-gold/40 bg-neon-gold/10">
              <Star className="h-4 w-4 text-neon-gold" fill="currentColor" />
              <span className="text-sm font-semibold text-neon-gold">
                {activePromo.bonus_percentage}% Bonus — {activePromo.name}!
              </span>
            </div>
          )}

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-gaming font-bold tracking-tight mb-6 text-white">
            {APP_TAGLINE.split('.').map((part, i) => (
              <span key={i} className={i === 1 ? 'text-gradient-blue' : i === 2 ? 'text-gradient-gold' : ''}>
                {part}{i < 2 ? '. ' : '.'}
              </span>
            ))}
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            {APP_DESCRIPTION} Load your favorite games in minutes with instant bonuses.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={isAuthenticated ? '/load' : '/quick-load'}
              className="btn-neon text-base px-8 py-4 animate-glow-pulse"
            >
              <Zap className="h-5 w-5" />
              LOAD GAME NOW
            </Link>
            <Link
              to={isAuthenticated ? '/earnings' : '/referral'}
              className="btn-ghost-neon text-base px-8 py-4"
            >
              <Gift className="h-5 w-5" />
              REFER &amp; EARN
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap justify-center gap-6 mt-12">
            {[
              { icon: Shield, label: 'Secure Payments' },
              { icon: Clock, label: 'Fast Processing' },
              { icon: Trophy, label: 'US Players Only' },
              { icon: Star, label: 'Daily Bonuses' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce-gentle">
          <div className="flex flex-col items-center gap-1">
            <div className="w-px h-8 bg-gradient-to-b from-primary to-transparent" />
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
          </div>
        </div>
      </section>

      {/* ===== CURRENT PROMOTION ===== */}
      {activePromo && (
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="relative overflow-hidden rounded-2xl p-8 md:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-gold/20 via-neon-orange/10 to-transparent" />
              <div className="absolute inset-0 border border-neon-gold/30 rounded-2xl" />
              <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-gold/20 border border-neon-gold/40 text-xs font-semibold text-neon-gold mb-4">
                    <Star className="h-3.5 w-3.5" fill="currentColor" />
                    LIMITED TIME OFFER
                  </div>
                  <h2 className="text-3xl md:text-4xl font-gaming font-bold text-white mb-3">
                    {activePromo.name}
                  </h2>
                  <p className="text-muted-foreground">{activePromo.description}</p>
                  <div className="flex items-center gap-3 mt-4">
                    <div className="text-4xl font-gaming font-bold text-neon-gold">
                      +{activePromo.bonus_percentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      extra on top of<br />your regular bonus
                    </div>
                  </div>
                </div>
                <Link
                  to={isAuthenticated ? '/load' : '/quick-load'}
                  className="btn-neon-gold px-8 py-4 text-base font-bold flex-shrink-0"
                >
                  <Zap className="h-5 w-5" />
                  CLAIM BONUS
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== GAMES ===== */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-gaming font-bold text-gradient-white mb-2">Popular Games</h2>
              <p className="text-muted-foreground text-sm">7 games available. Download, play, and load up.</p>
            </div>
            <Link to="/games" className="btn-ghost-neon text-sm px-4 py-2 hidden sm:flex">
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onLoadGame={handleLoadGame}
                showDownload
              />
            ))}
          </div>

          <div className="mt-6 text-center sm:hidden">
            <Link to="/games" className="btn-ghost-neon text-sm px-6 py-2.5">
              View All Games
            </Link>
          </div>
        </div>
      </section>

      {/* ===== QUICK LOAD CTA ===== */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/10 via-transparent to-primary/10">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-gaming font-bold text-white mb-4">
            Ready to Load Your Game?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            No account needed! Select your game, enter your username, pay, and you're done.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/quick-load" className="btn-neon px-8 py-4">
              <Zap className="h-5 w-5" />
              Quick Load (No Account)
            </Link>
            <Link to="/register" className="btn-ghost-neon px-8 py-4">
              Create Account for Bonuses
            </Link>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-gaming font-bold text-gradient-white mb-3">How It Works</h2>
            <p className="text-muted-foreground">Loading your game is simple and fast</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', icon: Play, title: 'Select Game', desc: 'Choose from 7 popular games. Download if you haven\'t already.' },
              { step: '02', icon: Zap, title: 'Enter Username', desc: 'Enter your in-game username or select a saved account.' },
              { step: '03', icon: Shield, title: 'Pay & Upload', desc: 'Send payment via Chime, PayPal, or Cash App. Upload your screenshot.' },
              { step: '04', icon: Trophy, title: 'Game Loaded!', desc: 'We verify and load your account. Receive instant notification.' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="game-card p-6 text-center">
                <div className="text-5xl font-gaming font-bold text-primary/20 mb-4">{step}</div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 mx-auto mb-4">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-gaming font-bold text-white mb-2">{title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== REFERRAL CTA ===== */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="game-card p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-green/20 border border-neon-green/40 text-xs font-semibold text-neon-green mb-4">
                  <Users className="h-3.5 w-3.5" />
                  REFERRAL PROGRAM
                </div>
                <h2 className="text-3xl font-gaming font-bold text-white mb-4">
                  Earn Up to <span className="text-gradient-green">10% Commission</span>
                </h2>
                <p className="text-muted-foreground mb-6">
                  Refer friends and earn recurring commission on every load they make.
                  Three levels of rewards as you grow your network.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    { level: '1-10 Referrals', pct: '2%', label: 'Starter' },
                    { level: '11-20 Referrals', pct: '5%', label: 'Pro' },
                    { level: '21+ Referrals', pct: '10%', label: 'Elite' },
                  ].map(({ level, pct, label }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <span className="text-sm text-muted-foreground">{level} <span className="text-xs text-primary ml-1">{label}</span></span>
                      <span className="font-gaming font-bold text-neon-green">{pct} Commission</span>
                    </div>
                  ))}
                </div>
                <Link
                  to={isAuthenticated ? '/earnings' : '/register'}
                  className="btn-neon-green px-8 py-3"
                >
                  <TrendingUp className="h-4 w-4" />
                  {isAuthenticated ? 'View My Referrals' : 'Start Earning'}
                </Link>
              </div>
              <div className="space-y-4">
                <div className="game-card p-5">
                  <div className="text-3xl font-gaming font-bold text-neon-gold mb-1">$184.20</div>
                  <div className="text-sm text-muted-foreground">Example monthly earnings with 14 referrals</div>
                </div>
                <div className="game-card p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-foreground">Level 2 — Pro</span>
                    <span className="text-xs text-neon-green font-bold">5% Commission</span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">14 / 20 Qualified Referrals</div>
                  <div className="progress-neon">
                    <div className="progress-neon-bar" style={{ width: '70%' }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">6 more to Level 3 (10%)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LIVE SUPPORT CTA ===== */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 mx-auto mb-6">
            <MessageCircle className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-gaming font-bold text-white mb-3">Need Help?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Our US-based support team is ready to assist you with your game loads, payments, and account questions.
          </p>
          <Link to="/contact" className="btn-ghost-neon px-8 py-3">
            <MessageCircle className="h-4 w-4" />
            Contact Support
          </Link>
        </div>
      </section>
    </div>
  )
}
