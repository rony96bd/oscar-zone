import { supabase } from '@/lib/supabase'
import type { Referral, ReferralLevel, ReferralStats } from '@/types'
import { adminCreateOrder } from '@/services/orders'

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
  gameId,
  gameUsername,
  markQualified = true,
}: {
  referralId: string
  referrerId: string
  referredName?: string
  amount: number
  notes?: string
  gameId?: string
  gameUsername?: string
  markQualified?: boolean
}): Promise<void> {
  const now = new Date().toISOString()
  let orderId: string | null = null
  let gameName: string | null = null

  // 1. If a game is selected, load points into game by creating a completed order
  // This automatically deducts points from that game's inventory!
  if (gameId && gameUsername) {
    try {
      const { data: gameData } = await supabase
        .from('games')
        .select('name')
        .eq('id', gameId)
        .maybeSingle()
      
      gameName = gameData?.name || null

      const createdOrder = await adminCreateOrder({
        user_id: referrerId,
        game_id: gameId,
        username: gameUsername,
        base_amount: 0,
        final_credit: amount,
        total_bonus: 0,
        status: 'completed',
        admin_note: notes?.trim()
          ? `🎁 Referral Bonus: ${notes.trim()}`
          : `🎁 Referral Bonus for referring ${referredName || 'a friend'}`
      })

      if (createdOrder?.id) {
        orderId = createdOrder.id
      }
    } catch (orderErr: any) {
      console.error('Failed to create game load order for referral bonus:', orderErr)
      throw new Error(`Failed to load points into game: ${orderErr.message}`)
    }
  }

  // 2. Attempt to insert into referral_earnings ledger
  let ledgerInserted = false
  const earningNote = notes?.trim()
    ? notes.trim()
    : gameName
      ? `Referral bonus loaded to ${gameName} (${gameUsername || ''})`
      : 'Custom referral bonus awarded by admin'

  try {
    const { error: earnError } = await supabase.from('referral_earnings').insert({
      user_id: referrerId,
      referral_id: referralId,
      source_order_id: orderId,
      commission_amount: amount,
      status: 'paid',
      earning_type: 'custom_bonus',
      notes: earningNote,
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

  // 3. Update referrals table with custom bonus details
  const updateData: any = {
    custom_bonus_amount: amount,
    custom_bonus_status: 'awarded',
    custom_bonus_note: earningNote,
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

  if (refError && !ledgerInserted && !orderId) {
    throw new Error(refError.message || 'Failed to award custom referral bonus.')
  }

  // 4. Send notification to the referrer
  try {
    const notifTitle = gameName ? '🎁 Referral Bonus Loaded to Game!' : '🎁 Referral Bonus Received!'
    const notifMessage = gameName
      ? `You received a $${amount.toFixed(2)} referral bonus loaded directly into your ${gameName} account (${gameUsername})!`
      : `You were awarded a $${amount.toFixed(2)} referral bonus for referring ${referredName || 'a friend'}!`

    await supabase.from('notifications').insert({
      user_id: referrerId,
      title: notifTitle,
      message: notifMessage,
      category: 'referral',
      action_url: gameName ? '/my-games' : '/earnings',
    })
  } catch (notifErr) {
    console.warn('Failed to send notification:', notifErr)
  }
}
