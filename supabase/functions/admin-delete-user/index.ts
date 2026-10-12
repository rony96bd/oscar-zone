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

    const isAdmin = profile && (profile.role === 'admin' || profile.role === 'super_admin')
    if (!isAdmin) {
      const { data: perm } = await supabaseAdmin
        .from('staff_permissions')
        .select('has_access')
        .eq('staff_id', user.id)
        .eq('permission_key', 'manage_customers')
        .maybeSingle()
      if (!perm?.has_access) {
        throw new Error('Forbidden: Admins only')
      }
    }

    const { userId } = await req.json()
    if (!userId) throw new Error('userId is required')

    // Clean up all related tables safely to prevent foreign key constraint violations:

    // 1. Unlink profiles where this user is referred_by
    await supabaseAdmin.from('profiles').update({ referred_by: null }).eq('referred_by', userId)

    // 2. Referrals & referral earnings
    const { data: userReferrals } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .or(`referrer_id.eq.${userId},referred_id.eq.${userId}`)

    if (userReferrals && userReferrals.length > 0) {
      const refIds = userReferrals.map((r: any) => r.id)
      await supabaseAdmin.from('referral_earnings').delete().in('referral_id', refIds)
      await supabaseAdmin.from('referrals').delete().in('id', refIds)
    }

    // 3. User's own referral earnings
    await supabaseAdmin.from('referral_earnings').delete().eq('user_id', userId)

    // 4. Orders and related records
    const { data: orders } = await supabaseAdmin.from('orders').select('id').eq('user_id', userId)
    if (orders && orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id)
      await supabaseAdmin.from('referral_earnings').delete().in('source_order_id', orderIds)
      await supabaseAdmin.from('fraud_flags').delete().in('order_id', orderIds)
      await supabaseAdmin.from('order_status_history').delete().in('order_id', orderIds)
      await supabaseAdmin.from('order_bonus_snapshots').delete().in('order_id', orderIds)
      await supabaseAdmin.from('orders').delete().in('id', orderIds)
    }

    // 5. Fraud flags
    await supabaseAdmin.from('fraud_flags').delete().eq('user_id', userId)

    // 6. Testimonials (Winner's Circle)
    await supabaseAdmin.from('testimonials').delete().eq('user_id', userId)

    // 7. Cashout requests
    await supabaseAdmin.from('cashout_requests').delete().eq('user_id', userId)

    // 8. Free play requests
    await supabaseAdmin.from('free_play_requests').delete().eq('user_id', userId)

    // 9. Custom bonuses
    await supabaseAdmin.from('custom_bonuses').delete().eq('customer_id', userId)

    // 10. Customer games
    await supabaseAdmin.from('customer_games').delete().eq('customer_id', userId)

    // 11. Customer notes
    await supabaseAdmin.from('customer_notes').delete().or(`customer_id.eq.${userId},admin_id.eq.${userId}`)

    // 12. Chat messages and conversations
    await supabaseAdmin.from('chat_messages').delete().eq('sender_id', userId)
    const { data: conversations } = await supabaseAdmin.from('chat_conversations').select('id').eq('customer_id', userId)
    if (conversations && conversations.length > 0) {
      const convIds = conversations.map((c: any) => c.id)
      await supabaseAdmin.from('chat_messages').delete().in('conversation_id', convIds)
      await supabaseAdmin.from('chat_conversations').delete().in('id', convIds)
    }

    // 13. Notifications & Push subscriptions
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
    await supabaseAdmin.from('push_subscriptions').delete().eq('user_id', userId)

    // 14. Unlink staff/agent references
    await supabaseAdmin.from('orders').update({ processed_by: null }).eq('processed_by', userId)
    await supabaseAdmin.from('orders').update({ assigned_agent_id: null }).eq('assigned_agent_id', userId)
    await supabaseAdmin.from('cashout_requests').update({ processed_by: null }).eq('processed_by', userId)
    await supabaseAdmin.from('chat_conversations').update({ assigned_agent_id: null }).eq('assigned_agent_id', userId)
    await supabaseAdmin.from('system_settings').update({ updated_by: null }).eq('updated_by', userId)

    // 15. Delete profile directly
    await supabaseAdmin.from('profiles').delete().eq('id', userId)

    // 16. Delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (deleteError && !deleteError.message?.toLowerCase().includes('not found')) {
      throw deleteError
    }

    return new Response(JSON.stringify({ message: 'User deleted successfully' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error in admin-delete-user:', error)
    return new Response(JSON.stringify({ error: error.message || 'Failed to delete user' }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
