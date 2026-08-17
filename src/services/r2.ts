import { supabase } from '@/lib/supabase'

/**
 * Upload a payment screenshot directly to Supabase Storage.
 * Bypasses R2 Edge Function for simpler local/cloud setups.
 */
export async function uploadPaymentScreenshot(
  file: File,
  tempOrderId: string
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  const folder = user?.id || 'guest'
  
  const ext = file.name.split('.').pop() || 'png'
  const path = `${folder}/${tempOrderId}-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('payment-screenshots')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    })

  if (error) {
    throw new Error(error.message)
  }

  return path
}

/**
 * Get a temporary signed URL to view a payment screenshot.
 */
export async function getScreenshotSignedUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from('payment-screenshots')
      .createSignedUrl(path, 60 * 60) // 1 hour expiry
    
    if (error) return null
    return data.signedUrl
  } catch {
    return null
  }
}

/**
 * Validate a file before upload.
 */
export function validateScreenshotFile(file: File): { valid: boolean; error?: string } {
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const MAX_SIZE_MB = 10

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, or WEBP.' }
  }

  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `File too large. Maximum size is ${MAX_SIZE_MB}MB.` }
  }

  return { valid: true }
}
