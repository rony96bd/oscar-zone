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

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// HMAC-SHA256 helper using Web Crypto
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

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(data: string | ArrayBuffer): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  const hash = await crypto.subtle.digest('SHA-256', buffer)
  return toHex(hash)
}

// AWS Signature V4 for R2 (S3-compatible)
async function signedR2Request(
  method: string,
  path: string,
  body: Uint8Array,
  contentType: string
): Promise<Response> {
  const now = new Date()
  const dateStr = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateOnly = dateStr.slice(0, 8)
  const region = 'auto'
  const service = 's3'

  const payloadHash = await sha256Hex(body)
  const host = new URL(R2_ENDPOINT).host

  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${dateStr}`,
  ].join('\n') + '\n'

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    method,
    path,
    '', // query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const credentialScope = `${dateOnly}/${region}/${service}/aws4_request`
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
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  return fetch(`${R2_ENDPOINT}/${R2_BUCKET_NAME}${path}`, {
    method,
    headers: {
      'Authorization': authorization,
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': dateStr,
    },
    body,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate user (optional for guests)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')

    let userId: string | null = null
    if (authHeader) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id ?? null
    }

    // Parse multipart form
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const tempOrderId = formData.get('temp_order_id') as string | null

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Allowed: JPG, PNG, WEBP' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Max 10MB.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build R2 key
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const folder = userId ? `users/${userId}` : 'guests'
    const r2Key = `payment-screenshots/${yyyy}/${mm}/${dd}/${folder}/${tempOrderId ?? crypto.randomUUID()}/payment.${ext}`

    // Upload to R2
    const buffer = await file.arrayBuffer()
    const body = new Uint8Array(buffer)
    const uploadResp = await signedR2Request('PUT', `/${r2Key}`, body, file.type)

    if (!uploadResp.ok) {
      const errText = await uploadResp.text()
      console.error('R2 upload error:', uploadResp.status, errText)
      return new Response(JSON.stringify({ error: 'Upload to storage failed', detail: errText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ key: r2Key, size: file.size, type: file.type }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('r2-upload-screenshot error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
