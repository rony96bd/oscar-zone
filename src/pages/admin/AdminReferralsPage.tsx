import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchReferralLevels, awardCustomBonus } from '@/services/referrals'
import { fetchGames } from '@/services/games'
import { fetchGamePointBalances } from '@/services/accounting'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { 
  Users, TrendingUp, Gift, CheckCircle, Settings, Edit2, Save, X, 
  UserPlus, Search, AlertTriangle, Sparkles, ToggleLeft, ToggleRight,
  DollarSign, Check, Loader2, ShieldCheck, Clock, Gamepad2
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'

async function fetchAllReferrals() {
  const { data, error } = await supabase
    .from('referrals')
    .select('*, referrer:profiles!referrer_id(id, full_name, username), referred:profiles!referred_id(id, full_name, username)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

async function fetchAllEarnings() {
  const { data, error } = await supabase
    .from('referral_earnings')
    .select('*, user:profiles!user_id(full_name, username), source_order:orders(order_number, base_amount, game:games(name))')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return data || []
}

async function fetchReferralSettings() {
  const { data } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [
      'referral_qualify_on', 
      'referral_min_load_amount',
      'referral_commission_enabled',
      'referral_custom_bonus_enabled',
      'referral_default_custom_bonus'
    ])
  const clean = (v: any) => typeof v === 'string' ? v.replace(/"/g, '') : String(v ?? '')
  const commVal = clean(data?.find(d => d.key === 'referral_commission_enabled')?.value ?? 'true')
  const customVal = clean(data?.find(d => d.key === 'referral_custom_bonus_enabled')?.value ?? 'true')
  return {
    qualify_on: clean(data?.find(d => d.key === 'referral_qualify_on')?.value ?? 'first_completed_load'),
    min_amount: parseFloat(clean(data?.find(d => d.key === 'referral_min_load_amount')?.value ?? '5')),
    commission_enabled: commVal === 'true',
    custom_bonus_enabled: customVal === 'true',
    default_custom_bonus: parseFloat(clean(data?.find(d => d.key === 'referral_default_custom_bonus')?.value ?? '10')) || 10,
  }
}

export default function AdminReferralsPage() {
  const { isSupportAgent } = useAuthStore()
  const { 
    referralCommissionEnabled, 
    referralCustomBonusEnabled, 
    referralDefaultCustomBonus,
    updateReferralModeSettings 
  } = useSettingsStore()

  if (isSupportAgent()) {
    return <Navigate to="/admin" replace />
  }

  const qc = useQueryClient()
  const [editLevel, setEditLevel] = useState<any | null>(null)
  const [editSettings, setEditSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ min_amount: 5 })

  // Mode toggles local state
  const [isUpdatingModes, setIsUpdatingModes] = useState(false)
  const [localCommEnabled, setLocalCommEnabled] = useState<boolean | null>(null)
  const [localCustomEnabled, setLocalCustomEnabled] = useState<boolean | null>(null)
  const [localDefaultBonus, setLocalDefaultBonus] = useState<number | null>(null)

  // Award Bonus Modal State
  const [awardModal, setAwardModal] = useState<{
    open: boolean
    referral: any | null
    amount: number
    notes: string
    markQualified: boolean
    loadToGame: boolean
    gameId: string
    gameUsername: string
  }>({
    open: false,
    referral: null,
    amount: 10,
    notes: '',
    markQualified: true,
    loadToGame: true,
    gameId: '',
    gameUsername: '',
  })

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
  const { data: refSettings } = useQuery({ 
    queryKey: ['referral-settings'], 
    queryFn: fetchReferralSettings 
  })
  const { data: allGames = [] } = useQuery({ queryKey: ['games', 'active'], queryFn: fetchGames })
  const { data: pointBalances = [] } = useQuery({ queryKey: ['game-point-balances'], queryFn: fetchGamePointBalances })
  const { data: referrerGames = [] } = useQuery({
    queryKey: ['referrer-customer-games', awardModal.referral?.referrer_id],
    queryFn: async () => {
      if (!awardModal.referral?.referrer_id) return []
      const { data } = await supabase
        .from('customer_games')
        .select('*, game:games(*)')
        .eq('customer_id', awardModal.referral.referrer_id)
        .eq('status', 'active')
      return data || []
    },
    enabled: !!awardModal.referral?.referrer_id && awardModal.open,
  })

  // Auto-populate target game & username when modal opens
  useEffect(() => {
    if (awardModal.open && awardModal.referral?.referrer_id) {
      if (referrerGames && referrerGames.length > 0) {
        setAwardModal(prev => {
          if (prev.gameId && prev.gameUsername) return prev
          return {
            ...prev,
            gameId: referrerGames[0].game_id,
            gameUsername: referrerGames[0].username,
          }
        })
      } else if (allGames.length > 0) {
        setAwardModal(prev => {
          if (prev.gameId) return prev
          return {
            ...prev,
            gameId: allGames[0].id,
            gameUsername: prev.gameUsername || prev.referral?.referrer?.username || '',
          }
        })
      }
    }
  }, [awardModal.open, awardModal.referral?.referrer_id, referrerGames, allGames])

  // Resolved active modes
  const isCommActive = localCommEnabled !== null 
    ? localCommEnabled 
    : (refSettings?.commission_enabled ?? referralCommissionEnabled)

  const isCustomActive = localCustomEnabled !== null 
    ? localCustomEnabled 
    : (refSettings?.custom_bonus_enabled ?? referralCustomBonusEnabled)

  const activeDefaultBonus = localDefaultBonus !== null
    ? localDefaultBonus
    : (refSettings?.default_custom_bonus ?? referralDefaultCustomBonus ?? 10)

  // Calculations
  const validEarnings = (earnings as any[]).filter(e => e.status !== 'cancelled')
  const totalCommissionPaid = validEarnings
    .filter(e => !e.earning_type || e.earning_type === 'commission')
    .reduce((s, e) => s + (parseFloat(e.commission_amount) || 0), 0)

  const totalCustomBonusPaid = validEarnings
    .filter(e => e.earning_type === 'custom_bonus')
    .reduce((s, e) => s + (parseFloat(e.commission_amount) || 0), 0)

  // Direct bonuses on referrals table if not logged in earnings
  const directCustomBonusTotal = (referrals as any[])
    .filter(r => r.custom_bonus_amount && r.custom_bonus_status === 'awarded')
    .reduce((s, r) => s + (parseFloat(r.custom_bonus_amount) || 0), 0)

  const finalCustomBonusPaid = Math.max(totalCustomBonusPaid, directCustomBonusTotal)
  const totalAllPaid = totalCommissionPaid + finalCustomBonusPaid
  const pendingPayout = (earnings as any[]).filter(e => e.status === 'pending').reduce((s, e) => s + (parseFloat(e.commission_amount) || 0), 0)
  const qualifiedCount = (referrals as any[]).filter(r => r.status === 'qualified').length

  // Save Modes mutation
  const handleToggleMode = async (comm: boolean, custom: boolean, defaultBonus: number) => {
    setIsUpdatingModes(true)
    try {
      await updateReferralModeSettings(comm, custom, defaultBonus)
      setLocalCommEnabled(comm)
      setLocalCustomEnabled(custom)
      setLocalDefaultBonus(defaultBonus)
      await qc.invalidateQueries({ queryKey: ['referral-settings'] })
      toast.success('Referral system settings updated!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings')
    } finally {
      setIsUpdatingModes(false)
    }
  }

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

  // Award Custom Bonus Mutation
  const awardBonusMutation = useMutation({
    mutationFn: async () => {
      if (!awardModal.referral) throw new Error('No referral selected')
      if (awardModal.amount <= 0) throw new Error('Please enter a valid bonus amount greater than 0')

      if (awardModal.loadToGame) {
        if (!awardModal.gameId) throw new Error('Please select a game to load points into')
        if (!awardModal.gameUsername?.trim()) throw new Error("Please enter player's game username")
      }

      const ref = awardModal.referral
      await awardCustomBonus({
        referralId: ref.id,
        referrerId: ref.referrer_id,
        referredName: ref.referred?.full_name || ref.referred?.username,
        amount: awardModal.amount,
        notes: awardModal.notes,
        markQualified: awardModal.markQualified,
        gameId: awardModal.loadToGame ? awardModal.gameId : undefined,
        gameUsername: awardModal.loadToGame ? awardModal.gameUsername.trim() : undefined,
      })
    },
    onSuccess: () => {
      const recipientName = awardModal.referral?.referrer?.full_name || awardModal.referral?.referrer?.username || 'customer'
      toast.success(`Successfully awarded $${awardModal.amount} bonus to ${recipientName}${awardModal.loadToGame ? ' and loaded to game!' : '!'}`)
      setAwardModal({
        open: false,
        referral: null,
        amount: activeDefaultBonus,
        notes: '',
        markQualified: true,
        loadToGame: true,
        gameId: '',
        gameUsername: '',
      })
      qc.invalidateQueries({ queryKey: ['admin-all-referrals'] })
      qc.invalidateQueries({ queryKey: ['admin-all-earnings'] })
      qc.invalidateQueries({ queryKey: ['game-point-balances'] })
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (e: any) => toast.error(e.message || 'Failed to award bonus'),
  })

  // Update Referral Status mutation
  const updateReferralStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'qualified' | 'pending' | 'disqualified' }) => {
      const updates: any = { status }
      if (status === 'qualified') updates.qualified_at = new Date().toISOString()
      const { error } = await supabase.from('referrals').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Referral status updated')
      qc.invalidateQueries({ queryKey: ['admin-all-referrals'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  // Search customers
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

      const { data: existing } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', selectedReferrer.id)
        .eq('referred_id', selectedReferred.id)
        .maybeSingle()
      if (existing) throw new Error('A referral record already exists between these two users.')

      const { error: refError } = await supabase
        .from('referrals')
        .insert({ referrer_id: selectedReferrer.id, referred_id: selectedReferred.id, status: 'pending' })
      if (refError) throw refError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ referred_by: selectedReferrer.id })
        .eq('id', selectedReferred.id)
      if (profileError) throw profileError
    },
    onSuccess: () => {
      toast.success(`Referral assigned: ${selectedReferred?.full_name || selectedReferred?.username} → ${selectedReferrer?.full_name || selectedReferrer?.username}`)
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
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Referral Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure commission and custom bonus rewards, track referrers, and award bonuses.
          </p>
        </div>

        {/* Current Active Mode Badge */}
        <div className="flex items-center gap-2">
          {isCommActive && isCustomActive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Dual System (Commission + Custom Bonus)
            </span>
          )}
          {isCommActive && !isCustomActive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5" /> Commission System Active
            </span>
          )}
          {!isCommActive && isCustomActive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neon-gold/10 border border-neon-gold/30 text-neon-gold text-xs font-semibold">
              <Gift className="h-3.5 w-3.5" /> Custom Bonus System Active
            </span>
          )}
          {!isCommActive && !isCustomActive && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold">
              <AlertTriangle className="h-3.5 w-3.5" /> Referral System Disabled
            </span>
          )}
        </div>
      </div>

      {/* ===== Referral System Modes Configuration Card ===== */}
      <div className="glass-card p-6 border border-primary/30 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" /> Referral System Modes & Control
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Turn the Commission system or Custom Bonus system ON or OFF. Customers will only see active options on their dashboard.
            </p>
          </div>
          {isUpdatingModes && (
            <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving changes...
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Option 1: Commission System */}
          <div className={cn(
            'p-5 rounded-xl border transition-all duration-200',
            isCommActive 
              ? 'bg-primary/5 border-primary/40 shadow-[0_0_15px_rgba(0,212,255,0.08)]' 
              : 'bg-white/2 border-border opacity-70'
          )}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center',
                  isCommActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Tier Commission System</h3>
                  <span className={cn('text-[11px] font-mono font-medium', isCommActive ? 'text-neon-green' : 'text-muted-foreground')}>
                    {isCommActive ? '● Enabled' : '○ Disabled'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleMode(!isCommActive, isCustomActive, activeDefaultBonus)}
                disabled={isUpdatingModes}
                className={cn(
                  'p-1 rounded-lg transition-colors',
                  isCommActive ? 'text-primary hover:text-primary/80' : 'text-muted-foreground hover:text-white'
                )}
                title={isCommActive ? 'Disable Commission System' : 'Enable Commission System'}
              >
                {isCommActive ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2">
              Calculates automatic percentage commissions (e.g. 2%, 5%, 10%) on every completed game load made by referred players. When disabled, commission tiers and percentage calculations are hidden from the customer dashboard.
            </p>
          </div>

          {/* Option 2: Custom Bonus System */}
          <div className={cn(
            'p-5 rounded-xl border transition-all duration-200',
            isCustomActive 
              ? 'bg-neon-gold/5 border-neon-gold/40 shadow-[0_0_15px_rgba(245,158,11,0.08)]' 
              : 'bg-white/2 border-border opacity-70'
          )}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center',
                  isCustomActive ? 'bg-neon-gold/20 text-neon-gold' : 'bg-muted text-muted-foreground'
                )}>
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Custom Bonus System</h3>
                  <span className={cn('text-[11px] font-mono font-medium', isCustomActive ? 'text-neon-gold' : 'text-muted-foreground')}>
                    {isCustomActive ? '● Enabled' : '○ Disabled'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggleMode(isCommActive, !isCustomActive, activeDefaultBonus)}
                disabled={isUpdatingModes}
                className={cn(
                  'p-1 rounded-lg transition-colors',
                  isCustomActive ? 'text-neon-gold hover:text-neon-gold/80' : 'text-muted-foreground hover:text-white'
                )}
                title={isCustomActive ? 'Disable Custom Bonus System' : 'Enable Custom Bonus System'}
              >
                {isCustomActive ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-2 mb-3">
              Allows admin and staff to manually award custom bonuses ($5, $10, $15, etc.) to referrers for bringing in new customers. Simplifies rewarding without requiring strict tier percentages.
            </p>

            {/* Default bonus input */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Default Bonus Quick Amount:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-mono font-bold">$</span>
                <input
                  type="number"
                  min="1"
                  value={activeDefaultBonus}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 10
                    setLocalDefaultBonus(val)
                  }}
                  onBlur={() => handleToggleMode(isCommActive, isCustomActive, activeDefaultBonus)}
                  className="game-input w-20 py-1 px-2 text-right text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Referrals', value: (referrals as any[]).length, icon: Users, color: 'text-primary' },
          { label: 'Qualified Referrals', value: qualifiedCount, icon: CheckCircle, color: 'text-neon-green' },
          { 
            label: isCommActive && !isCustomActive 
              ? 'Commission Paid' 
              : !isCommActive && isCustomActive 
                ? 'Bonuses Awarded' 
                : 'Total Rewards Paid', 
            value: formatCurrency(totalAllPaid), 
            icon: Gift, 
            color: 'text-purple-400' 
          },
          { 
            label: isCustomActive ? 'Custom Bonuses' : 'Pending Payout', 
            value: isCustomActive ? formatCurrency(finalCustomBonusPaid) : formatCurrency(pendingPayout), 
            icon: isCustomActive ? Sparkles : TrendingUp, 
            color: 'text-neon-gold' 
          },
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
          Manually link a referrer to a customer who signed up without using a referral code or link.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Referrer Search */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">① Referrer</p>
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
                    placeholder="Search by name, username, phone, email..."
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">② Referred Customer</p>
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
                      <AlertTriangle className="h-3 w-3" /> Already has a referrer
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
                    placeholder="Search by name, username, phone, email..."
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
                {' '}<span className="text-muted-foreground">was referred by</span>{' '}
                <span className="font-semibold text-primary">{selectedReferrer.full_name || selectedReferrer.username}</span>
                {' '}<span className="text-muted-foreground">— this will be recorded.</span>
              </p>
              {selectedReferred.referred_by && (
                <p className="text-destructive text-xs mt-1 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> This customer already has a referrer. Cannot overwrite.
                </p>
              )}
            </div>
            <button
              onClick={() => assignReferralMutation.mutate()}
              disabled={assignReferralMutation.isPending || !!selectedReferred.referred_by}
              className="btn-neon px-5 py-2 text-sm whitespace-nowrap shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {assignReferralMutation.isPending ? 'Assigning...' : 'Assign Referral'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Qualification Settings */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Qualification Rules
            </h2>
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
                <p className="text-xs text-muted-foreground">Trigger when a referral becomes qualified</p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-primary/20 text-primary font-mono">First Completed Load</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-border">
              <div>
                <p className="text-sm text-white">Minimum Load Amount</p>
                <p className="text-xs text-muted-foreground">Minimum deposit amount to qualify</p>
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
        <div className={cn('glass-card p-6 transition-opacity', !isCommActive && 'opacity-60')}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Commission Levels
            </h2>
            {!isCommActive && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                Commission Mode Disabled
              </span>
            )}
          </div>

          {!isCommActive ? (
            <div className="p-4 rounded-xl bg-white/2 border border-border text-center">
              <p className="text-xs text-muted-foreground">
                Commission Levels are currently inactive because the Tier Commission System is turned off. Orders do not automatically grant commissions while this is off.
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* ===== All Referrals Table ===== */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold text-white text-base">All Referrals</h2>
            <p className="text-xs text-muted-foreground">List of customer referrals and bonus status</p>
          </div>
          <span className="text-xs text-muted-foreground">
            Total: <span className="font-bold text-white">{(referrals as any[]).length}</span> referrals
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-3 pr-4">Referrer</th>
                <th className="pb-3 pr-4">Referred Customer</th>
                <th className="pb-3 pr-4">Status</th>
                {isCustomActive && <th className="pb-3 pr-4">Custom Bonus</th>}
                <th className="pb-3 pr-4">Date</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(referrals as any[]).slice(0, 50).map((ref: any) => {
                const bonusAmount = ref.custom_bonus_amount ? parseFloat(ref.custom_bonus_amount) : 0
                return (
                  <tr key={ref.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="text-white font-medium">{ref.referrer?.full_name || ref.referrer?.username || '—'}</p>
                      <p className="text-xs text-muted-foreground">@{ref.referrer?.username || '—'}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <p className="text-white font-medium">{ref.referred?.full_name || ref.referred?.username || '—'}</p>
                      <p className="text-xs text-muted-foreground">@{ref.referred?.username || '—'}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn('text-xs px-2.5 py-0.5 rounded-full border font-medium',
                        ref.status === 'qualified' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                        ref.status === 'disqualified' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      )}>{ref.status}</span>
                    </td>
                    {isCustomActive && (
                      <td className="py-3 pr-4">
                        {bonusAmount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-neon-gold">+{formatCurrency(bonusAmount)}</span>
                            {ref.custom_bonus_status === 'awarded' && (
                              <span title="Awarded">
                                <Check className="h-3.5 w-3.5 text-neon-green" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </td>
                    )}
                    <td className="py-3 pr-4 text-muted-foreground text-xs whitespace-nowrap">
                      {formatRelativeTime(ref.created_at)}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isCustomActive && (
                          <button
                            onClick={() => {
                              setAwardModal({
                                open: true,
                                referral: ref,
                                amount: activeDefaultBonus,
                                notes: '',
                                markQualified: true,
                                loadToGame: true,
                                gameId: '',
                                gameUsername: '',
                              })
                            }}
                            className="btn-ghost-neon text-xs px-2.5 py-1 text-neon-gold border-neon-gold/30 hover:bg-neon-gold/10"
                            title="Award custom bonus to referrer"
                          >
                            <Gift className="h-3.5 w-3.5 inline mr-1" />
                            Award Bonus
                          </button>
                        )}

                        {ref.status !== 'qualified' && (
                          <button
                            onClick={() => updateReferralStatusMutation.mutate({ id: ref.id, status: 'qualified' })}
                            className="p-1 rounded hover:bg-white/5 text-xs text-neon-green"
                            title="Mark Qualified"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(referrals as any[]).length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No referrals recorded yet</p>
          )}
        </div>
      </div>

      {/* ===== Commission & Bonus Ledger ===== */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white text-base">Rewards Ledger</h2>
            <p className="text-xs text-muted-foreground">History of commissions and custom bonuses awarded</p>
          </div>
          <span className="text-xs text-muted-foreground">
            Total entries: <span className="font-bold text-white">{(earnings as any[]).length}</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground border-b border-border">
                <th className="pb-3 pr-4">Recipient</th>
                <th className="pb-3 pr-4">Type</th>
                <th className="pb-3 pr-4">Reward</th>
                <th className="pb-3 pr-4">Details</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(earnings as any[]).slice(0, 50).map((e: any) => {
                const isCustom = e.earning_type === 'custom_bonus'
                return (
                  <tr key={e.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-2.5 pr-4 text-white">
                      <p className="font-medium">{e.user?.full_name || e.user?.username || `${e.user_id?.slice(0, 8)}…`}</p>
                      <p className="text-[11px] text-muted-foreground font-mono">{e.user?.username ? `@${e.user?.username}` : ''}</p>
                    </td>
                    <td className="py-2.5 pr-4">
                      {isCustom ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-neon-gold/20 text-neon-gold border border-neon-gold/30 font-medium">
                          Custom Bonus
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 font-medium">
                          Commission (L{e.level})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-neon-green font-bold text-sm">
                      +{formatCurrency(e.commission_amount)}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {isCustom ? (
                        <span>{e.notes || 'Admin custom bonus'}</span>
                      ) : (
                        <span>
                          Load {formatCurrency(e.deposit_amount)} × {e.commission_percentage}%
                          {e.source_order?.game?.name ? ` (${e.source_order.game.name})` : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                        e.status === 'paid' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' :
                        e.status === 'cancelled' ? 'bg-destructive/20 text-destructive border-destructive/30' :
                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      )}>{e.status}</span>
                    </td>
                    <td className="py-2.5 text-muted-foreground text-xs whitespace-nowrap">
                      {formatRelativeTime(e.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(earnings as any[]).length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">No rewards recorded yet</p>
          )}
        </div>
      </div>

      {/* ===== Award Custom Bonus Modal ===== */}
      {awardModal.open && awardModal.referral && (() => {
        const selectedGameBalance = (pointBalances as any[]).find(p => p.game_id === awardModal.gameId)
        const selectedGameStock = selectedGameBalance ? selectedGameBalance.remaining_points : null

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="glass-card p-6 max-w-md w-full border border-neon-gold/40 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Gift className="h-5 w-5 text-neon-gold" /> Award Referral Bonus
                </h3>
                <button
                  onClick={() => setAwardModal({ open: false, referral: null, amount: activeDefaultBonus, notes: '', markQualified: true, loadToGame: true, gameId: '', gameUsername: '' })}
                  className="text-muted-foreground hover:text-white p-1 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Recipient Details */}
                <div className="p-3 rounded-xl bg-white/5 border border-border space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referrer (Recipient):</span>
                    <span className="font-bold text-white">
                      {awardModal.referral.referrer?.full_name || awardModal.referral.referrer?.username}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Referred Friend:</span>
                    <span className="text-primary font-medium">
                      {awardModal.referral.referred?.full_name || awardModal.referral.referred?.username}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Status:</span>
                    <span className={cn(
                      'font-medium capitalize',
                      awardModal.referral.status === 'qualified' ? 'text-neon-green' : 'text-yellow-400'
                    )}>
                      {awardModal.referral.status}
                    </span>
                  </div>
                </div>

                {/* Bonus Amount Selector */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Bonus Amount ($)
                  </label>
                  {/* Preset Pills */}
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[5, 10, 15, 20].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setAwardModal((m) => ({ ...m, amount: preset }))}
                        className={cn(
                          'py-2 rounded-lg text-sm font-bold border transition-all',
                          awardModal.amount === preset
                            ? 'bg-neon-gold text-black border-neon-gold shadow-lg shadow-neon-gold/20'
                            : 'bg-white/5 text-white border-border hover:border-neon-gold/50'
                        )}
                      >
                        ${preset}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="number"
                      min="1"
                      step="0.5"
                      value={awardModal.amount}
                      onChange={(e) => setAwardModal((m) => ({ ...m, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="Enter custom amount..."
                      className="game-input pl-9 w-full text-base font-bold text-neon-gold"
                    />
                  </div>
                </div>

                {/* Direct Game Loading Section */}
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gamepad2 className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-white">Load Directly to Game Account</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={awardModal.loadToGame}
                        onChange={(e) => setAwardModal((m) => ({ ...m, loadToGame: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {awardModal.loadToGame && (
                    <div className="space-y-3 pt-1 border-t border-border/50">
                      {/* Game Selector */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                            Target Game
                          </label>
                          {selectedGameStock !== null && (
                            <span className={cn(
                              'text-[11px] font-mono font-bold',
                              selectedGameStock >= awardModal.amount ? 'text-neon-green' : 'text-destructive'
                            )}>
                              Stock: {selectedGameStock.toLocaleString()} pts
                            </span>
                          )}
                        </div>
                        <select
                          value={awardModal.gameId}
                          onChange={(e) => {
                            const newGameId = e.target.value
                            const matched = (referrerGames as any[]).find(g => g.game_id === newGameId)
                            setAwardModal((m) => ({
                              ...m,
                              gameId: newGameId,
                              gameUsername: matched ? matched.username : m.gameUsername,
                            }))
                          }}
                          className="game-input w-full text-xs"
                        >
                          <option value="" disabled>Choose a game...</option>
                          {(allGames as any[]).map((g) => {
                            const bal = (pointBalances as any[]).find(p => p.game_id === g.id)
                            const stock = bal ? bal.remaining_points : null
                            const hasAcc = (referrerGames as any[]).some(rg => rg.game_id === g.id)
                            return (
                              <option key={g.id} value={g.id}>
                                {g.name} {hasAcc ? '★ (Player Account Linked)' : ''} {stock !== null ? `— [Stock: ${stock.toLocaleString()} pts]` : ''}
                              </option>
                            )
                          })}
                        </select>
                      </div>

                      {/* Game Username / ID */}
                      <div>
                        <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Player Game Username / ID
                        </label>
                        <input
                          type="text"
                          value={awardModal.gameUsername}
                          onChange={(e) => setAwardModal((m) => ({ ...m, gameUsername: e.target.value }))}
                          placeholder="Enter player's game username"
                          className="game-input w-full text-xs"
                        />
                        {(referrerGames as any[]).length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-muted-foreground">Linked Accounts:</span>
                            {(referrerGames as any[]).map((rg: any) => (
                              <button
                                key={rg.id}
                                type="button"
                                onClick={() => setAwardModal((m) => ({
                                  ...m,
                                  gameId: rg.game_id,
                                  gameUsername: rg.username,
                                }))}
                                className={cn(
                                  'text-[10px] px-2 py-0.5 rounded-full border transition-colors',
                                  awardModal.gameId === rg.game_id && awardModal.gameUsername === rg.username
                                    ? 'bg-primary/20 border-primary text-primary font-bold'
                                    : 'bg-white/5 border-border text-muted-foreground hover:text-white'
                                )}
                              >
                                {rg.game?.name || 'Game'}: {rg.username}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Point inventory deduction notice */}
                      <div className="p-2.5 rounded-lg bg-black/40 border border-primary/20 text-[11px] text-muted-foreground flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>
                          Awarding will load <strong>{awardModal.amount} pts</strong> directly into the player's account and automatically deduct <strong>{awardModal.amount} pts</strong> from <strong>{selectedGameBalance?.game_name || 'the game'}</strong>'s point stock inventory.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Note */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    Admin Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Welcome referral bonus, first deposit reward"
                    value={awardModal.notes}
                    onChange={(e) => setAwardModal((m) => ({ ...m, notes: e.target.value }))}
                    className="game-input w-full text-xs"
                  />
                </div>

                {/* Mark Qualified checkbox */}
                {awardModal.referral.status !== 'qualified' && (
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                    <input
                      type="checkbox"
                      checked={awardModal.markQualified}
                      onChange={(e) => setAwardModal((m) => ({ ...m, markQualified: e.target.checked }))}
                      className="rounded border-border bg-white/5 text-primary focus:ring-primary h-4 w-4"
                    />
                    <span>Mark this referral as <strong>Qualified</strong> upon awarding bonus</span>
                  </label>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAwardModal({ open: false, referral: null, amount: activeDefaultBonus, notes: '', markQualified: true, loadToGame: true, gameId: '', gameUsername: '' })}
                    className="btn-ghost-neon flex-1 text-xs py-2.5"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => awardBonusMutation.mutate()}
                    disabled={awardBonusMutation.isPending || awardModal.amount <= 0 || (awardModal.loadToGame && (!awardModal.gameId || !awardModal.gameUsername.trim()))}
                    className="btn-neon-gold flex-1 text-xs py-2.5 flex items-center justify-center gap-1.5 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {awardBonusMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Awarding & Loading...
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4" /> Award ${awardModal.amount}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
