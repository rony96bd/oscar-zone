import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    let userId: string | null = null
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
      userId = user?.id || null
    }

    const { game_id, amount, customer_id } = await req.json()

    if (!game_id || !amount || amount < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const effectiveUserId = customer_id || userId

    // Get default bonus
    const { data: setting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'default_bonus_percentage')
      .single()
    const defaultBonusPct = parseFloat(setting?.value || '10')

    let regularBonusPct = defaultBonusPct
    if (effectiveUserId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('custom_bonus_percentage')
        .eq('id', effectiveUserId)
        .single()
      if (profile?.custom_bonus_percentage != null) {
        regularBonusPct = profile.custom_bonus_percentage
      }
    }

    const regularBonusAmount = Math.round(amount * regularBonusPct / 100 * 100) / 100

    // Find promotion
    const now = new Date()
    const { data: promotions } = await supabase
      .from('promotions')
      .select('*')
      .eq('is_active', true)
      .neq('type', 'regular')
      .order('priority', { ascending: false })

    let bestPromo = null
    let promoBonusPct = 0
    let promoBonusAmount = 0

    for (const promo of (promotions || [])) {
      if (amount < promo.minimum_amount) continue
      if (promo.maximum_amount && amount > promo.maximum_amount) continue
      if (promo.start_date && new Date(promo.start_date) > now) continue
      if (promo.end_date && new Date(promo.end_date) < now) continue
      if (promo.applicable_game_ids?.length && !promo.applicable_game_ids.includes(game_id)) continue

      if (promo.type === 'first_load' && effectiveUserId) {
        const { count } = await supabase
          .from('orders')
          .select('id', { count: 'exact' })
          .eq('user_id', effectiveUserId)
          .eq('status', 'completed')
        if ((count || 0) > 0) continue
      }

      bestPromo = promo
      promoBonusPct = promo.bonus_percentage
      promoBonusAmount = Math.round(amount * promoBonusPct / 100 * 100) / 100
      break
    }

    const totalBonus = Math.round((regularBonusAmount + promoBonusAmount) * 100) / 100
    const finalCredit = Math.round((amount + totalBonus) * 100) / 100

    return new Response(
      JSON.stringify({
        regular_bonus_pct: regularBonusPct,
        regular_bonus_amount: regularBonusAmount,
        promotion_name: bestPromo?.name || null,
        promo_bonus_pct: promoBonusPct,
        promo_bonus_amount: promoBonusAmount,
        total_bonus: totalBonus,
        final_credit: finalCredit,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error(err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
