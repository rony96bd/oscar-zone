import { supabase } from '@/lib/supabase'

export interface DailyReportSummary {
  date: string
  dayName: string
  received: number
  cashedOut: number
  net: number
  pointsLoaded: number
  bonusGiven: number
  freePlayCount: number
  depositsCount: number
  cashoutsCount: number
  playersCount: number
  newPlayersCount: number
}

export interface PaymentMethodBreakdown {
  method: string
  received: number
  cashedOut: number
  net: number
}

export interface GameBreakdown {
  game: string
  gameId?: string
  logoUrl?: string | null
  received: number
  pointsOut: number
  freePlay: number
  cashouts: number
  net: number
}

export interface TopPlayerBreakdown {
  playerId: string
  playerName: string
  username: string
  isGuest: boolean
  deposited: number
  cashedOut: number
  net: number
}

export interface StaffBreakdown {
  staffId: string
  staffName: string
  depositsCount: number
  received: number
  cashoutsCount: number
  paidOut: number
}

export interface DayRow {
  date: string // YYYY-MM-DD
  dayLabel: string // e.g. "Sun, Oct 18"
  received: number
  cashedOut: number
  net: number
}

export interface FullDailyReportData {
  summary: DailyReportSummary
  byPaymentMethod: PaymentMethodBreakdown[]
  byGame: GameBreakdown[]
  topPlayers: TopPlayerBreakdown[]
  byStaff: StaffBreakdown[]
  last14Days: DayRow[]
  totalPlayersCount: number
}

// Helper to convert UTC date string to local YYYY-MM-DD
function toLocalDateStr(isoString: string): string {
  const d = new Date(isoString)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to format day label like "Sun, Oct 18"
function formatDayLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export async function fetchDailyReport(selectedDate: string): Promise<FullDailyReportData> {
  // Determine local date bounds for selectedDate
  const [sYear, sMonth, sDay] = selectedDate.split('-').map(Number)
  const selDateObj = new Date(sYear, sMonth - 1, sDay)

  // 14 days ago start
  const fourteenDaysAgoObj = new Date(selDateObj)
  fourteenDaysAgoObj.setDate(fourteenDaysAgoObj.getDate() - 13)
  fourteenDaysAgoObj.setHours(0, 0, 0, 0)

  // End of selected date
  const endOfSelectedDateObj = new Date(selDateObj)
  endOfSelectedDateObj.setHours(23, 59, 59, 999)

  const fourteenDaysAgoISO = fourteenDaysAgoObj.toISOString()
  const endOfSelectedDateISO = endOfSelectedDateObj.toISOString()

  // Selected date start/end in ISO for new_players and free_plays
  const startOfSelectedDateObj = new Date(selDateObj)
  startOfSelectedDateObj.setHours(0, 0, 0, 0)
  const startOfSelectedDateISO = startOfSelectedDateObj.toISOString()

  // 1. Fetch completed orders in last 14 days
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select(`
      id,
      user_id,
      username,
      guest_name,
      base_amount,
      final_game_credit,
      total_bonus_amount,
      is_free_play,
      status,
      created_at,
      updated_at,
      processed_by,
      game:games(id, name, slug, logo_url),
      payment_method:payment_methods(id, name, tag),
      profile:profiles!orders_user_id_fkey(id, full_name, username),
      staff:profiles!orders_processed_by_fkey(id, full_name, username)
    `)
    .eq('status', 'completed')
    .gte('updated_at', fourteenDaysAgoISO)
    .lte('updated_at', endOfSelectedDateISO)

  if (ordersErr) throw ordersErr

  // 2. Fetch approved/completed cashouts in last 14 days
  const { data: cashouts, error: cashoutsErr } = await supabase
    .from('cashout_requests')
    .select(`
      id,
      user_id,
      amount,
      game_name,
      game_username,
      payment_method_name,
      status,
      created_at,
      updated_at,
      processed_by,
      profile:profiles!cashout_requests_user_id_fkey(id, full_name, username),
      staff:profiles!cashout_requests_processed_by_fkey(id, full_name, username)
    `)
    .in('status', ['approved', 'completed'])
    .gte('updated_at', fourteenDaysAgoISO)
    .lte('updated_at', endOfSelectedDateISO)

  if (cashoutsErr) throw cashoutsErr

  // 3. Fetch approved free plays for the selected date
  const { data: freePlays, error: freePlaysErr } = await supabase
    .from('free_play_requests')
    .select(`
      id,
      user_id,
      game_id,
      status,
      created_at,
      updated_at,
      game:games(id, name, slug)
    `)
    .eq('status', 'approved')
    .gte('updated_at', startOfSelectedDateISO)
    .lte('updated_at', endOfSelectedDateISO)

  if (freePlaysErr) throw freePlaysErr

  // 4. Fetch new players count registered on selectedDate
  const { count: newPlayersCount, error: newPlayersErr } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer')
    .gte('created_at', startOfSelectedDateISO)
    .lte('created_at', endOfSelectedDateISO)

  if (newPlayersErr) throw newPlayersErr

  // 5. Fetch total players count
  const { count: totalPlayersCount, error: totalPlayersErr } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'customer')

  if (totalPlayersErr) throw totalPlayersErr

  // 6. Fetch all catalog games for reference
  const { data: catalogGames } = await supabase
    .from('games')
    .select('id, name, slug, logo_url')

  const gameMap = new Map<string, { id: string; name: string; slug?: string; logo_url?: string | null }>()
  catalogGames?.forEach(g => {
    gameMap.set(g.id, g)
    gameMap.set(g.name.toLowerCase().trim(), g)
  })

  // ---- Filter records for selectedDate ----
  const todayOrders = (orders || []).filter(o => toLocalDateStr(o.updated_at || o.created_at) === selectedDate)
  const todayCashouts = (cashouts || []).filter(c => toLocalDateStr(c.updated_at || c.created_at) === selectedDate)
  const todayFreePlays = freePlays || []

  // ---- Summary Calculations ----
  let received = 0
  let pointsLoaded = 0
  let bonusGiven = 0
  let freePlayOrderCount = 0
  const uniqueActivePlayers = new Set<string>()

  todayOrders.forEach(o => {
    const amt = Number(o.base_amount || 0)
    const credit = Number(o.final_game_credit || 0) || (amt + Number(o.total_bonus_amount || 0))
    const bonus = Number(o.total_bonus_amount || 0)

    received += amt
    pointsLoaded += credit
    bonusGiven += bonus
    if (o.is_free_play) freePlayOrderCount++

    const playerKey = o.user_id || (o.username ? `guest:${o.username.toLowerCase().trim()}` : o.id)
    uniqueActivePlayers.add(playerKey)
  })

  let cashedOut = 0
  todayCashouts.forEach(c => {
    const amt = Number(c.amount || 0)
    cashedOut += amt

    const playerKey = c.user_id || (c.game_username ? `guest:${c.game_username.toLowerCase().trim()}` : c.id)
    uniqueActivePlayers.add(playerKey)
  })

  const net = received - cashedOut
  const totalFreePlaysCount = todayFreePlays.length + freePlayOrderCount

  const dayOfWeekName = selDateObj.toLocaleDateString('en-US', { weekday: 'long' })

  const summary: DailyReportSummary = {
    date: selectedDate,
    dayName: dayOfWeekName,
    received: Math.round(received * 100) / 100,
    cashedOut: Math.round(cashedOut * 100) / 100,
    net: Math.round(net * 100) / 100,
    pointsLoaded: Math.round(pointsLoaded * 100) / 100,
    bonusGiven: Math.round(bonusGiven * 100) / 100,
    freePlayCount: totalFreePlaysCount,
    depositsCount: todayOrders.length,
    cashoutsCount: todayCashouts.length,
    playersCount: uniqueActivePlayers.size,
    newPlayersCount: newPlayersCount || 0,
  }

  // ---- 1. BY PAYMENT METHOD ----
  const pmMap: Record<string, { method: string; received: number; cashedOut: number }> = {}

  todayOrders.forEach(o => {
    const pm = Array.isArray(o.payment_method) ? o.payment_method[0] : o.payment_method as any
    const pmName = pm?.name || pm?.tag || 'Other'
    if (!pmMap[pmName]) {
      pmMap[pmName] = { method: pmName, received: 0, cashedOut: 0 }
    }
    pmMap[pmName].received += Number(o.base_amount || 0)
  })

  todayCashouts.forEach(c => {
    const pmName = c.payment_method_name || 'Other'
    if (!pmMap[pmName]) {
      pmMap[pmName] = { method: pmName, received: 0, cashedOut: 0 }
    }
    pmMap[pmName].cashedOut += Number(c.amount || 0)
  })

  const byPaymentMethod: PaymentMethodBreakdown[] = Object.values(pmMap).map(pm => ({
    method: pm.method,
    received: Math.round(pm.received * 100) / 100,
    cashedOut: Math.round(pm.cashedOut * 100) / 100,
    net: Math.round((pm.received - pm.cashedOut) * 100) / 100,
  })).sort((a, b) => b.received - a.received || b.cashedOut - a.cashedOut)

  // ---- 2. BY GAME ----
  const gMap: Record<string, {
    game: string
    gameId?: string
    logoUrl?: string | null
    received: number
    pointsOut: number
    freePlay: number
    cashouts: number
  }> = {}

  todayOrders.forEach(o => {
    const g = Array.isArray(o.game) ? o.game[0] : o.game as any
    const gName = g?.name || 'Unknown'
    const gKey = g?.id || gName.toLowerCase().trim()

    if (!gMap[gKey]) {
      gMap[gKey] = {
        game: gName,
        gameId: g?.id,
        logoUrl: g?.logo_url,
        received: 0,
        pointsOut: 0,
        freePlay: 0,
        cashouts: 0,
      }
    }
    const amt = Number(o.base_amount || 0)
    const points = Number(o.final_game_credit || 0) || (amt + Number(o.total_bonus_amount || 0))
    gMap[gKey].received += amt
    gMap[gKey].pointsOut += points
    if (o.is_free_play) gMap[gKey].freePlay += 1
  })

  todayFreePlays.forEach(fp => {
    const g = Array.isArray(fp.game) ? fp.game[0] : fp.game as any
    const gName = g?.name || 'Unknown'
    const gKey = fp.game_id || gName.toLowerCase().trim()

    if (!gMap[gKey]) {
      const matched = gameMap.get(fp.game_id)
      gMap[gKey] = {
        game: matched?.name || gName,
        gameId: fp.game_id,
        logoUrl: matched?.logo_url,
        received: 0,
        pointsOut: 0,
        freePlay: 0,
        cashouts: 0,
      }
    }
    gMap[gKey].freePlay += 1
  })

  todayCashouts.forEach(c => {
    const rawGame = (c.game_name || '').toLowerCase().trim()
    const matched = gameMap.get(rawGame)
    const gKey = matched?.id || rawGame || 'unknown'
    const gName = matched?.name || c.game_name || 'Other'

    if (!gMap[gKey]) {
      gMap[gKey] = {
        game: gName,
        gameId: matched?.id,
        logoUrl: matched?.logo_url,
        received: 0,
        pointsOut: 0,
        freePlay: 0,
        cashouts: 0,
      }
    }
    gMap[gKey].cashouts += Number(c.amount || 0)
  })

  const byGame: GameBreakdown[] = Object.values(gMap).map(g => ({
    game: g.game,
    gameId: g.gameId,
    logoUrl: g.logoUrl,
    received: Math.round(g.received * 100) / 100,
    pointsOut: Math.round(g.pointsOut * 100) / 100,
    freePlay: g.freePlay,
    cashouts: Math.round(g.cashouts * 100) / 100,
    net: Math.round((g.received - g.cashouts) * 100) / 100,
  })).sort((a, b) => b.received - a.received || b.pointsOut - a.pointsOut)

  // ---- 3. TOP PLAYERS ----
  const pMap: Record<string, {
    playerId: string
    playerName: string
    username: string
    isGuest: boolean
    deposited: number
    cashedOut: number
  }> = {}

  todayOrders.forEach(o => {
    const prof = Array.isArray(o.profile) ? o.profile[0] : o.profile as any
    const isGuest = !o.user_id
    const pKey = o.user_id || `guest:${(o.username || o.guest_name || '').toLowerCase().trim()}`
    const displayName = prof?.full_name || o.guest_name || o.username || 'Guest Player'
    const username = prof?.username || o.username || 'guest'

    if (!pMap[pKey]) {
      pMap[pKey] = {
        playerId: o.user_id || pKey,
        playerName: displayName,
        username,
        isGuest,
        deposited: 0,
        cashedOut: 0,
      }
    }
    pMap[pKey].deposited += Number(o.base_amount || 0)
  })

  todayCashouts.forEach(c => {
    const prof = Array.isArray(c.profile) ? c.profile[0] : c.profile as any
    const isGuest = !c.user_id
    const pKey = c.user_id || `guest:${(c.game_username || '').toLowerCase().trim()}`
    const displayName = prof?.full_name || c.game_username || 'Guest Player'
    const username = prof?.username || c.game_username || 'guest'

    if (!pMap[pKey]) {
      pMap[pKey] = {
        playerId: c.user_id || pKey,
        playerName: displayName,
        username,
        isGuest,
        deposited: 0,
        cashedOut: 0,
      }
    }
    pMap[pKey].cashedOut += Number(c.amount || 0)
  })

  const topPlayers: TopPlayerBreakdown[] = Object.values(pMap).map(p => ({
    playerId: p.playerId,
    playerName: p.playerName,
    username: p.username,
    isGuest: p.isGuest,
    deposited: Math.round(p.deposited * 100) / 100,
    cashedOut: Math.round(p.cashedOut * 100) / 100,
    net: Math.round((p.deposited - p.cashedOut) * 100) / 100,
  })).sort((a, b) => b.deposited - a.deposited || b.cashedOut - a.cashedOut)

  // ---- 4. BY STAFF ----
  const sMap: Record<string, {
    staffId: string
    staffName: string
    depositsCount: number
    received: number
    cashoutsCount: number
    paidOut: number
  }> = {}

  todayOrders.forEach(o => {
    const staff = Array.isArray(o.staff) ? o.staff[0] : o.staff as any
    const sId = staff?.id || o.processed_by || 'unassigned'
    const sName = staff?.full_name || staff?.username || (o.processed_by ? 'Staff Member' : 'System / Online')

    if (!sMap[sId]) {
      sMap[sId] = {
        staffId: sId,
        staffName: sName,
        depositsCount: 0,
        received: 0,
        cashoutsCount: 0,
        paidOut: 0,
      }
    }
    sMap[sId].depositsCount += 1
    sMap[sId].received += Number(o.base_amount || 0)
  })

  todayCashouts.forEach(c => {
    const staff = Array.isArray(c.staff) ? c.staff[0] : c.staff as any
    const sId = staff?.id || c.processed_by || 'unassigned'
    const sName = staff?.full_name || staff?.username || (c.processed_by ? 'Staff Member' : 'System / Online')

    if (!sMap[sId]) {
      sMap[sId] = {
        staffId: sId,
        staffName: sName,
        depositsCount: 0,
        received: 0,
        cashoutsCount: 0,
        paidOut: 0,
      }
    }
    sMap[sId].cashoutsCount += 1
    sMap[sId].paidOut += Number(c.amount || 0)
  })

  const byStaff: StaffBreakdown[] = Object.values(sMap).map(s => ({
    staffId: s.staffId,
    staffName: s.staffName,
    depositsCount: s.depositsCount,
    received: Math.round(s.received * 100) / 100,
    cashoutsCount: s.cashoutsCount,
    paidOut: Math.round(s.paidOut * 100) / 100,
  })).sort((a, b) => b.received - a.received || b.paidOut - a.paidOut)

  // ---- 5. LAST 14 DAYS ----
  // Generate date list from selectedDate back 13 days (total 14 days)
  const last14Days: DayRow[] = []
  for (let i = 0; i < 14; i++) {
    const dObj = new Date(selDateObj)
    dObj.setDate(dObj.getDate() - i)
    const dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`
    const label = formatDayLabel(dateStr)

    // Calculate sums for this day
    const dayOrders = (orders || []).filter(o => toLocalDateStr(o.updated_at || o.created_at) === dateStr)
    const dayCashouts = (cashouts || []).filter(c => toLocalDateStr(c.updated_at || c.created_at) === dateStr)

    const dayReceived = dayOrders.reduce((sum, o) => sum + Number(o.base_amount || 0), 0)
    const dayCashedOut = dayCashouts.reduce((sum, c) => sum + Number(c.amount || 0), 0)
    const dayNet = dayReceived - dayCashedOut

    last14Days.push({
      date: dateStr,
      dayLabel: label,
      received: Math.round(dayReceived * 100) / 100,
      cashedOut: Math.round(dayCashedOut * 100) / 100,
      net: Math.round(dayNet * 100) / 100,
    })
  }

  return {
    summary,
    byPaymentMethod,
    byGame,
    topPlayers,
    byStaff,
    last14Days,
    totalPlayersCount: totalPlayersCount || 0,
  }
}

export function exportDailyReportToCSV(data: FullDailyReportData, date: string): void {
  const lines: string[] = []

  // Helper for CSV cell quoting
  const q = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`

  // Title
  lines.push(`DAILY REPORT - ${date} (${data.summary.dayName})`)
  lines.push(`Generated at,${q(new Date().toLocaleString())}`)
  lines.push('')

  // Summary Metrics
  lines.push('--- SUMMARY METRICS ---')
  lines.push('METRIC,VALUE')
  lines.push(`RECEIVED,${data.summary.received.toFixed(2)}`)
  lines.push(`CASHED OUT,${data.summary.cashedOut.toFixed(2)}`)
  lines.push(`NET,${data.summary.net.toFixed(2)}`)
  lines.push(`POINTS LOADED,${data.summary.pointsLoaded}`)
  lines.push(`BONUS GIVEN,${data.summary.bonusGiven.toFixed(2)}`)
  lines.push(`FREE PLAY,${data.summary.freePlayCount}`)
  lines.push(`DEPOSITS,${data.summary.depositsCount}`)
  lines.push(`CASHOUTS,${data.summary.cashoutsCount}`)
  lines.push(`PLAYERS,${data.summary.playersCount}`)
  lines.push(`NEW PLAYERS,${data.summary.newPlayersCount}`)
  lines.push('')

  // Payment Methods
  lines.push('--- BY PAYMENT METHOD ---')
  lines.push('METHOD,RECEIVED,CASHED OUT,NET')
  if (data.byPaymentMethod.length === 0) {
    lines.push('None,0,0,0')
  } else {
    data.byPaymentMethod.forEach(pm => {
      lines.push(`${q(pm.method)},${pm.received.toFixed(2)},${pm.cashedOut.toFixed(2)},${pm.net.toFixed(2)}`)
    })
  }
  lines.push('')

  // By Game
  lines.push('--- BY GAME ---')
  lines.push('GAME,RECEIVED,POINTS OUT,FREE PLAY,NET')
  if (data.byGame.length === 0) {
    lines.push('None,0,0,0,0')
  } else {
    data.byGame.forEach(g => {
      lines.push(`${q(g.game)},${g.received.toFixed(2)},${g.pointsOut},${g.freePlay},${g.net.toFixed(2)}`)
    })
  }
  lines.push('')

  // Top Players
  lines.push('--- TOP PLAYERS ---')
  lines.push('PLAYER,USERNAME,DEPOSITED,CASHED OUT,NET')
  if (data.topPlayers.length === 0) {
    lines.push('None,,0,0,0')
  } else {
    data.topPlayers.forEach(p => {
      lines.push(`${q(p.playerName)},${q(p.username)},${p.deposited.toFixed(2)},${p.cashedOut.toFixed(2)},${p.net.toFixed(2)}`)
    })
  }
  lines.push('')

  // By Staff
  lines.push('--- BY STAFF ---')
  lines.push('STAFF,DEPOSITS,RECEIVED,CASHOUTS,PAID OUT')
  if (data.byStaff.length === 0) {
    lines.push('None,0,0,0,0')
  } else {
    data.byStaff.forEach(s => {
      lines.push(`${q(s.staffName)},${s.depositsCount},${s.received.toFixed(2)},${s.cashoutsCount},${s.paidOut.toFixed(2)}`)
    })
  }
  lines.push('')

  // Last 14 Days
  lines.push('--- LAST 14 DAYS ---')
  lines.push('DAY,DATE,RECEIVED,CASHED OUT,NET')
  data.last14Days.forEach(d => {
    lines.push(`${q(d.dayLabel)},${q(d.date)},${d.received.toFixed(2)},${d.cashedOut.toFixed(2)},${d.net.toFixed(2)}`)
  })

  const csvContent = lines.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `daily-report-${date}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
