import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

    if (!BOT_TOKEN || !CHAT_ID) {
      throw new Error('Telegram credentials are not configured in environment variables.')
    }

    const { customerName, message, isGuest, conversationId, originUrl } = await req.json()

    if (!message) {
      throw new Error('Message is required')
    }

    const nameStr = customerName ? customerName : 'Unknown Customer'
    const guestStr = isGuest ? ' *(Guest)*' : ''
    const adminLink = originUrl 
      ? `\n\n🔗 [Reply in Admin Panel](${originUrl}/admin/chat)`
      : ''

    const text = `💬 *New Chat Message*\n👤 *Customer:* ${nameStr}${guestStr}\n✉️ *Message:* ${message}${adminLink}`

    // Call Telegram API
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      }),
    })

    const result = await response.json()

    if (!result.ok) {
      console.error('Telegram API Error:', result)
      throw new Error(`Telegram Error: ${result.description}`)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error in notify-telegram:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
