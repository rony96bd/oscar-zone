import { TrendingUp, Users, Gift, Sparkles, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

export default function ReferralInfoPage() {
  const { isAuthenticated } = useAuthStore()
  const { referralCommissionEnabled, referralCustomBonusEnabled } = useSettingsStore()

  const isProgramActive = referralCommissionEnabled || referralCustomBonusEnabled

  if (!isProgramActive) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center">
        <div className="glass-card p-8">
          <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-2xl font-gaming font-bold text-white mb-2">Referral Program Currently Inactive</h1>
          <p className="text-muted-foreground text-sm">
            Our referral program is temporarily unavailable. Please check back later!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-gaming font-bold text-gradient-white mb-3">
            {referralCommissionEnabled ? 'Referral Commission Program' : 'Referral Rewards Program'}
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {referralCommissionEnabled
              ? 'Earn recurring commission every time someone you refer loads a game. Three tiers of rewards.'
              : 'Earn cash bonuses when your referred friends register and play on our platform.'}
          </p>
        </div>

        {/* Tier Cards (Only shown when Commission system is enabled) */}
        {referralCommissionEnabled ? (
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
        ) : (
          /* Custom Bonus Rewards Highlight */
          <div className="glass-card p-8 mb-12 border border-neon-gold/40 bg-gradient-to-br from-neon-gold/10 to-transparent text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-gold/20 text-neon-gold text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="h-4 w-4" /> Fast & Simple Rewards
            </div>
            <h2 className="text-2xl font-gaming font-bold text-white mb-2">
              Get Rewarded for Every Active Player You Bring!
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              No complicated tiers or waiting periods. When your friends register with your link and complete their first qualifying game load, you receive cash bonus rewards directly to your account.
            </p>
          </div>
        )}

        {/* How It Works */}
        <div className="game-card p-8 mb-8">
          <h2 className="text-xl font-gaming font-bold text-white mb-6">How Referrals Work</h2>
          <div className="space-y-4">
            {[
              { 
                icon: Users, 
                title: 'Share your referral link or code', 
                desc: 'Get your unique referral link from your dashboard and share it with your gaming friends.' 
              },
              { 
                icon: CheckCircle2, 
                title: 'Friend signs up & loads game', 
                desc: 'Your friend registers using your link and loads their favorite game.' 
              },
              { 
                icon: referralCommissionEnabled ? TrendingUp : Gift, 
                title: referralCommissionEnabled ? 'You earn commission on every load' : 'You receive cash bonus rewards', 
                desc: referralCommissionEnabled 
                  ? 'Earn a percentage of every load they make, automatically credited.' 
                  : 'Earn direct cash bonuses credited to your account by our team.' 
              },
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
