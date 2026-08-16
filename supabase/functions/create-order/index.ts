import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'ORD-'
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization')

    // Service role client for writes
    const adminClient = createClient(supabaseUrl, serviceKey)

    // Determine caller — authenticated or guest
    let userId: string | null = null
    let profile: any = null

    if (authHeader) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (user) {
        userId = user.id
        const { data } = await adminClient.from('profiles').select('*').eq('id', userId).single()
        profile = data
      }
    }

    const body = await req.json()
    const {
      game_id,
      username,
      base_amount,
      payment_method_id,
      payment_screenshot_key, // R2 key from r2-upload-screenshot
      customer_game_id,
    } = body

    // ── Validations ──────────────────────────────────────────────

    // Validate game
    const { data: game, error: gameError } = await adminClient
      .from('games')
      .select('*')
      .eq('id', game_id)
      .eq('is_active', true)
      .single()

    if (gameError || !game) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive game' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate amount
    if (base_amount < game.minimum_amount || base_amount > game.maximum_amount) {
      return new Response(JSON.stringify({
        error: `Amount must be between $${game.minimum_amount} and $${game.maximum_amount}`,
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate payment method
    const { data: paymentMethod, error: pmError } = await adminClient
      .from('payment_methods')
      .select('*')
      .eq('id', payment_method_id)
      .eq('is_active', true)
      .single()

    if (pmError || !paymentMethod) {
      return new Response(JSON.stringify({ error: 'Invalid payment method' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If authenticated, validate customer game ownership
    if (userId && customer_game_id) {
      const { data: cg, error: cgError } = await adminClient
        .from('customer_games')
        .select('*')
        .eq('id', customer_game_id)
        .eq('customer_id', userId)
        .eq('game_id', game_id)
        .eq('status', 'active')
        .single()

      if (cgError || !cg) {
        return new Response(JSON.stringify({ error: 'Invalid game account selection' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Check customer account status
    if (profile && profile.account_status !== 'active') {
      return new Response(JSON.stringify({ error: 'Your account is not active. Please contact support.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Bonus Calculation ────────────────────────────────────────
    const bonusResp = await adminClient.functions.invoke('calculate-bonus', {
      body: { game_id, amount: base_amount, customer_id: userId },
    })
    const bonusData = bonusResp.data ?? {}

    const regularBonusPct = bonusData.regular_bonus_pct ?? 0
    const regularBonusAmt = bonusData.regular_bonus_amount ?? 0
    const promoBonusPct = bonusData.promo_bonus_pct ?? 0
    const promoBonusAmt = bonusData.promo_bonus_amount ?? 0
    const totalBonus = bonusData.total_bonus ?? 0
    const finalCredit = bonusData.final_credit ?? base_amount
    const promotionId = bonusData.promotion_id ?? null
    const promotionName = bonusData.promotion_name ?? null

    // ── Create Order (atomic) ────────────────────────────────────
    let orderNumber = generateOrderNumber()
    // Ensure unique order number
    let attempts = 0
    while (attempts < 5) {
      const { data: existing } = await adminClient
        .from('orders')
        .select('id')
        .eq('order_number', orderNumber)
        .maybeSingle()
      if (!existing) break
      orderNumber = generateOrderNumber()
      attempts++
    }

    const isGuest = !userId

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        customer_game_id: customer_game_id || null,
        game_id,
        username: username.trim(),
        base_amount,
        regular_bonus_pct: regularBonusPct,
        regular_bonus_amount: regularBonusAmt,
        promo_bonus_pct: promoBonusPct,
        promo_bonus_amount: promoBonusAmt,
        total_bonus_amount: totalBonus,
        final_game_credit: finalCredit,
        payment_method_id,
        payment_screenshot_key: payment_screenshot_key || null,
        status: 'pending_payment_review',
        promotion_id: promotionId,
        is_guest: isGuest,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      return new Response(JSON.stringify({ error: 'Failed to create order', detail: orderError?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Bonus Snapshot ───────────────────────────────────────────
    await adminClient.from('order_bonus_snapshots').insert({
      order_id: order.id,
      base_amount,
      regular_bonus_pct: regularBonusPct,
      regular_bonus_amount: regularBonusAmt,
      promotion_name: promotionName,
      promo_bonus_pct: promoBonusPct,
      promo_bonus_amount: promoBonusAmt,
      total_bonus_amount: totalBonus,
      final_game_credit: finalCredit,
      bonus_rule_applied: promotionId ? `promotion:${promotionId}` : 'regular',
      snapshot_data: bonusData,
    })

    // ── Notification to customer ─────────────────────────────────
    if (userId) {
      await adminClient.from('notifications').insert({
        user_id: userId,
        title: 'Order Created',
        message: `Order ${orderNumber} submitted! Amount: $${base_amount} → ${finalCredit} credits.`,
        category: 'orders',
        action_url: `/orders/${order.id}`,
      })
    }

    // ── Telegram Notification ────────────────────────────────────
    try {
      await adminClient.functions.invoke('send-telegram-notification', {
        body: {
          order_id: order.id,
          order_number: orderNumber,
          game_name: game.name,
          username: username.trim(),
          base_amount,
          final_credit: finalCredit,
          regular_bonus_pct: regularBonusPct,
          promo_bonus_pct: promoBonusPct,
          promo_name: promotionName,
          payment_name: paymentMethod.name,
          customer_name: profile?.full_name || username.trim(),
          is_guest: isGuest,
          payment_screenshot_key: payment_screenshot_key || null,
        },
      })
    } catch (tgErr) {
      console.error('Telegram notification failed (non-fatal):', tgErr)
    }

    return new Response(JSON.stringify({ success: true, order }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-order error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
