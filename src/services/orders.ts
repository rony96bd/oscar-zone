import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus, CreateOrderPayload } from '@/types'
import { ORDERS_PAGE_SIZE } from '@/lib/constants'

export async function fetchOrders(
  page = 0,
  filters: {
    status?: OrderStatus
    game_id?: string
    payment_method_id?: string
    search?: string
    date_from?: string
    date_to?: string
  } = {}
): Promise<{ data: Order[]; count: number }> {
  let query = supabase
    .from('orders')
    .select(
      '*, game:games(*), payment_method:payment_methods(*), profile:profiles!user_id(*)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(page * ORDERS_PAGE_SIZE, (page + 1) * ORDERS_PAGE_SIZE - 1)

  if (filters.status) query = query.eq('status', filters.status)
  if (filters.game_id) query = query.eq('game_id', filters.game_id)
  if (filters.payment_method_id) query = query.eq('payment_method_id', filters.payment_method_id)
  if (filters.date_from) query = query.gte('created_at', filters.date_from)
  if (filters.date_to) query = query.lte('created_at', filters.date_to)
  if (filters.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,username.ilike.%${filters.search}%,guest_name.ilike.%${filters.search}%`
    )
  }

  const { data, error, count } = await query
  if (error) throw error
  return { data: data || [], count: count || 0 }
}

export async function fetchCustomerOrders(customerId: string, page = 0): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, game:games(*), payment_method:payment_methods(*), bonus_snapshot:order_bonus_snapshots(*)')
    .eq('user_id', customerId)
    .order('created_at', { ascending: false })
    .range(page * ORDERS_PAGE_SIZE, (page + 1) * ORDERS_PAGE_SIZE - 1)
  if (error) throw error
  return data || []
}

export async function fetchOrderById(id: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      game:games(*),
      payment_method:payment_methods(*),
      profile:profiles!user_id(*),
      bonus_snapshot:order_bonus_snapshots(*),
      status_history:order_status_history(*, changed_by_profile:profiles!changed_by(*))
    `)
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string
): Promise<void> {
  const { error } = await supabase.functions.invoke('update-order-status', {
    body: { order_id: orderId, status, note },
  })
  if (error) throw error
}

export async function assignOrderToAgent(orderId: string, agentId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ assigned_agent_id: agentId })
    .eq('id', orderId)
  if (error) throw error
}

export async function migrateGuestOrderToUser(
  orderId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ user_id: userId, is_guest: false })
    .eq('id', orderId)
  if (error) throw error
}

export async function fetchGuestOrders(): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, game:games(*), payment_method:payment_methods(*)')
    .eq('is_guest', true)
    .is('user_id', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function calculateBonusPreview(
  gameId: string,
  amount: number,
  customerId?: string
): Promise<{
  regular_bonus_pct: number
  regular_bonus_amount: number
  promo_bonus_pct: number
  promo_bonus_amount: number
  total_bonus: number
  final_credit: number
  promotion_name: string | null
}> {
  const { data, error } = await supabase.functions.invoke('calculate-bonus', {
    body: { game_id: gameId, amount, customer_id: customerId },
  })
  if (error) throw error
  return data
}
