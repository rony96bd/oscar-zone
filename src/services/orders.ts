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
    .limit(3)
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
  note?: string,
  staffId?: string
): Promise<void> {
  // Call the edge function — this is the single source of truth for order status changes.
  // It handles DB update, status history, notifications, AND referral qualification.
  const { data, error } = await supabase.functions.invoke('update-order-status', {
    body: { order_id: orderId, status, note, staff_id: staffId },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
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
  rawAmount: number,
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
  const amount = Math.floor(rawAmount)

  if (!gameId || !amount || amount < 1) {
    throw new Error('Invalid parameters')
  }

  // Fetch all active promotions
  const now = new Date()
  const { data: promotions } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: false })

  // Find the regular bonus if any
  const regularPromo = (promotions || []).find(p => p.type === 'regular')
  
  // Default to 10 if no regular promotion is found in DB
  let regularBonusPct = regularPromo ? regularPromo.bonus_percentage : 10

  // Override with customer specific bonus if applicable
  if (customerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('custom_bonus_percentage')
      .eq('id', customerId)
      .single()
    if (profile?.custom_bonus_percentage != null) {
      regularBonusPct = profile.custom_bonus_percentage
    }
  }

  const regularBonusAmount = Math.round(amount * regularBonusPct / 100 * 100) / 100

  let bestPromo = null
  let promoBonusPct = 0
  let promoBonusAmount = 0

  for (const promo of (promotions || [])) {
    if (promo.type === 'regular') continue // already handled
    
    if (amount < promo.minimum_amount) continue
    if (promo.maximum_amount && amount > promo.maximum_amount) continue
    if (promo.start_date && new Date(promo.start_date) > now) continue
    if (promo.end_date && new Date(promo.end_date) < now) continue
    if (promo.applicable_game_ids?.length && !promo.applicable_game_ids.includes(gameId)) continue

    // Specific users only check
    if (promo.applicable_customer_ids && promo.applicable_customer_ids.length > 0) {
      if (!customerId || !promo.applicable_customer_ids.includes(customerId)) {
        continue
      }
    }

    if (promo.type === 'first_load' && customerId) {
      // Check if user has ANY completed orders
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', customerId)
        .eq('status', 'completed')
      if ((count || 0) > 0) continue
    }
    
    if (promo.type === 'daily' && customerId) {
      // Check if user has any completed orders TODAY
      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', customerId)
        .eq('status', 'completed')
        .gte('created_at', startOfDay.toISOString())
      if ((count || 0) > 0) continue
    }

    bestPromo = promo
    promoBonusPct = promo.bonus_percentage
    promoBonusAmount = Math.round(amount * promoBonusPct / 100 * 100) / 100
    break
  }

  const totalBonus = Math.round((regularBonusAmount + promoBonusAmount) * 100) / 100
  const finalCredit = Math.ceil(amount + totalBonus)

  return {
    regular_bonus_pct: regularBonusPct,
    regular_bonus_amount: regularBonusAmount,
    promo_bonus_pct: promoBonusPct,
    promo_bonus_amount: promoBonusAmount,
    total_bonus: totalBonus,
    final_credit: finalCredit,
    promotion_name: bestPromo?.name || null,
  }
}

export async function adminCreateOrder(payload: {
  user_id?: string
  game_id: string
  username: string
  base_amount: number
  payment_method_id?: string
  total_bonus?: number
  final_credit?: number
  status?: OrderStatus
}): Promise<Order> {
  // Generate random order number
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let orderNumber = 'ORD-'
  for (let i = 0; i < 6; i++) {
    orderNumber += chars[Math.floor(Math.random() * chars.length)]
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      user_id: payload.user_id || null,
      game_id: payload.game_id,
      username: payload.username,
      guest_name: !payload.user_id ? payload.username : null,
      is_guest: !payload.user_id,
      base_amount: payload.base_amount,
      total_bonus: payload.total_bonus || 0,
      final_credit: payload.final_credit || payload.base_amount,
      payment_method_id: payload.payment_method_id || null,
      status: payload.status || 'completed', // Default to completed if created by admin
      payment_screenshot: null, // Admin created usually doesn't need screenshot
      admin_note: 'Created manually by admin',
    })
    .select('*, game:games(*), profile:profiles!user_id(*)')
    .single()

  if (error) throw error

  // Log status history
  await supabase.from('order_status_history').insert({
    order_id: data.id,
    status: data.status,
    note: 'Order created by admin'
  })

  return data
}
