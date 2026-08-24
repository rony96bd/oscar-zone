import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) throw new Error('Server configuration error')

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      throw new Error('Forbidden: Admins only')
    }

    const { userId } = await req.json()
    if (!userId) throw new Error('userId is required')

    // Since some tables don't have ON DELETE CASCADE, we must manually delete related records
    
    // 1. Delete chat messages sent by user
    await supabaseAdmin.from('chat_messages').delete().eq('sender_id', userId)
    
    // 2. Delete fraud flags
    await supabaseAdmin.from('fraud_flags').delete().eq('user_id', userId)

    // 3. Referral earnings
    await supabaseAdmin.from('referral_earnings').delete().eq('user_id', userId)
    
    // 4. Also referral earnings where source_order_id is one of the user's orders
    const { data: orders } = await supabaseAdmin.from('orders').select('id').eq('user_id', userId)
    if (orders && orders.length > 0) {
      const orderIds = orders.map(o => o.id)
      await supabaseAdmin.from('referral_earnings').delete().in('source_order_id', orderIds)
    }

    // 5. Delete orders (will cascade to order_status_history, order_bonus_snapshots)
    await supabaseAdmin.from('orders').delete().eq('user_id', userId)
    
    // The rest (customer_games, chat_conversations, referrals, notifications) 
    // will cascade from the auth.users deletion (since they cascade from profiles which cascades from auth.users)
    
    // Delete the user from auth.users (cascades to profiles)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteError) throw deleteError

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
