import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchReferralLevels } from '@/services/referrals'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Users, TrendingUp, Gift, CheckCircle, Settings, Edit2, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

async function fetchAllReferrals() {
  const { data, error } = await supabase
    .from('referrals')
    .select('*, referrer:profiles!referrer_id(full_name, username), referred:profiles!referred_id(full_name, username)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

async function fetchAllEarnings() {
  const { data, error } = await supabase
    .from('referral_earnings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data || []
}

async function fetchReferralSettings() {
  const { data } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['referral_qualify_on', 'referral_min_load_amount'])
  const clean = (v: any) => typeof v === 'string' ? v.replace(/"/g, '') : String(v ?? '')
  return {
    qualify_on: clean(data?.find(d => d.key === 'referral_qualify_on')?.value ?? 'first_completed_load'),
    min_amount: parseFloat(clean(data?.find(d => d.key === 'referral_min_load_amount')?.value ?? '5')),
  }
}

export default function AdminReferralsPage() {
  const qc = useQueryClient()
  const [editLevel, setEditLevel] = useState<any | null>(null)
  const [editSettings, setEditSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ min_amount: 5 })

  const { data: referrals = [] } = useQuery({ queryKey: ['admin-all-referrals'], queryFn: fetchAllReferrals })
  const { data: earnings = [] } = useQuery({ queryKey: ['admin-all-earnings'], queryFn: fetchAllEarnings })
  const { data: levels = [] } = useQuery({ queryKey: ['referral-levels'], queryFn: fetchReferralLevels })
  const { data: refSettings } = useQuery({ queryKey: ['referral-settings'], queryFn: fetchReferralSettings })

  const totalPaid = (earnings as any[]).filter(e => e.status !== 'cancelled').reduce((s, e) => s + parseFloat(e.commission_amount), 0)
  const pendingPayout = (earnings as any[]).filter(e => e.status === 'pending').reduce((s, e) => s + parseFloat(e.commission_amount), 0)
  const qualifiedCount = (referrals as any[]).filter(r => r.status === 'qualified').length

  const saveLevelMutation = useMutation({
    mutationFn: async (level: any) => {
      const { error } = await supabase
        .from('referral_levels')
        .update({
          min_referrals: parseInt(level.min_referrals),
          max_referrals: level.max_referrals ? parseInt(level.max_referrals) : null,
          commission_percentage: parseFloat(level.commission_percentage),
          label: level.label,
        })
        .eq('id', level.id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Level updated'); setEditLevel(null); qc.invalidateQueries({ queryKey: ['referral-levels'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      await supabase.from('system_settings').upsert([
        { key: 'referral_min_load_amount', value: String(settingsForm.min_amount) },
      ], { onConflict: 'key' })
    },
    onSuccess: () => { toast.success('Settings saved'); setEditSettings(false); qc.invalidateQueries({ queryKey: ['referral-settings'] }) },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" /> Referral System
        </h1>
        <p className="text-muted-foreground text-sm">Manage levels, view referrals and commission history</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Referrals', value: (referrals as any[]).length, icon: Users, color: 'text-primary' },
          { label: 'Qualified', value: qualifiedCount, icon: CheckCircle, color: 'text-neon-green' },
          { label: 'Total Commission', value: formatCurrency(totalPaid), icon: Gift, color: 'text-purple-400' },
          { label: 'Pending Payout', value: formatCurrency(pendingPayout), icon: TrendingUp, color: 'text-neon-gold' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <Icon className={cn('h-5 w-5 mb-2', color)} />
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Qualification Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Qualification Settings</h2>
            {!editSettings ? (
              <button onClick={() => { setEditSettings(true); setSettingsForm({ min_amount: refSettings?.min_amount || 5 }) }}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
                <Edit2 className="h-3 w-3" /> Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => saveSettingsMutation.mutate()} className="text-xs text-neon-green hover:text-neon-green/80 flex items-center gap-1">
                  <Save className="h-3 w-3" /> Save
                </button>
                <button onClick={() => setEditSettings(false)} className="text-xs text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-border">
              <div>
                <p className="text-sm text-white">Qualify On</p>
                <p className="text-xs text-muted-foreground">When a referral becomes qualified</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary font-mono">First Completed Load</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-border">
              <div>
                <p className="text-sm text-white">Minimum Load Amount</p>
                <p className="text-xs text-muted-foreground">Minimum $ to qualify</p>
              </div>
              {editSettings ? (
                <input
                  type="number"
                  min="0"
                  value={settingsForm.min_amount}
                  onChange={e => setSettingsForm(s => ({ ...s, min_amount: parseFloat(e.target.value) }))}
                  className="game-input w-24 text-right text-sm"
                />
              ) : (
                <span className="text-sm font-bold text-neon-green">${refSettings?.min_amount || 5}</span>
              )}
            </div>
          </div>
        </div>

        {/* Level Config */}
        <div className="glass-card p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Commission Levels</h2>
          <div className="space-y-2">
            {(levels as any[]).map((level: any) => (
              <div key={level.id}>
                {editLevel?.id === level.id ? (
                  <div className="p-3 rounded-xl border border-primary bg-primary/5 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Label</p>
                        <input value={editLevel.label} onChange={e => setEditLevel((l: any) => ({ ...l, label: e.target.value }))} className="game-input text-xs py-1.5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Commission %</p>
                        <input type="number" value={editLevel.commission_percentage} onChange={e => setEditLevel((l: any) => ({ ...l, commission_percentage: e.target.value }))} className="game-input text-xs py-1.5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Min Referrals</p>
                        <input type="number" value={editLevel.min_referrals} onChange={e => setEditLevel((l: any) => ({ ...l, min_referrals: e.target.value }))} className="game-input text-xs py-1.5" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Max Referrals</p>
                        <input type="number" value={editLevel.max_referrals || ''} placeholder="unlimited" onChange={e => setEditLevel((l: any) => ({ ...l, max_referrals: e.target.value }))} className="game-input text-xs py-1.5" />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => saveLevelMutation.mutate(editLevel)} className="btn-neon text-xs px-3 py-1.5">Save</button>
                      <button onClick={() => setEditLevel(null)} className="text-xs text-muted-foreground px-2">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-border hover:border-primary/30 transition-colors">
                    <div>
                      <p className="text-sm font-semibold text-white">Level {level.level} — {level.label}</p>
                      <p className="text-xs text-muted-foreground">{level.min_referrals}{level.max_referrals ? `–${level.max_referrals}` : '+'} referrals</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-neon-green">{level.commission_percentage}%</span>
                      <button onClick={() => setEditLevel({ ...level })} className="text-muted-foreground hover:text-primary">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">All Referrals</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-3 pr-4">Referrer</th>
                <th className="pb-3 pr-4">Referred</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(referrals as any[]).slice(0, 50).map((ref: any) => (
                <tr key={ref.id}>
                  <td className="py-2.5 pr-4 text-white">{ref.referrer?.full_name || ref.referrer?.username || '—'}</td>
                  <td className="py-2.5 pr-4 text-white">{ref.referred?.full_name || ref.referred?.username || '—'}</td>
                  <td className="py-2.5 pr-4">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                      ref.status === 'qualified' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                      ref.status === 'disqualified' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    )}>{ref.status}</span>
                  </td>
                  <td className="py-2.5 text-muted-foreground text-xs">{formatRelativeTime(ref.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(referrals as any[]).length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No referrals yet</p>
          )}
        </div>
      </div>

      {/* Commission Ledger */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-white mb-4">Commission Ledger</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-3 pr-4">Referrer</th>
                <th className="pb-3 pr-4">Load Amount</th>
                <th className="pb-3 pr-4">Commission</th>
                <th className="pb-3 pr-4">Level</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(earnings as any[]).slice(0, 50).map((e: any) => (
                <tr key={e.id}>
                  <td className="py-2.5 pr-4 text-white font-mono text-xs">{e.user_id?.slice(0, 8)}…</td>
                  <td className="py-2.5 pr-4 text-white">{formatCurrency(e.deposit_amount)}</td>
                  <td className="py-2.5 pr-4 text-neon-green font-bold">+{formatCurrency(e.commission_amount)}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{e.commission_percentage}% (L{e.level})</td>
                  <td className="py-2.5 pr-4">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                      e.status === 'paid' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                      e.status === 'cancelled' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                      'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                    )}>{e.status}</span>
                  </td>
                  <td className="py-2.5 text-muted-foreground text-xs">{formatRelativeTime(e.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(earnings as any[]).length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No commissions recorded yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
