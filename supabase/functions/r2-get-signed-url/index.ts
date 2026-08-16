import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const R2_ACCOUNT_ID = Deno.env.get('R2_ACCOUNT_ID')!
const R2_ACCESS_KEY_ID = Deno.env.get('R2_ACCESS_KEY_ID')!
const R2_SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY')!
const R2_BUCKET_NAME = Deno.env.get('R2_BUCKET_NAME') ?? 'oscar-zone-screenshots'
const R2_ENDPOINT = Deno.env.get('R2_ENDPOINT') ?? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`

const SIGNED_URL_EXPIRY_SECONDS = 3600 // 1 hour

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  return toHex(hash)
}

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key instanceof ArrayBuffer ? key : key.buffer,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data))
}

// Generate pre-signed GET URL for R2 object
async function generatePresignedUrl(key: string): Promise<string> {
  const now = new Date()
  const dateStr = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateOnly = dateStr.slice(0, 8)
  const region = 'auto'
  const service = 's3'
  const encodedKey = key.split('/').map(encodeURIComponent).join('/')

  const credentialScope = `${dateOnly}/${region}/${service}/aws4_request`
  const credential = `${R2_ACCESS_KEY_ID}/${credentialScope}`

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': credential,
    'X-Amz-Date': dateStr,
    'X-Amz-Expires': String(SIGNED_URL_EXPIRY_SECONDS),
    'X-Amz-SignedHeaders': 'host',
  })

  const host = new URL(R2_ENDPOINT).host
  const canonicalHeaders = `host:${host}\n`
  const canonicalRequest = [
    'GET',
    `/${encodedKey}`,
    queryParams.toString(),
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    dateStr,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  const signingKey = await hmacSha256(
    await hmacSha256(
      await hmacSha256(
        await hmacSha256(
          new TextEncoder().encode(`AWS4${R2_SECRET_ACCESS_KEY}`),
          dateOnly
        ),
        region
      ),
      service
    ),
    'aws4_request'
  )

  const signature = toHex(await hmacSha256(signingKey, stringToSign))
  queryParams.set('X-Amz-Signature', signature)

  return `${R2_ENDPOINT}/${R2_BUCKET_NAME}/${encodedKey}?${queryParams.toString()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization')

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get calling user
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await anonClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { order_id } = await req.json()
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch order using service role
    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, user_id, payment_screenshot_key, screenshot_deleted_at')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if screenshot was deleted
    if (order.screenshot_deleted_at || !order.payment_screenshot_key) {
      return new Response(JSON.stringify({ error: 'Screenshot no longer available', deleted: true }), {
        status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Authorization: customer can only see their own orders, admins can see all
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'support_agent'
    const isOwner = order.user_id === user.id

    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate pre-signed URL
    const signedUrl = await generatePresignedUrl(order.payment_screenshot_key)

    return new Response(JSON.stringify({ url: signedUrl, expires_in: SIGNED_URL_EXPIRY_SECONDS }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('r2-get-signed-url error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
