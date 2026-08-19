import { supabase } from '@/lib/supabase'

export async function fetchFinanceReport(dateFrom: string, dateTo: string) {
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('base_amount, payment_methods(name)')
    .eq('status', 'completed')
    .gte('created_at', dateFrom + 'T00:00:00.000Z')
    .lte('created_at', dateTo + 'T23:59:59.999Z')

  if (orderError) throw orderError

  const { data: logs, error: logError } = await supabase
    .from('finance_logs')
    .select('*')
    .gte('log_date', dateFrom)
    .lte('log_date', dateTo)
    .order('created_at', { ascending: false })

  if (logError) throw logError

  const loadsByMethod: Record<string, number> = {}
  let totalLoads = 0

  orders?.forEach(o => {
    const amount = Number(o.base_amount) || 0
    const method = (o.payment_methods as any)?.name || 'Unknown'
    loadsByMethod[method] = (loadsByMethod[method] || 0) + amount
    totalLoads += amount
  })

  let totalCashouts = 0
  let totalPurchases = 0
  let totalExpenses = 0

  logs?.forEach(log => {
    const amt = Number(log.amount) || 0
    if (log.type === 'cashout') totalCashouts += amt
    else if (log.type === 'point_purchase') totalPurchases += amt
    else if (log.type === 'other_expense') totalExpenses += amt
  })

  const netProfit = totalLoads - totalCashouts - totalPurchases - totalExpenses

  return {
    loadsByMethod,
    totalLoads,
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
