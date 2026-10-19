import { supabase } from '@/lib/supabase'
import type { PaymentMethod } from '@/types'
import { SCREENSHOT_BUCKET } from '@/lib/constants'

export async function fetchPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function fetchAllPaymentMethods(): Promise<PaymentMethod[]> {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data || []
}

export async function createPaymentMethod(method: Partial<PaymentMethod>): Promise<PaymentMethod> {
  const { data, error } = await supabase
    .from('payment_methods')
    .insert(method)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePaymentMethod(
  id: string,
  updates: Partial<PaymentMethod>
): Promise<PaymentMethod> {
  const { data, error } = await supabase
    .from('payment_methods')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadPaymentScreenshot(
  file: File,
  orderId: string,
  userId: string | null
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const folder = userId || 'guest'
  const path = `${folder}/${orderId}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadError) throw uploadError

  return path
}

export async function getScreenshotUrl(path: string): Promise<string> {
  const { data } = await supabase.storage
    .from(SCREENSHOT_BUCKET)
    .createSignedUrl(path, 3600)
  return data?.signedUrl || ''
}

export async function fetchPaymentMethodDeposits(paymentMethodId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      user_id,
      username,
      guest_name,
      guest_email,
      guest_phone,
      is_guest,
      base_amount,
      total_bonus_amount,
      final_game_credit,
      customer_payment_tag,
      payment_screenshot_key,
      status,
      created_at,
      admin_note,
      rejection_reason,
      game:games(id, name, slug, logo_url),
      profile:profiles!user_id(id, full_name, username, email, phone)
    `)
    .eq('payment_method_id', paymentMethodId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function fetchPaymentMethodsDepositStats(): Promise<Record<string, { count: number; totalAmount: number; completedCount: number; completedAmount: number }>> {
  const { data, error } = await supabase
    .from('orders')
    .select('payment_method_id, base_amount, status')
    .not('payment_method_id', 'is', null)

  if (error) {
    console.error('Failed to fetch deposit stats:', error)
    return {}
  }

  const stats: Record<string, { count: number; totalAmount: number; completedCount: number; completedAmount: number }> = {}
  data?.forEach((o: any) => {
    const id = o.payment_method_id
    if (!id) return
    if (!stats[id]) {
      stats[id] = { count: 0, totalAmount: 0, completedCount: 0, completedAmount: 0 }
    }
    stats[id].count++
    stats[id].totalAmount += Number(o.base_amount || 0)
    if (o.status === 'completed') {
      stats[id].completedCount++
      stats[id].completedAmount += Number(o.base_amount || 0)
    }
  })

  return stats
}

