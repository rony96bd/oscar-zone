import { supabase } from '@/lib/supabase'

/**
 * Upload a payment screenshot to Cloudflare R2 via Edge Function.
 * Returns the R2 object key to store in the order.
 */
export async function uploadPaymentScreenshot(
  file: File,
  tempOrderId: string
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('temp_order_id', tempOrderId)

  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  const resp = await fetch(
    `${supabaseUrl}/functions/v1/r2-upload-screenshot`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'apikey': anonKey,
      },
      body: formData,
    }
  )

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || 'Failed to upload screenshot')
  }

  const data = await resp.json()
  return data.key as string
}

/**
 * Get a temporary signed URL to view a payment screenshot.
 * Only works if the authenticated user owns the order, or is an admin.
 */
export async function getScreenshotSignedUrl(orderId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('r2-get-signed-url', {
      body: { order_id: orderId },
    })
    if (error || data?.error) return null
    return data.url as string
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
