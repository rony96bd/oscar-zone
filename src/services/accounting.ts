import { supabase } from '@/lib/supabase'
import type { AccountingCycle, GamePointPurchase } from '@/types'

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
  netProfit: number
  closedBy: string
}

export async function closeAccountingCycle(cycleId: string, data: CloseCycleData): Promise<void> {
  const { error: closeError } = await supabase
    .from('accounting_cycles')
    .update({
      end_date: data.endDate,
      total_deposits: data.totalDeposits,
      total_cashouts: data.totalCashouts,
      total_agent_commissions: data.totalAgentCommissions,
      total_game_points_cost: data.totalGamePointsCost,
      net_profit: data.netProfit,
      status: 'closed',
      closed_by: data.closedBy
    })
    .eq('id', cycleId)
    
  if (closeError) throw closeError

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
  totalGamePointsCost: number
  netProfit: number
  depositsByMethod: Record<string, number>
  commissionsByMethod: Record<string, number>
}

export async function fetchActiveAccountingStats(): Promise<AccountingStats> {
  const activeCycle = await fetchActiveCycle();

  const { data: allMethods, error: methodsError } = await supabase
    .from('payment_methods')
    .select('name')
    .eq('is_active', true);
    
  if (methodsError) throw methodsError;

  const depositsByMethod: Record<string, number> = {};
  const commissionsByMethod: Record<string, number> = {};
  
  (allMethods || []).forEach(m => {
    depositsByMethod[m.name] = 0;
    commissionsByMethod[m.name] = 0;
  });

  if (!activeCycle) {
    return {
      activeCycle: null,
      totalDeposits: 0,
      totalCashouts: 0,
      totalAgentCommissions: 0,
      totalGamePointsCost: 0,
      netProfit: 0,
      depositsByMethod,
      commissionsByMethod
    }
  }

  const { data: orders, error: orderError } = await supabase
    .from('orders')
    .select('base_amount, payment_method:payment_methods(name, agent_commission_rate)')
    .eq('status', 'completed')
    .gte('updated_at', activeCycle.start_date);
    
  if (orderError) throw orderError;

  const { data: cashouts, error: cashoutError } = await supabase
    .from('cashout_requests')
    .select('amount')
    .eq('status', 'approved')
    .gte('updated_at', activeCycle.start_date);

  if (cashoutError) throw cashoutError;

  const { data: purchases, error: purchaseError } = await supabase
    .from('game_point_purchases')
    .select('amount')
    .gte('created_at', activeCycle.start_date);

  if (purchaseError) throw purchaseError;

  const { data: logs, error: logError } = await supabase
    .from('finance_logs')
    .select('*')
    .gte('created_at', activeCycle.start_date);

  if (logError) throw logError;

  let totalDeposits = 0;
  let totalAgentCommissions = 0;
  
  (orders || []).forEach(order => {
    totalDeposits += order.base_amount;
    let rate = 0;
    let methodName = 'Unknown';
    if (order.payment_method) {
      if (Array.isArray(order.payment_method)) {
        rate = order.payment_method[0]?.agent_commission_rate || 0;
        methodName = order.payment_method[0]?.name || 'Unknown';
      } else {
        rate = (order.payment_method as any).agent_commission_rate || 0;
        methodName = (order.payment_method as any).name || 'Unknown';
      }
    }
    const commission = (order.base_amount * rate) / 100;
    totalAgentCommissions += commission;
    
    depositsByMethod[methodName] = (depositsByMethod[methodName] || 0) + order.base_amount;
    commissionsByMethod[methodName] = (commissionsByMethod[methodName] || 0) + commission;
  });

  let totalCashouts = (cashouts || []).reduce((sum, c) => sum + Number(c.amount), 0);
  let totalGamePointsCost = (purchases || []).reduce((sum, p) => sum + Number(p.amount), 0);
  let totalExpenses = 0;

  logs?.forEach(log => {
    const amt = Number(log.amount) || 0
    if (log.type === 'cashout') totalCashouts += amt
    else if (log.type === 'point_purchase') totalGamePointsCost += amt
    else if (log.type === 'other_expense') totalExpenses += amt
  });
  
  const netProfit = totalDeposits - totalAgentCommissions - totalCashouts - totalGamePointsCost - totalExpenses;

  return {
    activeCycle,
    totalDeposits,
    totalCashouts,
    totalAgentCommissions,
    totalGamePointsCost,
    netProfit,
    depositsByMethod,
    commissionsByMethod
  }
}

export async function fetchGamePointPurchases(): Promise<GamePointPurchase[]> {
  const { data, error } = await supabase
    .from('game_point_purchases')
    .select('*, game:games(name), profile:profiles!created_by(full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createGamePointPurchase(purchase: Partial<GamePointPurchase>): Promise<GamePointPurchase> {
  const { data, error } = await supabase
    .from('game_point_purchases')
    .insert(purchase)
    .select()
    .single();
  if (error) throw error;
  return data;
}
