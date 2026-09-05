import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import MD5 from "https://esm.sh/crypto-js/md5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Ensure it's a POST request
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  // Initialize Supabase Client using environment variables provided by Supabase
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const supabase = createClient(supabaseUrl, supabaseKey)

  let newRecord: any;

  try {
    const payload = await req.json()

    // 1. Validate Webhook Payload
    if (payload.type !== 'UPDATE') {
      return new Response('Not an update event', { status: 200, headers: corsHeaders })
    }

    newRecord = payload.record
    const oldRecord = payload.old_record

    // Only proceed if the status JUST changed to 'payment_verified'
    if (newRecord.status !== 'payment_verified' || oldRecord.status === 'payment_verified') {
      return new Response('Status is not newly verified', { status: 200, headers: corsHeaders })
    }

    // 2. Verify if the game is Juwa
    const { data: game } = await supabase
      .from('games')
      .select('name')
      .eq('id', newRecord.game_id)
      .single()

    if (!game || !game.name.toLowerCase().includes('juwa')) {
      return new Response('Not a Juwa order', { status: 200, headers: corsHeaders })
    }

    // 3. Setup Juwa API Credentials from Secrets
    const JUWA_AGENT_ID = Deno.env.get('JUWA_AGENT_ID') ?? '121116'
    const JUWA_SECRET_KEY = Deno.env.get('JUWA_SECRET_KEY') ?? 'f30185b66c25140f7a16cc0ed7657a6a'
    const JUWA_BASE_URL = 'https://external.juwa777.com'

    const timestamp = Math.floor(Date.now() / 1000).toString()
    const rawString = `${JUWA_AGENT_ID}:${timestamp}:${JUWA_SECRET_KEY}`
    const token = MD5(rawString).toString()

    const username = newRecord.username
    const amount = newRecord.final_game_credit
    const orderNumber = newRecord.order_number

    console.log(`[Juwa Loader] Processing Order: ${orderNumber} for ${username} (${amount})`)

    // 4. Get Player ID from Juwa API
    const userForm = new FormData()
    userForm.append('agent_id', JUWA_AGENT_ID)
    userForm.append('timestamp', timestamp)
    userForm.append('token', token)
    userForm.append('account_name', username)

    const userRes = await fetch(`${JUWA_BASE_URL}/api/external/getUserID`, {
      method: 'POST',
      body: userForm,
    })
    
    if (!userRes.ok) {
        throw new Error(`Juwa API Network Error (getUserID): ${userRes.statusText}`)
    }
    
    const userData = await userRes.json()

    if (userData.code !== 0) {
      throw new Error(`Player ID error: ${userData.msg}`)
    }
    const playerId = userData.data.user_id

    // 5. Recharge Account via Juwa API
    const rechargeForm = new FormData()
    rechargeForm.append('agent_id', JUWA_AGENT_ID)
    rechargeForm.append('timestamp', timestamp)
    rechargeForm.append('token', token)
    rechargeForm.append('user_id', playerId)
    rechargeForm.append('amount', amount.toString())
    rechargeForm.append('order_id', orderNumber)

    const rechargeRes = await fetch(`${JUWA_BASE_URL}/api/external/recharge`, {
      method: 'POST',
      body: rechargeForm,
    })
    
    if (!rechargeRes.ok) {
        throw new Error(`Juwa API Network Error (recharge): ${rechargeRes.statusText}`)
    }
    
    const rechargeData = await rechargeRes.json()

    if (rechargeData.code !== 0) {
      throw new Error(`Recharge error: ${rechargeData.msg}`)
    }

    console.log(`[Juwa Loader] Successfully loaded ${amount} to ${username}`)

    // 6. Update Order in Supabase to 'completed'
    await supabase
      .from('orders')
      .update({
        status: 'completed',
        admin_note: 'Automated load successful via Juwa API'
      })
      .eq('id', newRecord.id)

    return new Response(
      JSON.stringify({ success: true, message: 'Juwa loaded successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Juwa Auto-Loader Error:', error.message)

    // If we have the record, try to leave a note in the database about the failure
    if (newRecord && newRecord.id) {
        await supabase
          .from('orders')
          .update({
            admin_note: `Bot Error: ${error.message}`
          })
          .eq('id', newRecord.id)
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
