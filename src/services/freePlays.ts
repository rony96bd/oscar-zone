import { supabase } from '@/lib/supabase'
import type { FreePlayRequest } from '@/types'

export interface FreePlayEligibility {
  mode: 'deposit_based' | 'daily_limit'
  eligible: boolean
  remainingCount: number
  currentSum: number
  depositRequirement: number
  dailyLimit: number
  requestsToday: number
}

export async function checkFreePlayEligibility(userId: string): Promise<FreePlayEligibility> {
  // 1. Fetch system settings for free play
  const { data: settingsData } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', ['free_play_mode', 'free_play_daily_limit', 'free_play_deposit_requirement'])

  const cleanVal = (val: any) => {
    if (typeof val === 'string' && val.startsWith('"') && val.endsWith('"')) {
      return val.slice(1, -1)
    }
    return val
  }

  const rawMode = settingsData?.find(s => s.key === 'free_play_mode')?.value
  const mode: 'deposit_based' | 'daily_limit' = cleanVal(rawMode) === 'daily_limit' ? 'daily_limit' : 'deposit_based'
  const rawDailyLimit = settingsData?.find(s => s.key === 'free_play_daily_limit')?.value
  const dailyLimit = Math.max(1, parseInt(cleanVal(rawDailyLimit) || '1', 10) || 1)
  const rawDepositReq = settingsData?.find(s => s.key === 'free_play_deposit_requirement')?.value
  const depositRequirement = Math.max(1, parseFloat(cleanVal(rawDepositReq) || '10') || 10)

  if (mode === 'daily_limit') {
    // Count how many non-rejected requests user created today
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)
    const startOfTodayISO = startOfToday.toISOString()

    const { data: todayRequests, error: countError } = await supabase
      .from('free_play_requests')
      .select('id, status')
      .eq('user_id', userId)
      .neq('status', 'rejected')
      .gte('created_at', startOfTodayISO)

    if (countError) throw countError

    const requestsToday = todayRequests?.length || 0
    const remainingCount = Math.max(0, dailyLimit - requestsToday)
    const eligible = requestsToday < dailyLimit

    return {
      mode: 'daily_limit',
      eligible,
      remainingCount,
      currentSum: 0,
      depositRequirement,
      dailyLimit,
      requestsToday
    }
  }

  // mode === 'deposit_based'
  // 1. Find the latest free play request that wasn't rejected
  const { data: lastRequest, error: requestError } = await supabase
    .from('free_play_requests')
    .select('created_at')
    .eq('user_id', userId)
    .neq('status', 'rejected')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (requestError) throw requestError;

  // 2. Sum all completed deposits SINCE the last request
  let query = supabase
    .from('orders')
    .select('base_amount')
    .eq('user_id', userId)
    .eq('status', 'completed');

  if (lastRequest) {
    query = query.gt('created_at', lastRequest.created_at);
  }

  const { data: deposits, error: depositsError } = await query;
  if (depositsError) throw depositsError;

  const currentSum = deposits?.reduce((sum, order) => sum + Number(order.base_amount || 0), 0) || 0;
  const eligible = currentSum >= depositRequirement;

  return {
    mode: 'deposit_based',
    eligible,
    remainingCount: eligible ? 1 : 0,
    currentSum,
    depositRequirement,
    dailyLimit,
    requestsToday: 0
  };
}

export async function requestFreePlay(userId: string, gameId: string): Promise<FreePlayRequest> {
  // Pre-check eligibility
  const eligibility = await checkFreePlayEligibility(userId);
  if (!eligibility.eligible) {
    if (eligibility.mode === 'daily_limit') {
      throw new Error(`You have reached your daily Free Play limit for today (${eligibility.dailyLimit}/${eligibility.dailyLimit}). Please return tomorrow!`);
    } else {
      throw new Error(`You need to deposit at least $${eligibility.depositRequirement.toFixed(2)} to qualify for Free Play. Current: $${eligibility.currentSum.toFixed(2)}`);
    }
  }

  const { data, error } = await supabase
    .from('free_play_requests')
    .insert({
      user_id: userId,
      game_id: gameId,
      status: 'pending'
    })
    .select()
    .single();

  if (error) throw error;
  
  // Optional: trigger Edge Function to send telegram notification
  try {
    const { data: profile } = await supabase.from('profiles').select('full_name, username').eq('id', userId).single();
    const { data: game } = await supabase.from('games').select('name').eq('id', gameId).single();
        
    if (profile && game) {
      await supabase.functions.invoke('send-telegram-notification', {
        body: {
          event_type: 'free_play_request',
          customer_name: profile.full_name || 'Unknown',
          game_name: game.name || 'Unknown'
        }
      });
    }
  } catch (err) {
    console.error('Failed to send telegram notification for free play', err);
  }

  return data;
}

export async function fetchAllFreePlayRequests(): Promise<FreePlayRequest[]> {
  const { data, error } = await supabase
    .from('free_play_requests')
    .select('*, profile:profiles(*), game:games(*)')
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data;
}

export async function updateFreePlayRequestStatus(id: string, status: 'approved' | 'rejected'): Promise<FreePlayRequest> {
  const { data, error } = await supabase
    .from('free_play_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
