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
  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', adminId)
    .single()

  if (!adminProfile || !['admin', 'super_admin', 'support_agent'].includes(adminProfile.role)) {
    return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { order_id, status, note } = await req.json()

  // Get current order with user info
  const { data: order } = await supabase
    .from('orders')
    .select('id, status, user_id, game_id, order_number, base_amount')
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

  // ── REFERRAL SYSTEM ──────────────────────────────────────────
  // Only process when order is completed and has a real user (not guest)
  if (status === 'completed' && order.user_id) {
    try {
      // Fetch referral qualification settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['referral_qualify_on', 'referral_min_load_amount'])

      const minLoadRaw = settings?.find(s => s.key === 'referral_min_load_amount')?.value
      const minLoadAmount = parseFloat(
        typeof minLoadRaw === 'string'
          ? minLoadRaw.replace(/"/g, '')
          : String(minLoadRaw ?? '5')
      )

      // Check if the completed order meets minimum amount
      const orderAmount = parseFloat(order.base_amount) || 0
      const meetsMinLoad = orderAmount >= minLoadAmount

      // Get the customer's profile to find their referrer
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('id, referred_by')
        .eq('id', order.user_id)
        .single()

      if (!customerProfile?.referred_by) {
        // No referrer, skip
      } else {
        const referrerId = customerProfile.referred_by

        // Find the referral record between referrer and this customer
        const { data: referralRecord } = await supabase
          .from('referrals')
          .select('id, status')
          .eq('referrer_id', referrerId)
          .eq('referred_id', order.user_id)
          .single()

        if (referralRecord) {
          // ── QUALIFY REFERRAL ──────────────────────────────────
          // If referral is still pending and order meets criteria, qualify it
          if (referralRecord.status === 'pending' && meetsMinLoad) {
            await supabase
              .from('referrals')
              .update({ status: 'qualified', qualified_at: new Date().toISOString() })
              .eq('id', referralRecord.id)

            // Notify referrer about their new qualified referral
            const { data: referredProfile } = await supabase
              .from('profiles')
              .select('full_name, username')
              .eq('id', order.user_id)
              .single()

            await supabase.from('notifications').insert({
              user_id: referrerId,
              title: '🎉 New Qualified Referral!',
              message: `${referredProfile?.full_name || referredProfile?.username || 'A user'} you referred just completed their first qualifying load! You earned a referral commission.`,
              category: 'referral',
              action_url: '/earnings',
            })
          }

          // ── CALCULATE COMMISSION ──────────────────────────────
          // Always calculate commission when referral is qualified (or just became qualified)
          // This gives lifetime commission on every completed load
          const isNowQualified = (referralRecord.status === 'pending' && meetsMinLoad) || referralRecord.status === 'qualified'

          if (isNowQualified) {
            // Fetch referrer's current qualified referral count to determine their level
            const { data: qualifiedReferrals } = await supabase
              .from('referrals')
              .select('id')
              .eq('referrer_id', referrerId)
              .eq('status', 'qualified')

            // Count current qualified (include the one we just qualified)
            const qualifiedCount = (qualifiedReferrals?.length || 0)

            // Get commission levels
            const { data: levels } = await supabase
              .from('referral_levels')
              .select('*')
              .order('level')

            // Find the referrer's current level
            const currentLevel = (levels || []).find(
              l => qualifiedCount >= l.min_referrals && (l.max_referrals === null || qualifiedCount <= l.max_referrals)
            )

            const commissionPct = currentLevel?.commission_percentage ?? 0
            const commissionAmount = (orderAmount * commissionPct) / 100

            if (commissionAmount > 0) {
              // Insert immutable earnings record
              await supabase.from('referral_earnings').insert({
                user_id: referrerId,
                referral_id: referralRecord.id,
                source_order_id: order_id,
                deposit_amount: orderAmount,
                commission_percentage: commissionPct,
                commission_amount: commissionAmount,
                level: currentLevel?.level ?? 0,
                status: 'pending',
              })

              // Notify referrer about commission earned
              await supabase.from('notifications').insert({
                user_id: referrerId,
                title: '💰 Commission Earned!',
                message: `You earned $${commissionAmount.toFixed(2)} commission (${commissionPct}%) from a referral load of $${orderAmount.toFixed(2)}.`,
                category: 'referral',
                action_url: '/earnings',
              })
            }
          }
        }
      }
    } catch (refErr) {
      // Non-fatal — don't fail the whole order update
      console.error('Referral processing error (non-fatal):', refErr)
    }
  }
  // ── END REFERRAL SYSTEM ──────────────────────────────────────

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})


