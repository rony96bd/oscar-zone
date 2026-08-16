import { TrendingUp, Users, Gift, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function ReferralInfoPage() {
  const { isAuthenticated } = useAuthStore()
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-gaming font-bold text-gradient-white mb-3">Referral Program</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Earn recurring commission every time someone you refer loads a game. Three tiers of rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { level: 1, min: 1, max: 10, pct: 2, label: 'Starter', color: 'text-blue-400', border: 'border-blue-400/30' },
            { level: 2, min: 11, max: 20, pct: 5, label: 'Pro', color: 'text-primary', border: 'border-primary/40' },
            { level: 3, min: 21, max: null, pct: 10, label: 'Elite', color: 'text-neon-gold', border: 'border-neon-gold/40' },
          ].map(({ level, min, max, pct, label, color, border }) => (
            <div key={level} className={`game-card p-6 border ${border}`}>
              <div className={`text-5xl font-gaming font-bold ${color} opacity-30 mb-2`}>L{level}</div>
              <div className={`text-3xl font-gaming font-bold ${color} mb-1`}>{pct}%</div>
              <div className="text-lg font-semibold text-white mb-2">{label}</div>
              <div className="text-sm text-muted-foreground">{min}–{max || '∞'} qualified referrals</div>
            </div>
          ))}
        </div>

        <div className="game-card p-8 mb-8">
          <h2 className="text-xl font-gaming font-bold text-white mb-6">How Referrals Work</h2>
          <div className="space-y-4">
            {[
              { icon: Users, title: 'Share your referral link', desc: 'Get a unique referral link and share with friends.' },
              { icon: Gift, title: 'Friend signs up & plays', desc: 'Your friend registers and completes their first qualifying load.' },
              { icon: TrendingUp, title: 'You earn commission', desc: 'Earn a percentage of every load they make, forever.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 flex-shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Link
            to={isAuthenticated ? '/earnings' : '/register'}
            className="btn-neon-green px-8 py-4 text-base"
          >
            <TrendingUp className="h-5 w-5" />
            {isAuthenticated ? 'View My Referrals' : 'Join & Start Earning'}
          </Link>
        </div>
      </div>
    </div>
  )
}
