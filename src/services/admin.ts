import { supabase } from '@/lib/supabase'
import type { AdminStats, Profile } from '@/types'

export async function fetchAdminStats(): Promise<AdminStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString()

  const [todayOrdersRes, pendingRes, customersRes, revenueRes, recentRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, base_amount', { count: 'exact' })
      .gte('created_at', todayStr),
    supabase
      .from('orders')
      .select('id', { count: 'exact' })
      .eq('status', 'pending_payment_review'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('role', 'customer'),
    supabase
      .from('orders')
      .select('base_amount')
      .gte('created_at', todayStr)
      .eq('status', 'completed'),
    supabase
      .from('orders')
      .select('*, game:games(name), profile:profiles!user_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const todayRevenue = (revenueRes.data || []).reduce((sum, o) => sum + o.base_amount, 0)

  return {
    today_orders: todayOrdersRes.count || 0,
    today_revenue: todayRevenue,
    pending_orders: pendingRes.count || 0,
    total_customers: customersRes.count || 0,
    total_revenue_month: 0,
    recent_orders: recentRes.data || [],
  }
}

export async function fetchCustomers(filters: { search?: string; role?: string } = {}): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters.role) {
    if (filters.role.includes(',')) {
      query = query.in('role', filters.role.split(','))
    } else {
      query = query.eq('role', filters.role)
    }
  }
  if (filters.search) {
    query = query.or(
      `full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function fetchCustomerDetail(customerId: string): Promise<any> {
  const [profileRes, ordersRes, gamesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', customerId).single(),
    supabase
      .from('orders')
      .select('*, game:games(name)')
      .eq('user_id', customerId)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('customer_games')
      .select('*, game:games(name)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ])

  if (profileRes.error) throw profileRes.error
  return { 
    ...profileRes.data, 
    orders: ordersRes.data || [],
    customer_games: gamesRes.data || []
  }
}

export async function updateCustomerStatus(customerId: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ account_status: status })
    .eq('id', customerId)
  if (error) throw error
}

export async function updateCustomerBonus(customerId: string, bonusPct: number): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ custom_bonus_percentage: bonusPct })
    .eq('id', customerId)
  if (error) throw error
}

export async function assignCustomerGame(customerId: string, gameId: string, username: string): Promise<void> {
  const { error } = await supabase
    .from('customer_games')
    .insert({ customer_id: customerId, game_id: gameId, username, status: 'active' })
  if (error) throw error
}

export async function updateCustomerProfile(customerId: string, data: { full_name?: string; username?: string }): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', customerId)
  if (error) throw error
}

export async function deleteCustomer(customerId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-delete-user', {
    body: { userId: customerId }
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}
