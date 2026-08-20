import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')

function formatTime(): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York'
  }).format(new Date()) + ' ET'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_bot_token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const { request_number, customer_name, game_name, game_username, amount, payment_method_name, payment_detail, qr_code_path } = body

    const message = [
      '\ud83d\udcb8 *NEW CASHOUT REQUEST*',
      '',
      '\ud83c\udd94 Request: ' + request_number + '',
      '\ud83d\udc64 Customer: ' + customer_name,
      '\ud83c\udfae Game: ' + game_name,
      '\ud83d\udd79 Username: ' + game_username + '',
      '\ud83d\udcb0 Amount: ' + formatCurrency(amount),
      '\ud83d\udcb3 Method: ' + payment_method_name,
      '\ud83d\udccc Send To: ' + payment_detail,
      '\ud83d\udd50 Time: ' + formatTime(),
    ].join('\n')

    let photoUrl = null
    if (qr_code_path) {
      const { data } = await adminClient.storage
        .from('payment-screenshots')
        .createSignedUrl(qr_code_path, 60 * 60)
      if (data?.signedUrl) {
        photoUrl = data.signedUrl
      }
    }

    const { data: destinations } = await adminClient
      .from('telegram_destinations')
      .select('*')
      .eq('is_active', true)

    if (!destinations?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_active_destinations' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    for (const dest of destinations) {
      try {
        let resp
        if (photoUrl) {
          resp = await fetch(
            'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendPhoto',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: dest.chat_id,
                photo: photoUrl,
                caption: message,
                parse_mode: 'Markdown',
              }),
            }
          )
        } else {
          resp = await fetch(
            'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: dest.chat_id,
                text: message,
                parse_mode: 'Markdown',
              }),
            }
          )
        }
        
        const data = await resp.json()
        if (data.ok) sent++
        else console.error('Telegram error:', data)
      } catch (err) {
        console.error('Telegram error to', dest.chat_id, err)
      }
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})