import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function formatTime(): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/New_York'
  }).format(new Date()) + ' ET'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!TELEGRAM_BOT_TOKEN) {
      console.log('TELEGRAM_BOT_TOKEN not configured ?" skipping')
      return new Response(JSON.stringify({ skipped: true, reason: 'no_bot_token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const isTest = body.test === true
    const eventType = body.event_type || 'order' // default to order for backward compatibility

    // Fetch active destinations
    let query = adminClient.from('telegram_destinations').select('*').eq('is_active', true)
    if (body.destination_id) query = query.eq('id', body.destination_id)
    const { data: destinations } = await query

    if (!destinations?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: 'no_active_destinations' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let message: string
    if (isTest) {
      message = o. *OscarZone Telegram Connected*\n\nThis is a test notification.\nTime: 
    } else if (eventType === 'signup') {
      message = [
        dYZ *NEW USER REGISTRATION*,
        `,
        dY  Name: ,
        dY' Username: \${body.username}\`,
        dY+ Telegram: ,
        dY ? Time: ,
        `,
        _User is pending approval._
      ].join('\n')
    } else if (eventType === 'game_id_request') {
      message = [
        dY? *GAME ID REQUEST*,
        `,
        dY  Customer: ,
        dYZr Game: ,
        dY ? Time: ,
        `,
        _Please create a Game ID and assign it from the Admin Panel._
      ].join('\n')
    } else {
      // Default: order
      const {
        order_number, game_name, username, base_amount, final_credit,
        regular_bonus_pct, promo_bonus_pct, promo_name, payment_name,
        customer_name, is_guest
      } = body

      const promoPart = promo_bonus_pct > 0
        ? \ndY" *Promo ():* +%
        : ''

      message = [
        dY" *NEW LOAD ORDER*,
        `,
        dY"< Order: \${order_number}\`,
        dY  Customer: ,
        dYZr Game: ,
        dYZ_ Username: \${username}\`,
        dY' Amount: ,
        dYZ? Regular Bonus: +%,
        promoPart,
        dY' Game Credit: **,
        dY'3 Payment: ,
        dY ? Time: ,
      ].filter(Boolean).join('\n')
    }

    // Generate signed URL if there's a screenshot
    let photoUrl = null
    if (body.payment_screenshot_path) {
      const { data } = await adminClient.storage
        .from('payment-screenshots')
        .createSignedUrl(body.payment_screenshot_path, 60 * 60) // 1 hour
      if (data?.signedUrl) {
        photoUrl = data.signedUrl
      }
    }

    let sent = 0
    for (const dest of destinations) {
      try {
        let resp
        if (photoUrl && !isTest) {
          resp = await fetch(
            https://api.telegram.org/bot/sendPhoto,
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
            https://api.telegram.org/bot/sendMessage,
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
        else console.error('Telegram send error:', data)
      } catch (err) {
        console.error('Telegram send error to', dest.chat_id, err)
      }
    }

    return new Response(JSON.stringify({ sent, total: destinations.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-telegram-notification error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
