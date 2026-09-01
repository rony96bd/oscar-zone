import { supabase } from '@/lib/supabase'

export async function fetchFinanceReport(dateFrom: string, dateTo: string) {
  // Use local browser timezone to calculate correct UTC bounds
  const fromISO = new Date(`${dateFrom}T00:00:00`).toISOString()
  const toISO   = new Date(`${dateTo}T23:59:59.999`).toISOString()

  // 1. Completed orders in date range
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('base_amount, payment_method:payment_methods(name, agent_commission_rate)')
    .eq('status', 'completed')
    .gte('updated_at', fromISO)
    .lte('updated_at', toISO)

  if (orderError) throw orderError

  // 2. Completed/Approved cashouts in date range
  const { data: cashouts, error: cashoutError } = await supabase
    .from('cashout_requests')
    .select('amount')
    .in('status', ['completed', 'approved'])
    .gte('updated_at', fromISO)
    .lte('updated_at', toISO)

  if (cashoutError) throw cashoutError

  // 3. Game point purchases in date range
  const { data: purchases, error: purchaseError } = await supabase
    .from('game_point_purchases')
    .select('amount')
    .gte('created_at', fromISO)
    .lte('created_at', toISO)

  if (purchaseError) throw purchaseError

  // 4. Manual finance logs in date range (for any other expenses)
  const { data: logs, error: logError } = await supabase
    .from('finance_logs')
    .select('*')
    .gte('log_date', dateFrom)
    .lte('log_date', dateTo)
    .order('created_at', { ascending: false })

  if (logError) throw logError

  // ---- Calculate Loads & Agent Commissions ----
  const loadsByMethod: Record<string, number> = {}
  const commissionsByMethod: Record<string, number> = {}
  let totalLoads = 0
  let totalAgentCommissions = 0

  orders?.forEach(o => {
    const amount = Number(o.base_amount) || 0
    const pm = Array.isArray(o.payment_method) ? o.payment_method[0] : o.payment_method as any
    const methodName = pm?.name || 'Unknown'
    const rate = pm?.agent_commission_rate || 0
    const commission = (amount * rate) / 100

    totalLoads += amount
    totalAgentCommissions += commission

    loadsByMethod[methodName] = (loadsByMethod[methodName] || 0) + amount
    commissionsByMethod[methodName] = (commissionsByMethod[methodName] || 0) + commission
  })

  // ---- Cashouts (real data) ----
  let totalCashouts = (cashouts || []).reduce((sum, c) => sum + Number(c.amount), 0)

  // ---- Point Purchases (real data) ----
  let totalPurchases = (purchases || []).reduce((sum, p) => sum + Number(p.amount), 0)

  // ---- Manual logs from finance_logs ----
  let totalExpenses = 0
  logs?.forEach(log => {
    const amt = Number(log.amount) || 0
    if (log.type === 'cashout') totalCashouts += amt
    else if (log.type === 'point_purchase') totalPurchases += amt
    else if (log.type === 'other_expense') totalExpenses += amt
  })

  const netProfit = totalLoads - totalAgentCommissions - totalCashouts - totalPurchases - totalExpenses

  return {
    loadsByMethod,
    commissionsByMethod,
    totalLoads,
    totalAgentCommissions,
    totalCashouts,
    totalPurchases,
    totalExpenses,
    netProfit,
    logs: logs || []
  }
}

export async function addFinanceLog(payload: {
  type: 'cashout' | 'point_purchase' | 'other_expense'
  amount: number
  method?: string
  note?: string
  log_date: string
  created_by: string
}) {
  const { data, error } = await supabase
    .from('finance_logs')
    .insert(payload)
    .select()
    .single()
    
  if (error) throw error
  return data
}

export async function deleteFinanceLog(id: string) {
  const { error } = await supabase.from('finance_logs').delete().eq('id', id)
  if (error) throw error
}
