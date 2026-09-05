import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchReferralLevels } from '@/services/referrals'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Users, TrendingUp, Gift, CheckCircle, Settings, Edit2, Save, X, UserPlus, Search, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

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
  const { isSupportAgent } = useAuthStore()

  if (isSupportAgent()) {
    return <Navigate to="/admin" replace />
  }

  const qc = useQueryClient()
  const [editLevel, setEditLevel] = useState<any | null>(null)
  const [editSettings, setEditSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ min_amount: 5 })

  // Manual referral assignment state
  const [referrerSearch, setReferrerSearch] = useState('')
  const [referredSearch, setReferredSearch] = useState('')
  const [referrerResults, setReferrerResults] = useState<any[]>([])
  const [referredResults, setReferredResults] = useState<any[]>([])
  const [selectedReferrer, setSelectedReferrer] = useState<any | null>(null)
  const [selectedReferred, setSelectedReferred] = useState<any | null>(null)
  const [isSearchingReferrer, setIsSearchingReferrer] = useState(false)
  const [isSearchingReferred, setIsSearchingReferred] = useState(false)

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

  // Search customers by name/username/email/phone
  async function searchUsers(term: string, type: 'referrer' | 'referred') {
    if (!term.trim()) {
      type === 'referrer' ? setReferrerResults([]) : setReferredResults([])
      return
    }
    type === 'referrer' ? setIsSearchingReferrer(true) : setIsSearchingReferred(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, username, email, phone, referral_code, referred_by')
      .eq('role', 'customer')
      .or(`full_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,referral_code.ilike.%${term}%`)
      .limit(8)
    type === 'referrer' ? setIsSearchingReferrer(false) : setIsSearchingReferred(false)
    type === 'referrer' ? setReferrerResults(data || []) : setReferredResults(data || [])
  }

  const assignReferralMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReferrer || !selectedReferred) throw new Error('Both referrer and referred must be selected')
      if (selectedReferrer.id === selectedReferred.id) throw new Error('Referrer and referred cannot be the same person')
      if (selectedReferred.referred_by) throw new Error('This customer already has a referrer set. Remove existing referral first.')

      // Check if referral already exists in referrals table
      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', selectedReferrer.id)
        .eq('referred_id', selectedReferred.id)
        .maybeSingle()
      if (existing) throw new Error('A referral record already exists between these two users.')

      // Insert into referrals table
      const { error: refError } = await supabase
        .from('referrals')
        .insert({ referrer_id: selectedReferrer.id, referred_id: selectedReferred.id, status: 'pending' })
      if (refError) throw refError

      // Update referred_by on the referred user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ referred_by: selectedReferrer.id })
        .eq('id', selectedReferred.id)
      if (profileError) throw profileError
    },
    onSuccess: () => {
      toast.success(`রেফারেল সেট হয়েছে: ${selectedReferred?.full_name || selectedReferred?.username} → ${selectedReferrer?.full_name || selectedReferrer?.username}`)
      setSelectedReferrer(null)
      setSelectedReferred(null)
      setReferrerSearch('')
      setReferredSearch('')
      setReferrerResults([])
      setReferredResults([])
      qc.invalidateQueries({ queryKey: ['admin-all-referrals'] })
    },
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

      {/* ===== Manual Referral Assignment ===== */}
      <div className="glass-card p-6 border border-primary/20">
        <h2 className="font-semibold text-white mb-1 flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Manual Referral Assignment
        </h2>
        <p className="text-xs text-muted-foreground mb-5">
          কোনো কাস্টমার রেফার কোড ছাড়াই সাইনআপ করলে এখান থেকে ম্যানুয়ালি রেফারেল সেট করুন।
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Referrer Search */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">① রেফারকারী (Referrer)</p>
            {selectedReferrer ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/30">
                <div>
                  <p className="text-sm font-semibold text-white">{selectedReferrer.full_name || selectedReferrer.username}</p>
                  <p className="text-xs text-muted-foreground">@{selectedReferrer.username} · Code: <span className="font-mono text-primary">{selectedReferrer.referral_code}</span></p>
                </div>
                <button onClick={() => { setSelectedReferrer(null); setReferrerSearch(''); setReferrerResults([]) }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="নাম, ইউজারনেম, ফোন, ইমেইল..."
                    className="game-input pl-9 w-full"
                    value={referrerSearch}
                    onChange={e => { setReferrerSearch(e.target.value); searchUsers(e.target.value, 'referrer') }}
                  />
                  {isSearchingReferrer && <span className="absolute right-3 text-xs text-muted-foreground animate-pulse">Searching...</span>}
                </div>
                {referrerResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-background/95 backdrop-blur shadow-xl overflow-hidden">
                    {referrerResults.map(u => (
                      <button key={u.id} onClick={() => { setSelectedReferrer(u); setReferrerResults([]); setReferrerSearch('') }}
                        className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0">
                        <p className="text-sm text-white font-medium">{u.full_name || u.username}</p>
                        <p className="text-xs text-muted-foreground">@{u.username} · {u.phone || u.email} · Code: {u.referral_code}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Referred Search */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">② যাকে রেফার করা হয়েছে (Referred)</p>
            {selectedReferred ? (
              <div className={cn(
                'flex items-center justify-between p-3 rounded-xl border',
                selectedReferred.referred_by ? 'bg-destructive/10 border-destructive/30' : 'bg-neon-green/10 border-neon-green/30'
              )}>
                <div>
                  <p className="text-sm font-semibold text-white">{selectedReferred.full_name || selectedReferred.username}</p>
                  <p className="text-xs text-muted-foreground">@{selectedReferred.username} · {selectedReferred.phone || selectedReferred.email}</p>
                  {selectedReferred.referred_by && (
                    <p className="text-xs text-destructive mt-0.5 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> ইতোমধ্যে রেফারার আছে
                    </p>
                  )}
                </div>
                <button onClick={() => { setSelectedReferred(null); setReferredSearch(''); setReferredResults([]) }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="নাম, ইউজারনেম, ফোন, ইমেইল..."
                    className="game-input pl-9 w-full"
                    value={referredSearch}
                    onChange={e => { setReferredSearch(e.target.value); searchUsers(e.target.value, 'referred') }}
                  />
                  {isSearchingReferred && <span className="absolute right-3 text-xs text-muted-foreground animate-pulse">Searching...</span>}
                </div>
                {referredResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-background/95 backdrop-blur shadow-xl overflow-hidden">
                    {referredResults.map(u => (
                      <button key={u.id} onClick={() => { setSelectedReferred(u); setReferredResults([]); setReferredSearch('') }}
                        className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors border-b border-border/50 last:border-0">
                        <p className="text-sm text-white font-medium">{u.full_name || u.username}</p>
                        <p className="text-xs text-muted-foreground">@{u.username} · {u.phone || u.email}
                          {u.referred_by && <span className="ml-2 text-destructive">⚠ already referred</span>}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation summary & submit */}
        {selectedReferrer && selectedReferred && (
          <div className={cn(
            'mt-5 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
            selectedReferred.referred_by ? 'bg-destructive/5 border-destructive/20' : 'bg-primary/5 border-primary/20'
          )}>
            <div className="text-sm">
              <p className="text-white">
                <span className="font-semibold text-neon-green">{selectedReferred.full_name || selectedReferred.username}</span>
                {' '}<span className="text-muted-foreground">কে</span>{' '}
                <span className="font-semibold text-primary">{selectedReferrer.full_name || selectedReferrer.username}</span>
                {' '}<span className="text-muted-foreground">রেফার করেছেন — এটি সেট করা হবে।</span>
              </p>
              {selectedReferred.referred_by && (
                <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> এই কাস্টমারের ইতোমধ্যে একজন রেফারার আছে, সেভ করা সম্ভব হবে না।
                </p>
              )}
            </div>
            <button
              onClick={() => assignReferralMutation.mutate()}
              disabled={assignReferralMutation.isPending || !!selectedReferred.referred_by}
              className="btn-neon px-5 py-2 text-sm whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assignReferralMutation.isPending ? 'সেট করা হচ্ছে...' : 'রেফারেল সেট করুন'}
            </button>
          </div>
        )}
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
