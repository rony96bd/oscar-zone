import { supabase } from '@/lib/supabase'
import type { Referral, ReferralLevel, ReferralStats } from '@/types'

export async function fetchReferralStats(userId: string): Promise<ReferralStats> {
  const [referralsRes, earningsRes, levelsRes] = await Promise.all([
    supabase.from('referrals').select('*').eq('referrer_id', userId),
    supabase.from('referral_earnings').select('commission_amount, status').eq('user_id', userId),
    supabase.from('referral_levels').select('*').order('level'),
  ])

  const referrals = referralsRes.data || []
  const earnings = earningsRes.data || []
  const levels = levelsRes.data || []

  const qualifiedCount = referrals.filter(r => r.status === 'qualified').length
  const totalEarnings = earnings
    .filter(e => e.status !== 'cancelled')
    .reduce((sum, e) => sum + e.commission_amount, 0)
  const pendingEarnings = earnings
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + e.commission_amount, 0)

  const currentLevel = levels.find(
    l => qualifiedCount >= l.min_referrals && (l.max_referrals === null || qualifiedCount <= l.max_referrals)
  )

  return {
    total_referrals: referrals.length,
    qualified_referrals: qualifiedCount,
    pending_referrals: referrals.filter(r => r.status === 'pending').length,
    total_earnings: totalEarnings,
    pending_earnings: pendingEarnings,
    current_level: currentLevel?.level || 0,
    current_commission_pct: currentLevel?.commission_percentage || 0,
  }
}

export async function fetchReferralLevels(): Promise<ReferralLevel[]> {
  const { data, error } = await supabase
    .from('referral_levels')
    .select('*')
    .order('level')
  if (error) throw error
  return data || []
}

export async function fetchMilestones(): Promise<any[]> {
  const { data, error } = await supabase
    .from('referral_milestones')
    .select('*')
    .eq('is_active', true)
    .order('required_referrals')
  if (error) throw error
  return data || []
}

export async function fetchReferrals(userId: string): Promise<Referral[]> {
  const { data, error } = await supabase
    .from('referrals')
    .select('*, referred:profiles!referred_id(*)')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchEarnings(userId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('referral_earnings')
    .select('*, referral:referrals(*, referred:profiles!referred_id(*)), source_order:orders(*, game:games(name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}
