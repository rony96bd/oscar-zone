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
