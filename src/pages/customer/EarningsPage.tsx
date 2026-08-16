import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchReferralStats, fetchReferralLevels, fetchMilestones } from '@/services/referrals'
import { Copy, CheckCircle, TrendingUp, Users, Gift, Share2 } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency, generateReferralUrl, copyToClipboard } from '@/lib/utils'
import { toast } from 'sonner'

export default function EarningsPage() {
  const { profile } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['referral-stats', profile?.id],
    queryFn: () => fetchReferralStats(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: levels = [] } = useQuery({
    queryKey: ['referral-levels'],
    queryFn: fetchReferralLevels,
  })

  const referralUrl = profile ? generateReferralUrl(profile.referral_code) : ''

  const handleCopy = async () => {
    await copyToClipboard(referralUrl)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const qualifiedCount = stats?.qualified_referrals || 0
  const currentLevel = (levels as any[]).find((l: any) => qualifiedCount >= l.min_referrals && (l.max_referrals === null || qualifiedCount <= l.max_referrals))
  const nextLevel = (levels as any[]).find((l: any) => l.level === (currentLevel?.level || 0) + 1)
  const progressMax = nextLevel?.min_referrals || currentLevel?.max_referrals || 10
  const progress = Math.min(100, (qualifiedCount / progressMax) * 100)

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-gaming font-bold text-gradient-white">Earnings &amp; Referrals</h1>
      </div>
      <div className="game-card p-6 mb-6 border border-primary/30">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" /> Your Referral Link</h2>
        <div className="flex gap-2">
          <div className="flex-1 game-input font-mono text-sm truncate px-3 py-2.5 text-muted-foreground">{referralUrl}</div>
          <button onClick={handleCopy} className="btn-neon px-4 py-2.5 flex-shrink-0">{copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Code: <span className="font-mono text-primary">{profile?.referral_code}</span></p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card"><Users className="h-5 w-5 text-primary mb-2" /><div className="stat-value">{stats?.total_referrals || 0}</div><div className="stat-label">Total Referrals</div></div>
        <div className="stat-card"><CheckCircle className="h-5 w-5 text-neon-green mb-2" /><div className="stat-value">{qualifiedCount}</div><div className="stat-label">Qualified</div></div>
        <div className="stat-card"><TrendingUp className="h-5 w-5 text-neon-gold mb-2" /><div className="stat-value">{currentLevel?.commission_percentage || 0}%</div><div className="stat-label">Commission</div></div>
        <div className="stat-card"><Gift className="h-5 w-5 text-purple-400 mb-2" /><div className="stat-value">{formatCurrency(stats?.total_earnings || 0)}</div><div className="stat-label">Total Earned</div></div>
      </div>
      <div className="game-card p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-gaming font-bold text-white">Level {currentLevel?.level || 0} \u2014 {currentLevel?.label || 'Getting Started'}</h2>
          <span className="text-neon-green font-bold">{currentLevel?.commission_percentage || 0}%</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{qualifiedCount} / {progressMax} Referrals</p>
        <div className="progress-neon mb-2"><div className="progress-neon-bar" style={{ width: `${progress}%` }} /></div>
        {nextLevel && <p className="text-xs text-muted-foreground">{nextLevel.min_referrals - qualifiedCount} more to Level {nextLevel.level} ({nextLevel.commission_percentage}%)</p>}
      </div>
    </div>
  )
}
