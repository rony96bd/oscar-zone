import { supabase } from '@/lib/supabase'
import type { Promotion } from '@/types'

export async function fetchActivePromotions(): Promise<Promotion[]> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gte.${now}`)
    .order('priority', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAllPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('priority', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createPromotion(promotion: Partial<Promotion>): Promise<Promotion> {
  const { data, error } = await supabase
    .from('promotions')
    .insert(promotion)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePromotion(id: string, updates: Partial<Promotion>): Promise<Promotion> {
  const { data, error } = await supabase
    .from('promotions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase
    .from('promotions')
    .delete()
    .eq('id', id)
  if (error) {
    if (error.code === '23503') { // Foreign key constraint violation
      throw new Error('This promotion cannot be deleted because it has already been used by customers. We recommend turning off the "Active" switch instead.')
    }
    throw error
  }
}
