import { supabase } from '@/lib/supabase'
import type { AccountingCycle } from '@/types'

export async function fetchActiveCycle(): Promise<AccountingCycle | null> {
  const { data, error } = await supabase
    .from('accounting_cycles')
    .select('*')
    .eq('status', 'active')
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // No active cycle found
    throw error
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
  netProfit: number
  closedBy: string
}

export async function closeAccountingCycle(cycleId: string, data: CloseCycleData): Promise<void> {
  // 1. Close current cycle
  const { error: closeError } = await supabase
    .from('accounting_cycles')
    .update({
      end_date: data.endDate,
      total_deposits: data.totalDeposits,
      total_cashouts: data.totalCashouts,
      total_agent_commissions: data.totalAgentCommissions,
      net_profit: data.netProfit,
      status: 'closed',
      closed_by: data.closedBy
    })
    .eq('id', cycleId)
    
  if (closeError) throw closeError

  // 2. Start a new cycle exactly from the end_date of the closed one
  const { error: newCycleError } = await supabase
    .from('accounting_cycles')
    .insert({
      start_date: data.endDate,
      status: 'active'
    })
    
  if (newCycleError) throw newCycleError
}

export interface AccountingStats {
  activeCycle: AccountingCycle | null
  totalDeposits: number
  totalCashouts: number
  totalAgentCommissions: number
  netProfit: number
  depositsByMethod: Record<string, number>
  commissionsByMethod: Record<string, number>
}

export async function fetchActiveAccountingStats(): Promise<AccountingStats> {
  const activeCycle = await fetchActiveCycle();
  if (!activeCycle) {
    return {
      activeCycle: null,
      totalDeposits: 0,
      totalCashouts: 0,
      totalAgentCommissions: 0,
      netProfit: 0,
      depositsByMethod: {},
      commissionsByMethod: {}
    }
  }

  // Fetch all completed orders in this cycle
  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('base_amount, payment_methods(name, agent_commission_rate)')
    .eq('status', 'completed')
    .gte('created_at', activeCycle.start_date);
    
  if (orderError) throw orderError;

  // Fetch all approved cashouts in this cycle
  const { data: cashouts, error: cashoutError } = await supabase
    .from('cashout_requests')
    .select('amount')
    .eq('status', 'approved')
    .gte('created_at', activeCycle.start_date);

  if (cashoutError) throw cashoutError;

  let totalDeposits = 0;
  let totalAgentCommissions = 0;
  const depositsByMethod: Record<string, number> = {};
  const commissionsByMethod: Record<string, number> = {};
  
  (orders || []).forEach(order => {
    totalDeposits += order.base_amount;
    let rate = 0;
    let methodName = 'Unknown';
    if (order.payment_methods) {
      if (Array.isArray(order.payment_methods)) {
        rate = order.payment_methods[0]?.agent_commission_rate || 0;
        methodName = order.payment_methods[0]?.name || 'Unknown';
      } else {
        rate = (order.payment_methods as any).agent_commission_rate || 0;
        methodName = (order.payment_methods as any).name || 'Unknown';
      }
    }
    const commission = (order.base_amount * rate) / 100;
    totalAgentCommissions += commission;
    
    depositsByMethod[methodName] = (depositsByMethod[methodName] || 0) + order.base_amount;
    commissionsByMethod[methodName] = (commissionsByMethod[methodName] || 0) + commission;
  });

  const totalCashouts = (cashouts || []).reduce((sum, c) => sum + c.amount, 0);
  const netProfit = totalDeposits - totalAgentCommissions - totalCashouts;

  return {
    activeCycle,
    totalDeposits,
    totalCashouts,
    totalAgentCommissions,
    netProfit,
    depositsByMethod,
    commissionsByMethod
  }
}
