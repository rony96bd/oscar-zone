import { supabase } from '@/lib/supabase'

export interface TransactionLog {
  id: string
  date: string
  type: 'Order' | 'Cashout' | 'Game Points' | 'Manual Log'
  subType?: string
  amount: number
  method?: string
  note?: string
  customer?: string
  staff?: string
  rawType: string // to know if we can delete it (only manual logs can be deleted)
}

export async function fetchFinanceReport(dateFrom: string, dateTo: string) {
  // Use local browser timezone to calculate correct UTC bounds
  const fromISO = new Date(`${dateFrom}T00:00:00`).toISOString()
  const toISO   = new Date(`${dateTo}T23:59:59.999`).toISOString()

  // 1. Completed orders in date range
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('id, base_amount, updated_at, payment_method:payment_methods(name, agent_commission_rate), profile:profiles!orders_user_id_fkey(full_name), staff:profiles!orders_processed_by_fkey(full_name), game:games(name)')
    .eq('status', 'completed')
    .gte('updated_at', fromISO)
    .lte('updated_at', toISO)

  if (orderError) throw orderError

  // 2. Completed/Approved cashouts in date range
  const { data: cashouts, error: cashoutError } = await supabase
    .from('cashout_requests')
    .select('id, amount, updated_at, payment_method_name, profile:profiles!cashout_requests_user_id_fkey(full_name), staff:profiles!cashout_requests_processed_by_fkey(full_name)')
    .in('status', ['completed', 'approved'])
    .gte('updated_at', fromISO)
    .lte('updated_at', toISO)

  if (cashoutError) throw cashoutError

  // 3. Game point purchases in date range
  const { data: purchases, error: purchaseError } = await supabase
    .from('game_point_purchases')
    .select('id, amount, created_at, game:games(name), profile:profiles(full_name)')
    .gte('created_at', fromISO)
    .lte('created_at', toISO)

  if (purchaseError) throw purchaseError

  // 4. Manual finance logs in date range (for any other expenses)
  const { data: logs, error: logError } = await supabase
    .from('finance_logs')
    .select('id, amount, type, method, note, log_date, created_at, profile:profiles(full_name)')
    .gte('log_date', dateFrom)
    .lte('log_date', dateTo)

  if (logError) throw logError

  const allTransactions: TransactionLog[] = []

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
    
    const prof = Array.isArray(o.profile) ? o.profile[0] : o.profile as any
    const staffObj = Array.isArray(o.staff) ? o.staff[0] : o.staff as any
    const g = Array.isArray(o.game) ? o.game[0] : o.game as any

    allTransactions.push({
      id: o.id,
      date: o.updated_at,
      type: 'Order',
      subType: 'Deposit/Load',
      amount: amount,
      method: methodName,
      note: `Game: ${g?.name || 'Unknown'}`,
      customer: prof?.full_name || 'Unknown',
      staff: staffObj?.full_name,
      rawType: 'order'
    })
  })

  // ---- Cashouts (real data) ----
  let totalCashouts = 0
  cashouts?.forEach(c => {
    const amount = Number(c.amount) || 0
    totalCashouts += amount
    const pmName = c.payment_method_name || 'Unknown'
    const prof = Array.isArray(c.profile) ? c.profile[0] : c.profile as any
    const staffObj = Array.isArray(c.staff) ? c.staff[0] : c.staff as any

    allTransactions.push({
      id: c.id,
      date: c.updated_at,
      type: 'Cashout',
      amount: amount,
      method: pmName,
      customer: prof?.full_name || 'Unknown',
      staff: staffObj?.full_name,
      rawType: 'cashout_req'
    })
  })

  // ---- Point Purchases (real data) ----
  let totalPurchases = 0
  purchases?.forEach(p => {
    const amount = Number(p.amount) || 0
    totalPurchases += amount
    const g = Array.isArray(p.game) ? p.game[0] : p.game as any
    const prof = Array.isArray(p.profile) ? p.profile[0] : p.profile as any

    allTransactions.push({
      id: p.id,
      date: p.created_at,
      type: 'Game Points',
      amount: amount,
      note: `Game: ${g?.name || 'Unknown'}`,
      customer: '-',
      staff: prof?.full_name || 'Admin',
      rawType: 'purchase'
    })
  })

  // ---- Manual logs from finance_logs ----
  let totalExpenses = 0
  logs?.forEach(log => {
    const amount = Number(log.amount) || 0
    const prof = Array.isArray(log.profile) ? log.profile[0] : log.profile as any

    if (log.type === 'cashout') totalCashouts += amount
    else if (log.type === 'point_purchase') totalPurchases += amount
    else if (log.type === 'other_expense') totalExpenses += amount
    else if (log.type === 'manual_load') {
      totalLoads += amount
      if (log.method) {
        loadsByMethod[log.method] = (loadsByMethod[log.method] || 0) + amount
      } else {
        loadsByMethod['Manual Load'] = (loadsByMethod['Manual Load'] || 0) + amount
      }
    }

    allTransactions.push({
      id: log.id,
      date: log.created_at || log.log_date,
      type: 'Manual Log',
      subType: log.type.replace('_', ' '),
      amount: amount,
      method: log.method || '-',
      note: log.note || '-',
      customer: '-',
      staff: prof?.full_name || 'Admin',
      rawType: 'manual_log'
    })
  })

  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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
    allTransactions
  }
}

export async function addFinanceLog(payload: {
  type: 'cashout' | 'point_purchase' | 'other_expense' | 'manual_load'
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
