import { supabase } from '@/lib/supabase'
import type { Game, CustomerGame } from '@/types'

export async function fetchGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchAllGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

export async function fetchGameById(id: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function fetchCustomerGames(customerId: string): Promise<CustomerGame[]> {
  const { data, error } = await supabase
    .from('customer_games')
    .select('*, game:games(*)')
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchAllCustomerGames(): Promise<CustomerGame[]> {
  const { data, error } = await supabase
    .from('customer_games')
    .select('*, game:games(*), profile:profiles!customer_id(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createGame(game: Partial<Game>): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert(game)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateGame(id: string, updates: Partial<Game>): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function assignGameToCustomer(
  customerId: string,
  gameId: string,
  username: string,
  gameUserId?: string
): Promise<CustomerGame> {
  const { data, error } = await supabase
    .from('customer_games')
    .insert({
      customer_id: customerId,
      game_id: gameId,
      username,
      game_user_id: gameUserId || null,
      status: 'active',
    })
    .select('*, game:games(*)')
    .single()
  if (error) throw error
  return data
}

export async function updateCustomerGame(
  id: string,
  updates: Partial<CustomerGame>
): Promise<CustomerGame> {
  const { data, error } = await supabase
    .from('customer_games')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, game:games(*)')
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomerGame(id: string): Promise<void> {
  const { error } = await supabase
    .from('customer_games')
    .update({ status: 'inactive' })
    .eq('id', id)
  if (error) throw error
}
