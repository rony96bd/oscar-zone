import { supabase } from '@/lib/supabase'
import type {
  AccountingCycle,
  GamePointPurchase,
  GamePointBalance,
  PaymentMethodAdjustment,
  PaymentMethodDrawerBalance,
} from '@/types'

export async function fetchActiveCycle(): Promise<AccountingCycle | null> {
  const { data, error } = await supabase
    .from('accounting_cycles')
    .select('*')
    .eq('status', 'active')
    .single()

  if (error) {
    // PGRST116 = no rows found; other errors (e.g. RLS for staff) — return null silently
    return null
  }
  return data
}

export async function fetchAllCycles(): Promise<AccountingCycle[]> {
  const { data, error } = await supabase
    .from('accounting_cycles')
    .select('*, closed_by_profile:profiles!closed_by(full_name)')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export interface CloseCycleData {
  endDate: string
  totalDeposits: number
  totalCashouts: number
  totalAgentCommissions: number
  totalGamePointsCost: number
  totalExpenses: number
  netProfit: number
  closedBy: string
}

export async function closeAccountingCycle(
  cycleId: string,
  data: CloseCycleData
): Promise<void> {
  const { error: closeError } = await supabase
    .from('accounting_cycles')
    .update({
      end_date: data.endDate,
      total_deposits: data.totalDeposits,
      total_cashouts: data.totalCashouts,
      total_agent_commissions: data.totalAgentCommissions,
      total_game_points_cost: data.totalGamePointsCost,
      total_expenses: data.totalExpenses,
      net_profit: data.netProfit,
      status: 'closed',
      closed_by: data.closedBy,
    })
    .eq('id', cycleId)

  if (closeError) throw closeError

  const { error: newCycleError } = await supabase
    .from('accounting_cycles')
    .insert({
      start_date: data.endDate,
      status: 'active',
    })

  if (newCycleError) throw newCycleError
}

export async function undoLastAccountingCycle(): Promise<void> {
  // 1. Get current active cycle
  const { data: activeCycle, error: activeError } = await supabase
    .from('accounting_cycles')
    .select('id')
    .eq('status', 'active')
    .single()

  if (activeError) throw activeError

  // 2. Get most recently closed cycle
  const { data: closedCycles, error: closedError } = await supabase
    .from('accounting_cycles')
    .select('id')
    .eq('status', 'closed')
    .order('end_date', { ascending: false })
    .limit(1)

  if (closedError) throw closedError
  if (!closedCycles || closedCycles.length === 0) {
    throw new Error('No closed cycle found to undo')
  }

  const lastClosedCycle = closedCycles[0]

  // 3. Delete active cycle
  const { error: deleteError } = await supabase
    .from('accounting_cycles')
    .delete()
    .eq('id', activeCycle.id)

  if (deleteError) throw deleteError

  // 4. Restore the last closed cycle
  const { error: restoreError } = await supabase
    .from('accounting_cycles')
    .update({
      status: 'active',
      end_date: null,
      total_deposits: 0,
      total_cashouts: 0,
      total_agent_commissions: 0,
      total_game_points_cost: 0,
      total_expenses: 0,
      net_profit: 0,
      closed_by: null,
    })
    .eq('id', lastClosedCycle.id)

  if (restoreError) throw restoreError
}

export interface AccountingStats {
  activeCycle: AccountingCycle | null
  totalDeposits: number
  totalCashouts: number
  totalAgentCommissions: number
  totalGamePointsCost: number
  totalExpenses: number
  netProfit: number
  depositsByMethod: Record<string, number>
  commissionsByMethod: Record<string, number>
}

export async function fetchActiveAccountingStats(): Promise<AccountingStats> {
  const activeCycle = await fetchActiveCycle()

  const { data: allMethods, error: methodsError } = await supabase
    .from('payment_methods')
    .select('name')
    .eq('is_active', true)

  if (methodsError) throw methodsError

  const depositsByMethod: Record<string, number> = {}
  const commissionsByMethod: Record<string, number> = {}

  ;(allMethods || []).forEach((m) => {
    depositsByMethod[m.name] = 0
    commissionsByMethod[m.name] = 0
  })

  if (!activeCycle) {
    return {
      activeCycle: null,
      totalDeposits: 0,
      totalCashouts: 0,
      totalAgentCommissions: 0,
      totalGamePointsCost: 0,
      totalExpenses: 0,
      netProfit: 0,
      depositsByMethod,
      commissionsByMethod,
    }
  }

  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select(
      'base_amount, payment_method:payment_methods(name, agent_commission_rate)'
    )
    .eq('status', 'completed')
    .gte('updated_at', activeCycle.start_date)

  if (orderError) throw orderError

  const { data: cashouts, error: cashoutError } = await supabase
    .from('cashout_requests')
    .select('amount')
    .eq('status', 'approved')
    .gte('updated_at', activeCycle.start_date)

  if (cashoutError) throw cashoutError

  const { data: purchases, error: purchaseError } = await supabase
    .from('game_point_purchases')
    .select('amount')
    .gte('created_at', activeCycle.start_date)

  if (purchaseError) throw purchaseError

  const { data: logs, error: logError } = await supabase
    .from('finance_logs')
    .select('*')
    .gte('created_at', activeCycle.start_date)

  if (logError) throw logError

  let totalDeposits = 0
  let totalAgentCommissions = 0

  ;(orders || []).forEach((order) => {
    totalDeposits += order.base_amount
    let rate = 0
    let methodName = 'Unknown'
    if (order.payment_method) {
      if (Array.isArray(order.payment_method)) {
        rate = order.payment_method[0]?.agent_commission_rate || 0
        methodName = order.payment_method[0]?.name || 'Unknown'
      } else {
        rate = (order.payment_method as any).agent_commission_rate || 0
        methodName = (order.payment_method as any).name || 'Unknown'
      }
    }
    const commission = (order.base_amount * rate) / 100
    totalAgentCommissions += commission

    depositsByMethod[methodName] =
      (depositsByMethod[methodName] || 0) + order.base_amount
    commissionsByMethod[methodName] =
      (commissionsByMethod[methodName] || 0) + commission
  })

  let totalCashouts = (cashouts || []).reduce(
    (sum, c) => sum + Number(c.amount),
    0
  )
  let totalGamePointsCost = (purchases || []).reduce(
    (sum, p) => sum + Number(p.amount),
    0
  )
  let totalExpenses = 0

  logs?.forEach((log) => {
    const amt = Number(log.amount) || 0
    if (log.type === 'cashout') totalCashouts += amt
    else if (log.type === 'point_purchase') totalGamePointsCost += amt
    else if (log.type === 'other_expense') totalExpenses += amt
    else if (log.type === 'manual_load') {
      totalDeposits += amt
      if (log.method) {
        depositsByMethod[log.method] =
          (depositsByMethod[log.method] || 0) + amt
      } else {
        depositsByMethod['Manual Load'] =
          (depositsByMethod['Manual Load'] || 0) + amt
      }
    }
  })

  const netProfit =
    totalDeposits -
    totalAgentCommissions -
    totalCashouts -
    totalGamePointsCost -
    totalExpenses

  return {
    activeCycle,
    totalDeposits,
    totalCashouts,
    totalAgentCommissions,
    totalGamePointsCost,
    totalExpenses,
    netProfit,
    depositsByMethod,
    commissionsByMethod,
  }
}

// -------------------------------------------------------------
// GAME POINT INVENTORY FUNCTIONS
// -------------------------------------------------------------

export async function fetchGamePointPurchases(): Promise<GamePointPurchase[]> {
  const { data, error } = await supabase
    .from('game_point_purchases')
    .select('*, game:games(name), profile:profiles!created_by(full_name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createGamePointPurchase(
  purchase: Partial<GamePointPurchase>
): Promise<GamePointPurchase> {
  const { data, error } = await supabase
    .from('game_point_purchases')
    .insert(purchase)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchGamePointBalances(): Promise<GamePointBalance[]> {
  // 1. Fetch all games
  const { data: games, error: gamesErr } = await supabase
    .from('games')
    .select('id, name, logo_url')
    .order('name')
  if (gamesErr) throw gamesErr
  if (!games || games.length === 0) return []

  // 2. Fetch point additions/deductions, completed orders, and approved cashouts
  const [purchasesRes, ordersRes, cashoutsRes] = await Promise.all([
    supabase.from('game_point_purchases').select('game_id, amount'),
    supabase
      .from('orders')
      .select('game_id, final_game_credit, is_free_play')
      .eq('status', 'completed'),
    supabase
      .from('cashout_requests')
      .select('game_name, amount')
      .eq('status', 'approved'),
  ])

  // Aggregate purchased points per game
  const purchasedMap: Record<string, number> = {}
  purchasesRes.data?.forEach((p) => {
    purchasedMap[p.game_id] =
      (purchasedMap[p.game_id] || 0) + Number(p.amount || 0)
  })

  // Aggregate loaded points and free play points per game
  const loadedMap: Record<string, number> = {}
  const freePlayMap: Record<string, number> = {}
  ordersRes.data?.forEach((o) => {
    const credit = Number(o.final_game_credit || 0)
    loadedMap[o.game_id] = (loadedMap[o.game_id] || 0) + credit
    if (o.is_free_play) {
      freePlayMap[o.game_id] = (freePlayMap[o.game_id] || 0) + credit
    }
  })

  // Aggregate points returned via cashouts per game
  const cashedOutMap: Record<string, number> = {}
  cashoutsRes.data?.forEach((c) => {
    const key = (c.game_name || '').trim().toLowerCase()
    cashedOutMap[key] = (cashedOutMap[key] || 0) + Number(c.amount || 0)
  })

  return games.map((g) => {
    const totalPurchased = purchasedMap[g.id] || 0
    const totalLoaded = loadedMap[g.id] || 0
    const totalFreePlay = freePlayMap[g.id] || 0
    const totalCashedOut = cashedOutMap[g.name.trim().toLowerCase()] || 0
    // Balance formula: (Added - Removed) - Loaded out + Cashed out
    const remaining = totalPurchased - totalLoaded + totalCashedOut

    return {
      game_id: g.id,
      game_name: g.name,
      logo_url: g.logo_url,
      total_purchased: totalPurchased,
      total_loaded: totalLoaded,
      total_cashed_out: totalCashedOut,
      total_free_play: totalFreePlay,
      remaining_points: remaining,
    }
  })
}

// -------------------------------------------------------------
// PAYMENT METHOD MONEY DRAWER FUNCTIONS
// -------------------------------------------------------------

export async function fetchPaymentMethodAdjustments(): Promise<
  PaymentMethodAdjustment[]
> {
  const { data, error } = await supabase
    .from('payment_method_adjustments')
    .select(
      '*, payment_method:payment_methods(name, display_name), profile:profiles!created_by(full_name)'
    )
    .order('created_at', { ascending: false })
  if (error) {
    console.warn(
      'payment_method_adjustments table not found or empty:',
      error.message
    )
    return []
  }
  return data || []
}

export async function createPaymentMethodAdjustment(adjustment: {
  payment_method_id: string
  type: 'add' | 'withdraw'
  amount: number
  notes?: string
  created_by?: string
}): Promise<any> {
  const { data, error } = await supabase
    .from('payment_method_adjustments')
    .insert(adjustment)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchPaymentMethodDrawerBalances(
  period: 'today' | 'week' | 'month' | 'all' = 'all'
): Promise<PaymentMethodDrawerBalance[]> {
  const { data: methods, error: mErr } = await supabase
    .from('payment_methods')
    .select('id, name, display_name, logo_url, type')
    .order('name')
  if (mErr) throw mErr
  if (!methods || methods.length === 0) return []

  let dateFilter: string | null = null
  const now = new Date()
  if (period === 'today') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    dateFilter = today.toISOString()
  } else if (period === 'week') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    dateFilter = weekAgo.toISOString()
  } else if (period === 'month') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    dateFilter = monthAgo.toISOString()
  }

  let adjQuery = supabase
    .from('payment_method_adjustments')
    .select('payment_method_id, type, amount')
  let ordQuery = supabase
    .from('orders')
    .select('payment_method_id, base_amount')
    .eq('status', 'completed')
  let cshQuery = supabase
    .from('cashout_requests')
    .select('payment_method_name, amount')
    .eq('status', 'approved')

  if (dateFilter) {
    adjQuery = adjQuery.gte('created_at', dateFilter)
    ordQuery = ordQuery.gte('created_at', dateFilter)
    cshQuery = cshQuery.gte('created_at', dateFilter)
  }

  const [adjRes, ordRes, cshRes] = await Promise.all([
    adjQuery,
    ordQuery,
    cshQuery,
  ])

  const addedMap: Record<string, number> = {}
  const withdrawnMap: Record<string, number> = {}
  adjRes.data?.forEach((a) => {
    const amt = Number(a.amount || 0)
    if (a.type === 'add') {
      addedMap[a.payment_method_id] = (addedMap[a.payment_method_id] || 0) + amt
    } else if (a.type === 'withdraw') {
      withdrawnMap[a.payment_method_id] =
        (withdrawnMap[a.payment_method_id] || 0) + amt
    }
  })

  const depositsMap: Record<string, number> = {}
  ordRes.data?.forEach((o) => {
    if (o.payment_method_id) {
      depositsMap[o.payment_method_id] =
        (depositsMap[o.payment_method_id] || 0) + Number(o.base_amount || 0)
    }
  })

  const cashoutsMap: Record<string, number> = {}
  cshRes.data?.forEach((c) => {
    const key = (c.payment_method_name || '').trim().toLowerCase()
    cashoutsMap[key] = (cashoutsMap[key] || 0) + Number(c.amount || 0)
  })

  return methods.map((m) => {
    const added = addedMap[m.id] || 0
    const deposits = depositsMap[m.id] || 0
    const withdrawn = withdrawnMap[m.id] || 0
    const methodKey = (m.name || m.display_name || '').trim().toLowerCase()
    const cashouts = cashoutsMap[methodKey] || 0
    const balance = added + deposits - cashouts - withdrawn

    return {
      payment_method_id: m.id,
      name: m.name,
      display_name: m.display_name,
      logo_url: m.logo_url,
      type: m.type,
      added,
      deposits,
      cashouts,
      withdrawn,
      balance,
    }
  })
}
