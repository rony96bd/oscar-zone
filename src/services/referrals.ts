import { supabase } from '@/lib/supabase'
import type { Referral, ReferralLevel, ReferralStats } from '@/types'

export async function fetchReferralStats(userId: string): Promise<ReferralStats> {
  const [referralsRes, earningsRes, levelsRes] = await Promise.all([
    supabase.from('referrals').select('*').eq('referrer_id', userId),
    supabase.from('referral_earnings').select('commission_amount, status, earning_type').eq('user_id', userId),
    supabase.from('referral_levels').select('*').order('level'),
  ])

  const referrals = referralsRes.data || []
  const earnings = earningsRes.data || []
  const levels = levelsRes.data || []

  const qualifiedCount = referrals.filter(r => r.status === 'qualified').length
  
  // Calculate earnings from ledger
  const validEarnings = earnings.filter(e => e.status !== 'cancelled')
  const totalLedger = validEarnings.reduce((sum, e) => sum + (parseFloat(e.commission_amount) || 0), 0)
  const pendingLedger = earnings
    .filter(e => e.status === 'pending')
    .reduce((sum, e) => sum + (parseFloat(e.commission_amount) || 0), 0)

  // Also include any custom bonuses recorded directly on referrals (if not yet in ledger)
  const directCustomBonusTotal = referrals
    .filter(r => r.custom_bonus_amount && r.custom_bonus_status === 'awarded')
    .reduce((sum, r) => sum + (parseFloat(r.custom_bonus_amount) || 0), 0)

  // Commission breakdown
  const commissionEarnings = validEarnings
    .filter(e => !e.earning_type || e.earning_type === 'commission')
    .reduce((sum, e) => sum + (parseFloat(e.commission_amount) || 0), 0)

  const ledgerCustomBonus = validEarnings
    .filter(e => e.earning_type === 'custom_bonus')
    .reduce((sum, e) => sum + (parseFloat(e.commission_amount) || 0), 0)

  // Use the greater of ledger vs direct custom bonus to prevent duplicate counting while ensuring display
  const customBonusTotal = Math.max(ledgerCustomBonus, directCustomBonusTotal)
  const totalEarnings = commissionEarnings + customBonusTotal

  const currentLevel = levels.find(
    l => qualifiedCount >= l.min_referrals && (l.max_referrals === null || qualifiedCount <= l.max_referrals)
  )

  return {
    total_referrals: referrals.length,
    qualified_referrals: qualifiedCount,
    pending_referrals: referrals.filter(r => r.status === 'pending').length,
    total_earnings: totalEarnings,
    pending_earnings: pendingLedger,
    total_commission_earnings: commissionEarnings,
    total_custom_bonus_earnings: customBonusTotal,
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

export async function awardCustomBonus({
  referralId,
  referrerId,
  referredName,
  amount,
  notes,
  markQualified = true,
}: {
  referralId: string
  referrerId: string
  referredName?: string
  amount: number
  notes?: string
  markQualified?: boolean
}): Promise<void> {
  const now = new Date().toISOString()

  // 1. Attempt to insert into referral_earnings ledger
  let ledgerInserted = false
  try {
    const { error: earnError } = await supabase.from('referral_earnings').insert({
      user_id: referrerId,
      referral_id: referralId,
      commission_amount: amount,
      status: 'paid',
      earning_type: 'custom_bonus',
      notes: notes || 'Custom referral bonus awarded by admin',
      deposit_amount: 0,
      commission_percentage: 0,
      level: 0,
    })
    if (!earnError) {
      ledgerInserted = true
    } else {
      console.warn('referral_earnings insert warning:', earnError.message)
    }
  } catch (err) {
    console.warn('referral_earnings insert failed:', err)
  }

  // 2. Update referrals table with custom bonus details
  const updateData: any = {
    custom_bonus_amount: amount,
    custom_bonus_status: 'awarded',
    custom_bonus_note: notes || null,
    custom_bonus_awarded_at: now,
  }

  if (markQualified) {
    updateData.status = 'qualified'
    updateData.qualified_at = now
  }

  const { error: refError } = await supabase
    .from('referrals')
    .update(updateData)
    .eq('id', referralId)

  if (refError && !ledgerInserted) {
    throw new Error(refError.message || 'Failed to award custom referral bonus.')
  }

  // 3. Send notification to the referrer
  try {
    await supabase.from('notifications').insert({
      user_id: referrerId,
      title: '🎁 Referral Bonus Received!',
      message: `You were awarded a $${amount.toFixed(2)} referral bonus for referring ${referredName || 'a friend'}!`,
      category: 'referral',
      action_url: '/earnings',
    })
  } catch (notifErr) {
    console.warn('Failed to send notification:', notifErr)
  }
}
