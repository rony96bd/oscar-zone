import { supabase } from "@/lib/supabase"

export interface CashoutRule {
  id: string
  deposit_min: number
  deposit_max: number
  min_type: "fixed" | "multiplier"
  min_fixed: number | null
  min_multiplier: number | null
  max_multiplier: number
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function fetchActiveCashoutRules(): Promise<CashoutRule[]> {
  const { data, error } = await supabase
    .from("cashout_rules")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchAllCashoutRules(): Promise<CashoutRule[]> {
  const { data, error } = await supabase
    .from("cashout_rules")
    .select("*")
    .order("sort_order", { ascending: true })
  if (error) throw error
  return data || []
}

export async function createCashoutRule(payload: Omit<CashoutRule, "id" | "created_at" | "updated_at">): Promise<CashoutRule> {
  const { data, error } = await supabase
    .from("cashout_rules")
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCashoutRule(id: string, payload: Partial<Omit<CashoutRule, "id" | "created_at" | "updated_at">>): Promise<CashoutRule> {
  const { data, error } = await supabase
    .from("cashout_rules")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCashoutRule(id: string): Promise<void> {
  const { error } = await supabase.from("cashout_rules").delete().eq("id", id)
  if (error) throw error
}

/**
 * Fetch cashout terms from system_settings
 */
export async function fetchCashoutTerms(): Promise<string> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "cashout_terms")
    .single()
  return data?.value || ""
}

export async function saveCashoutTerms(terms: string): Promise<void> {
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key: "cashout_terms", value: terms }, { onConflict: "key" })
  if (error) throw error
}

/**
 * Given the customer''s total deposits, return their applicable cashout rule.
 * Returns null if no rule matches.
 */
export function findApplicableRule(totalDeposit: number, rules: CashoutRule[]): CashoutRule | null {
  return rules.find(r => totalDeposit >= r.deposit_min && totalDeposit <= r.deposit_max) ?? null
}

/**
 * Calculate min and max cashout amounts from a rule + actual deposit
 */
export function calculateCashoutLimits(rule: CashoutRule, totalDeposit: number): { min: number; max: number } {
  const min = rule.min_type === "fixed"
    ? (rule.min_fixed ?? 0)
    : totalDeposit * (rule.min_multiplier ?? 1)

  const max = totalDeposit * rule.max_multiplier

  return { min: Math.ceil(min * 100) / 100, max: Math.ceil(max * 100) / 100 }
}
