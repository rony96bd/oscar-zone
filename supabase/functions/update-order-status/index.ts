import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending_payment_review: ['payment_verified', 'rejected', 'cancelled'],
  payment_verified: ['processing', 'rejected'],
  processing: ['completed', 'rejected'],
  completed: ['refunded'],
  rejected: [],
  cancelled: [],
  refunded: [],
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const authHeader = req.headers.get('Authorization')
  let adminId: string | null = null

  if (authHeader) {
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    adminId = user?.id || null
  }

  if (!adminId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .single()

  if (!profile || !['admin', 'super_admin', 'support_agent'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { order_id, status, note } = await req.json()

  // Get current order
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, user_id, game_id, order_number')
    .eq('id', order_id)
    .single()

  if (!order) {
    return new Response(JSON.stringify({ error: 'Order not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Validate status transition
  const allowedTransitions = VALID_TRANSITIONS[order.status] || []
  if (!allowedTransitions.includes(status)) {
    return new Response(
      JSON.stringify({ error: `Cannot transition from ${order.status} to ${status}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Update order
  const updates: any = { status }
  if (note) updates.admin_note = note
  if (status === 'rejected') updates.rejection_reason = note

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', order_id)

  if (error) {
    return new Response(JSON.stringify({ error: 'Failed to update order' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Log audit
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    action: `order_status_changed_to_${status}`,
    target_type: 'order',
    target_id: order_id,
    previous_value: { status: order.status },
    new_value: { status, note },
  })

  // Send notification to customer
  if (order.user_id) {
    const statusMessages: Record<string, string> = {
      payment_verified: `Payment verified for order ${order.order_number}! We're processing your load now.`,
      processing: `Order ${order.order_number} is being processed. Almost there!`,
      completed: `Order ${order.order_number} completed! Your game has been loaded. Enjoy!`,
      rejected: `Order ${order.order_number} was rejected. ${note ? 'Reason: ' + note : 'Please contact support.'}`,
      refunded: `Order ${order.order_number} has been refunded.`,
    }

    const message = statusMessages[status]
    if (message) {
      await supabase.from('notifications').insert({
        user_id: order.user_id,
        title: `Order ${status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`,
        message,
        category: 'orders',
        action_url: `/orders/${order_id}`,
      })
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
