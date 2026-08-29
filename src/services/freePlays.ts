import { supabase } from '@/lib/supabase'
import type { FreePlayRequest } from '@/types'

export async function checkFreePlayEligibility(userId: string): Promise<{ eligible: boolean, remainingCount: number }> {
  // 1. Get count of eligible deposits (completed orders >= 10). One free play per qualifying deposit.
  const { count: depositsCount, error: depositsError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('base_amount', 10);
    
  if (depositsError) throw depositsError;

  const earnedFreePlays = depositsCount || 0;

  // 2. Get count of free play requests made (not rejected)
  const { count: requestsCount, error: requestsError } = await supabase
    .from('free_play_requests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'rejected');
    
  if (requestsError) throw requestsError;

  const remainingCount = earnedFreePlays - (requestsCount || 0);
  
  return {
    eligible: remainingCount > 0,
    remainingCount: Math.max(0, remainingCount)
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
