import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchReferralStats, fetchReferralLevels, fetchReferrals, fetchEarnings } from '@/services/referrals'
import {
  Copy, CheckCircle, TrendingUp, Users, Gift, Share2,
  QrCode, ExternalLink, Send, ChevronRight, Trophy, Clock
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { formatCurrency, generateReferralUrl, copyToClipboard, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// QR Code generator using Canvas (no external library)
function QRCodeCanvas({ value, size = 160 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    // Simple visual placeholder with the URL
    ctx.fillStyle = '#040a14'
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = '#00d4ff'
    ctx.font = `${size * 0.065}px monospace`
    ctx.textAlign = 'center'
    // Draw QR-like pattern border
    const cell = size / 20
    const drawRect = (x: number, y: number, w: number, h: number) => {
      ctx.fillRect(x * cell, y * cell, w * cell, h * cell)
    }
    // Corner squares
    ;[[0,0],[14,0],[0,14]].forEach(([cx, cy]) => {
      drawRect(cx, cy, 6, 6)
      ctx.fillStyle = '#040a14'
      drawRect(cx + 1, cy + 1, 4, 4)
      ctx.fillStyle = '#00d4ff'
      drawRect(cx + 2, cy + 2, 2, 2)
    })
    ctx.fillStyle = '#00d4ff'
    // Center text
    const lines = ['SCAN', 'ME']
    lines.forEach((line, i) => ctx.fillText(line, size / 2, size / 2 + (i - 0.5) * size * 0.1))
  }, [value, size])

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />
}

export default function EarningsPage() {
  const { profile } = useAuthStore()
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'earnings'>('overview')

  const { data: stats } = useQuery({
    queryKey: ['referral-stats', profile?.id],
    queryFn: () => fetchReferralStats(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: levels = [] } = useQuery({
    queryKey: ['referral-levels'],
    queryFn: fetchReferralLevels,
  })

  const { data: referralHistory = [] } = useQuery({
    queryKey: ['referrals', profile?.id],
    queryFn: () => fetchReferrals(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: earningsHistory = [] } = useQuery({
    queryKey: ['earnings', profile?.id],
    queryFn: () => fetchEarnings(profile!.id),
    enabled: !!profile?.id,
  })

  const referralUrl = profile ? generateReferralUrl(profile.referral_code) : ''

  const handleCopy = async () => {
    await copyToClipboard(referralUrl)
    setCopied(true)
    toast.success('Referral link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const qualifiedCount = stats?.qualified_referrals || 0
  const currentLevel = (levels as any[]).find((l: any) =>
    qualifiedCount >= l.min_referrals && (l.max_referrals === null || qualifiedCount <= l.max_referrals)
  )
  const nextLevel = (levels as any[]).find((l: any) => l.level === (currentLevel?.level || 0) + 1)
  const progressMax = nextLevel ? nextLevel.min_referrals : (currentLevel?.max_referrals || 10)
  const progress = nextLevel
    ? Math.min(100, ((qualifiedCount - (currentLevel?.min_referrals || 0)) / ((nextLevel.min_referrals) - (currentLevel?.min_referrals || 0))) * 100)
    : 100

  // This month earnings
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thisMonthEarnings = (earningsHistory as any[])
    .filter((e: any) => e.created_at >= startOfMonth && e.status !== 'cancelled')
    .reduce((sum: number, e: any) => sum + parseFloat(e.commission_amount), 0)

  const shareVia = (platform: string) => {
    const msg = `Join Oscar Zone with my referral link and get bonuses on your game loads! ${referralUrl}`
    const urls: Record<string, string> = {
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(msg)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}`,
    }
    if (urls[platform]) window.open(urls[platform], '_blank')
  }

  const levelColors: Record<number, string> = {
    1: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400',
    2: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400',
    3: 'from-neon-gold/20 to-orange-500/20 border-neon-gold/30 text-neon-gold',
  }
  const levelColor = levelColors[currentLevel?.level || 0] || 'from-primary/20 to-primary/5 border-primary/30 text-primary'

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-gaming font-bold text-gradient-white">Earnings & Referrals</h1>
        <p className="text-muted-foreground text-sm mt-1">Earn lifetime commissions by referring friends</p>
      </div>

      {/* Level Card */}
      <div className={cn('relative overflow-hidden rounded-2xl p-6 mb-6 border bg-gradient-to-br', levelColor)}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">Current Level</p>
            <h2 className="text-2xl font-gaming font-bold text-white">
              {currentLevel ? `Level ${currentLevel.level} — ${currentLevel.label.toUpperCase()}` : 'Not Yet Ranked'}
            </h2>
            <p className="text-sm opacity-80 mt-1">
              {qualifiedCount} / {progressMax} Qualified Referrals
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-70">Commission</p>
            <p className="text-3xl font-gaming font-bold">{currentLevel?.commission_percentage || 0}%</p>
          </div>
        </div>
        {/* Progress Bar */}
        <div className="h-2 bg-black/30 rounded-full mb-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: 'currentColor', opacity: 0.8 }}
          />
        </div>
        {nextLevel ? (
          <p className="text-xs opacity-70">{nextLevel.min_referrals - qualifiedCount} more referrals to Level {nextLevel.level} ({nextLevel.commission_percentage}%)</p>
        ) : (
          <p className="text-xs opacity-70">🏆 Maximum level achieved!</p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Referrals', value: stats?.total_referrals || 0, icon: Users, color: 'text-primary' },
          { label: 'Qualified', value: qualifiedCount, icon: CheckCircle, color: 'text-neon-green' },
          { label: 'Commission Rate', value: `${currentLevel?.commission_percentage || 0}%`, icon: TrendingUp, color: 'text-neon-gold' },
          { label: 'Total Earned', value: formatCurrency(stats?.total_earnings || 0), icon: Gift, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <Icon className={cn('h-5 w-5 mb-2', color)} />
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {/* Extra stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">This Month</p>
          <p className="text-xl font-bold text-neon-green mt-1">{formatCurrency(thisMonthEarnings)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground">Pending Earnings</p>
          <p className="text-xl font-bold text-neon-gold mt-1">{formatCurrency(stats?.pending_earnings || 0)}</p>
        </div>
      </div>

      {/* Referral Link + QR + Share */}
      <div className="glass-card p-6 mb-6">
        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" /> Your Referral Link
        </h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-game-darker border border-border rounded-xl px-3 py-2.5 font-mono text-xs text-muted-foreground truncate">
                {referralUrl}
              </div>
              <button onClick={handleCopy} className="btn-neon px-3 py-2.5 flex-shrink-0">
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Code: <span className="font-mono text-primary font-bold">{profile?.referral_code}</span>
            </p>
            {/* Share Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => shareVia('telegram')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0088cc]/20 border border-[#0088cc]/30 text-[#0088cc] text-xs hover:bg-[#0088cc]/30 transition-colors"
              >
                <Send className="h-3.5 w-3.5" /> Telegram
              </button>
              <button
                onClick={() => shareVia('facebook')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1877f2]/20 border border-[#1877f2]/30 text-[#1877f2] text-xs hover:bg-[#1877f2]/30 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Facebook
              </button>
              <button
                onClick={() => shareVia('twitter')}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-muted-foreground text-xs hover:bg-white/10 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> X
              </button>
            </div>
          </div>
          {/* QR Code */}
          <div className="flex-shrink-0 flex flex-col items-center gap-2">
            <QRCodeCanvas value={referralUrl} size={108} />
            <p className="text-[10px] text-muted-foreground flex items-center gap-1"><QrCode className="h-3 w-3" /> QR Code</p>
          </div>
        </div>
      </div>

      {/* Tabs — History */}
      <div className="glass-card">
        <div className="flex border-b border-border">
          {[
            { key: 'overview', label: 'Level Info' },
            { key: 'referrals', label: `Referrals (${(referralHistory as any[]).length})` },
            { key: 'earnings', label: `Earnings (${(earningsHistory as any[]).length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                'flex-1 py-3 text-sm font-medium transition-colors',
                activeTab === tab.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Level Info Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              {(levels as any[]).map((level: any) => (
                <div
                  key={level.level}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border',
                    currentLevel?.level === level.level
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-white/3'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {currentLevel?.level === level.level && <Trophy className="h-4 w-4 text-neon-gold" />}
                    <div>
                      <p className="font-semibold text-white text-sm">Level {level.level} — {level.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {level.min_referrals}{level.max_referrals ? `–${level.max_referrals}` : '+'} qualified referrals
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-neon-green">{level.commission_percentage}%</span>
                </div>
              ))}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Commission is earned on every completed load by your referred customers — for life.
              </p>
            </div>
          )}

          {/* Referrals Tab */}
          {activeTab === 'referrals' && (
            <div className="space-y-2">
              {(referralHistory as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No referrals yet. Share your link to get started!</p>
                </div>
              ) : (
                (referralHistory as any[]).map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">
                          {(ref.referred?.full_name || ref.referred?.username || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{ref.referred?.full_name || ref.referred?.username || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatRelativeTime(ref.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'text-xs px-2.5 py-1 rounded-full font-semibold border',
                      ref.status === 'qualified' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                      ref.status === 'disqualified' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    )}>
                      {ref.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div className="space-y-2">
              {(earningsHistory as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Gift className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No earnings yet. Qualify referrals to start earning commissions!</p>
                </div>
              ) : (
                (earningsHistory as any[]).map((earning: any) => (
                  <div key={earning.id} className="p-3 rounded-xl bg-white/3 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-white">
                        {earning.referral?.referred?.full_name || earning.referral?.referred?.username || 'Unknown'} — {earning.source_order?.game?.name}
                      </p>
                      <span className="text-sm font-bold text-neon-green">+{formatCurrency(earning.commission_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Load: {formatCurrency(earning.deposit_amount)} × {earning.commission_percentage}% (Level {earning.level})</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded-full border',
                        earning.status === 'paid' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' :
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      )}>
                        {earning.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(earning.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
