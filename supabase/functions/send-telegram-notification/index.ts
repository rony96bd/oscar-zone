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
      console.log('TELEGRAM_BOT_TOKEN not configured — skipping')
      return new Response(JSON.stringify({ skipped: true, reason: 'no_bot_token' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(supabaseUrl, serviceKey)

    const body = await req.json()
    const isTest = body.test === true

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
      message = `✅ *OscarZone Telegram Connected*\n\nThis is a test notification.\nTime: ${formatTime()}`
    } else {
      const {
        order_number, game_name, username, base_amount, final_credit,
        regular_bonus_pct, promo_bonus_pct, promo_name, payment_name,
        customer_name, is_guest,
      } = body

      const promoPart = promo_bonus_pct > 0
        ? `\n📣 *Promo (${promo_name || 'Active Promo'}):* +${promo_bonus_pct}%`
        : ''

      message = [
        `🔥 *NEW LOAD ORDER*`,
        ``,
        `📋 Order: \`${order_number}\``,
        `👤 Customer: ${customer_name}${is_guest ? ' _(guest)_' : ''}`,
        `🎮 Game: ${game_name}`,
        `🎯 Username: \`${username}\``,
        `💵 Amount: ${formatCurrency(base_amount)}`,
        `🎁 Regular Bonus: +${regular_bonus_pct}%`,
        promoPart,
        `💰 Game Credit: *${formatCurrency(final_credit)}*`,
        `💳 Payment: ${payment_name}`,
        `🕐 Time: ${formatTime()}`,
      ].filter(Boolean).join('\n')
    }

    let sent = 0
    for (const dest of destinations) {
      try {
        const resp = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
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
