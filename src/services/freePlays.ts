import { supabase } from '@/lib/supabase'
import type { FreePlayRequest } from '@/types'

export async function checkFreePlayEligibility(userId: string): Promise<{ eligible: boolean, remainingCount: number, currentSum: number }> {
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

  return {
    eligible: currentSum >= 10,
    remainingCount: currentSum >= 10 ? 1 : 0,
    currentSum
  };
}

export async function requestFreePlay(userId: string, gameId: string): Promise<FreePlayRequest> {
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
