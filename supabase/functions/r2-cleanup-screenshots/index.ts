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

// Default retention in days
const DEFAULT_RETENTION: Record<string, number> = {
  completed: 60,
  rejected: 30,
  cancelled: 30,
  refunded: 30,
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hash = await crypto.subtle.digest('SHA-256', buf)
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

async function deleteR2Object(key: string): Promise<{ ok: boolean; status: number }> {
  const now = new Date()
  const dateStr = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z'
  const dateOnly = dateStr.slice(0, 8)
  const region = 'auto'
  const service = 's3'
  const encodedPath = `/${key.split('/').map(encodeURIComponent).join('/')}`

  const host = new URL(R2_ENDPOINT).host
  const payloadHash = await sha256Hex('')
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${dateStr}\n`
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = ['DELETE', encodedPath, '', canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const credentialScope = `${dateOnly}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', dateStr, credentialScope, await sha256Hex(canonicalRequest)].join('\n')

  const signingKey = await hmacSha256(
    await hmacSha256(
      await hmacSha256(
        await hmacSha256(new TextEncoder().encode(`AWS4${R2_SECRET_ACCESS_KEY}`), dateOnly),
        region
      ),
      service
    ),
    'aws4_request'
  )

  const signature = toHex(await hmacSha256(signingKey, stringToSign))
  const authorization = `AWS4-HMAC-SHA256 Credential=${R2_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const resp = await fetch(`${R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`, {
    method: 'DELETE',
    headers: {
      Authorization: authorization,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': dateStr,
    },
  })

  return { ok: resp.ok || resp.status === 204, status: resp.status }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey)

    // Optional: enforce that only service-level callers can trigger this
    // In production, call this from a pg_cron job with service role

    const now = new Date()
    let totalDeleted = 0
    const errors: string[] = []

    for (const [status, retentionDays] of Object.entries(DEFAULT_RETENTION)) {
      const cutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)

      const { data: orders, error } = await adminClient
        .from('orders')
        .select('id, payment_screenshot_key, order_number')
        .eq('status', status)
        .not('payment_screenshot_key', 'is', null)
        .is('screenshot_deleted_at', null)
        .lt('updated_at', cutoff.toISOString())

      if (error) {
        errors.push(`Query error for status=${status}: ${error.message}`)
        continue
      }

      for (const order of (orders ?? [])) {
        if (!order.payment_screenshot_key) continue

        const result = await deleteR2Object(order.payment_screenshot_key)

        if (result.ok) {
          // Clear key in DB and record deletion
          await adminClient
            .from('orders')
            .update({
              payment_screenshot_key: null,
              screenshot_deleted_at: now.toISOString(),
            })
            .eq('id', order.id)

          // Write audit log
          await adminClient.from('audit_logs').insert({
            action: 'screenshot_deleted',
            target_type: 'order',
            target_id: order.id,
            details: {
              order_number: order.order_number,
              reason: `retention_policy_${status}_${retentionDays}d`,
              key: order.payment_screenshot_key,
            },
          })

          totalDeleted++
        } else {
          errors.push(`Failed to delete R2 object for order ${order.id}: HTTP ${result.status}`)
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      deleted: totalDeleted,
      errors,
      ran_at: now.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('r2-cleanup error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
