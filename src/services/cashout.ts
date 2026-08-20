import { supabase } from '@/lib/supabase'

export interface CashoutRequest {
  id: string
  request_number: string
  user_id: string
  game_name: string
  game_username: string
  amount: number
  payment_method_name: string
  payment_detail: string
  qr_code_path: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
  updated_at: string
  profile?: { full_name: string; username: string; email: string }
}

export interface CreateCashoutPayload {
  game_name: string
  game_username: string
  amount: number
  payment_method_name: string
  payment_detail: string
  qr_code_path?: string
}

export async function createCashoutRequest(payload: CreateCashoutPayload): Promise<CashoutRequest> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  const { data, error } = await supabase
    .from('cashout_requests')
    .insert({ ...payload, user_id: user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchMyCashoutRequests(): Promise<CashoutRequest[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('cashout_requests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAllCashoutRequests(status?: string): Promise<CashoutRequest[]> {
  let query = supabase
    .from('cashout_requests')
    .select('*, profile:profiles!user_id(full_name, username, email)')
    .order('created_at', { ascending: false })
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function updateCashoutStatus(
  id: string,
  status: 'approved' | 'rejected',
  adminNote?: string
): Promise<void> {
  const { error } = await supabase
    .from('cashout_requests')
    .update({ status, admin_note: adminNote || null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}