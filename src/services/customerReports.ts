import { supabase } from '@/lib/supabase'

export interface GameReportItem {
  gameId: string
  gameName: string
  gameSlug?: string
  logoUrl?: string | null
  orderCount: number
  totalLoaded: number
  averageLoad: number
  cashoutCount: number
  totalCashedOut: number
  netMargin: number // totalLoaded - totalCashedOut
  holdPercentage: number // (netMargin / totalLoaded) * 100
  uniquePlayersCount: number
}

export interface CustomerReportItem {
  customerId: string
  isGuest: boolean
  fullName: string
  username: string
  phone?: string
  email?: string
  avatarUrl?: string | null
  orderCount: number
  totalLoaded: number
  totalCreditsReceived: number
  cashoutCount: number
  totalCashedOut: number
  netMargin: number // totalLoaded - totalCashedOut (positive = house profit, negative = customer profit)
  mostPlayedGame: string
  gameBreakdown: Record<string, number>
  firstSeen: string
  lastActive: string
}

export interface CustomerReportData {
  timeframeLabel: string
  kpis: {
    mostPlayedGame: { name: string; count: number; amount: number; logoUrl?: string | null } | null
    mostCashoutGame: { name: string; count: number; amount: number; logoUrl?: string | null } | null
    topPlayerByAmount: { name: string; username: string; amount: number; orderCount: number; id: string; isGuest: boolean } | null
    topPlayerByFrequency: { name: string; username: string; count: number; amount: number; id: string; isGuest: boolean } | null
    totalActiveCustomers: number
    totalOrders: number
    totalLoadedAmount: number
    totalCashoutAmount: number
    netHouseMargin: number
  }
  games: GameReportItem[]
  customers: CustomerReportItem[]
}

export async function fetchCustomerReport(dateFrom?: string, dateTo?: string): Promise<CustomerReportData> {
  // Build date bounds
  let fromISO: string | undefined
  let toISO: string | undefined

  if (dateFrom) {
    fromISO = new Date(`${dateFrom}T00:00:00`).toISOString()
  }
  if (dateTo) {
    toISO = new Date(`${dateTo}T23:59:59.999`).toISOString()
  }

  // 1. Fetch all games for catalog mapping
  const { data: allGames } = await supabase
    .from('games')
    .select('id, name, slug, logo_url')

  const gameMap = new Map<string, { id: string; name: string; slug?: string; logo_url?: string | null }>()
  allGames?.forEach(g => {
    gameMap.set(g.id, g)
    gameMap.set(g.name.toLowerCase().trim(), g)
  })

  // 2. Query completed orders
  let ordersQuery = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      user_id,
      username,
      game_id,
      base_amount,
      final_game_credit,
      status,
      created_at,
      game:games(id, name, slug, logo_url),
      profile:profiles!user_id(id, full_name, username, phone, email, avatar_url)
    `)
    .eq('status', 'completed')

  if (fromISO) ordersQuery = ordersQuery.gte('created_at', fromISO)
  if (toISO) ordersQuery = ordersQuery.lte('created_at', toISO)

  const { data: orders, error: ordersError } = await ordersQuery
  if (ordersError) throw ordersError

  // 3. Query approved / completed cashouts
  let cashoutsQuery = supabase
    .from('cashout_requests')
    .select(`
      id,
      request_number,
      user_id,
      game_name,
      game_username,
      amount,
      status,
      created_at,
      profile:profiles!user_id(id, full_name, username, phone, email, avatar_url)
    `)
    .in('status', ['approved', 'completed'])

  if (fromISO) cashoutsQuery = cashoutsQuery.gte('created_at', fromISO)
  if (toISO) cashoutsQuery = cashoutsQuery.lte('created_at', toISO)

  const { data: cashouts, error: cashoutsError } = await cashoutsQuery
  if (cashoutsError) throw cashoutsError

  // 4. Aggregate Games
  const gameStats: Record<string, {
    gameId: string
    gameName: string
    gameSlug?: string
    logoUrl?: string | null
    orderCount: number
    totalLoaded: number
    cashoutCount: number
    totalCashedOut: number
    uniquePlayers: Set<string>
  }> = {}

  // Initialize with all catalog games
  allGames?.forEach(g => {
    gameStats[g.id] = {
      gameId: g.id,
      gameName: g.name,
      gameSlug: g.slug,
      logoUrl: g.logo_url,
      orderCount: 0,
      totalLoaded: 0,
      cashoutCount: 0,
      totalCashedOut: 0,
      uniquePlayers: new Set<string>()
    }
  })

  // Process orders into gameStats
  orders?.forEach(o => {
    const gObj = Array.isArray(o.game) ? o.game[0] : o.game as any
    const gId = o.game_id || gObj?.id || 'unknown'
    const gName = gObj?.name || 'Unknown Game'

    if (!gameStats[gId]) {
      gameStats[gId] = {
        gameId: gId,
        gameName: gName,
        gameSlug: gObj?.slug,
        logoUrl: gObj?.logo_url,
        orderCount: 0,
        totalLoaded: 0,
        cashoutCount: 0,
        totalCashedOut: 0,
        uniquePlayers: new Set<string>()
      }
    }

    gameStats[gId].orderCount += 1
    gameStats[gId].totalLoaded += Number(o.base_amount || 0)
    const playerKey = o.user_id || (o.username ? `guest:${o.username.toLowerCase().trim()}` : o.id)
    gameStats[gId].uniquePlayers.add(playerKey)
  })

  // Process cashouts into gameStats
  cashouts?.forEach(c => {
    const rawGameName = (c.game_name || '').toLowerCase().trim()
    const matchedGame = gameMap.get(rawGameName)
    const gId = matchedGame?.id || rawGameName || 'unknown'

    if (!gameStats[gId]) {
      gameStats[gId] = {
        gameId: gId,
        gameName: matchedGame?.name || c.game_name || 'Other',
        gameSlug: matchedGame?.slug,
        logoUrl: matchedGame?.logo_url,
        orderCount: 0,
        totalLoaded: 0,
        cashoutCount: 0,
        totalCashedOut: 0,
        uniquePlayers: new Set<string>()
      }
    }

    gameStats[gId].cashoutCount += 1
    gameStats[gId].totalCashedOut += Number(c.amount || 0)
    const playerKey = c.user_id || (c.game_username ? `guest:${c.game_username.toLowerCase().trim()}` : c.id)
    gameStats[gId].uniquePlayers.add(playerKey)
  })

  const gamesReport: GameReportItem[] = Object.values(gameStats).map(g => {
    const netMargin = Math.round((g.totalLoaded - g.totalCashedOut) * 100) / 100
    const holdPercentage = g.totalLoaded > 0 
      ? Math.round(((netMargin / g.totalLoaded) * 100) * 10) / 10 
      : 0
    const averageLoad = g.orderCount > 0 
      ? Math.round((g.totalLoaded / g.orderCount) * 100) / 100 
      : 0

    return {
      gameId: g.gameId,
      gameName: g.gameName,
      gameSlug: g.gameSlug,
      logoUrl: g.logoUrl,
      orderCount: g.orderCount,
      totalLoaded: Math.round(g.totalLoaded * 100) / 100,
      averageLoad,
      cashoutCount: g.cashoutCount,
      totalCashedOut: Math.round(g.totalCashedOut * 100) / 100,
      netMargin,
      holdPercentage,
      uniquePlayersCount: g.uniquePlayers.size
    }
  }).sort((a, b) => b.orderCount - a.orderCount || b.totalLoaded - a.totalLoaded)

  // 5. Aggregate Customers
  const customerStats: Record<string, {
    customerId: string
    isGuest: boolean
    fullName: string
    username: string
    phone?: string
    email?: string
    avatarUrl?: string | null
    orderCount: number
    totalLoaded: number
    totalCreditsReceived: number
    cashoutCount: number
    totalCashedOut: number
    gameCountMap: Record<string, number>
    firstSeen: string
    lastActive: string
  }> = {}

  // Process orders for customers
  orders?.forEach(o => {
    const prof = Array.isArray(o.profile) ? o.profile[0] : o.profile as any
    const isGuest = !o.user_id
    const key = o.user_id || `guest:${(o.username || '').toLowerCase().trim()}`

    if (!customerStats[key]) {
      customerStats[key] = {
        customerId: o.user_id || key,
        isGuest,
        fullName: prof?.full_name || (o.username ? `${o.username} (Guest)` : 'Guest Player'),
        username: prof?.username || o.username || 'unknown',
        phone: prof?.phone,
        email: prof?.email,
        avatarUrl: prof?.avatar_url,
        orderCount: 0,
        totalLoaded: 0,
        totalCreditsReceived: 0,
        cashoutCount: 0,
        totalCashedOut: 0,
        gameCountMap: {},
        firstSeen: o.created_at,
        lastActive: o.created_at,
      }
    }

    const c = customerStats[key]
    c.orderCount += 1
    c.totalLoaded += Number(o.base_amount || 0)
    c.totalCreditsReceived += Number(o.final_game_credit || 0)
    
    const gObj = Array.isArray(o.game) ? o.game[0] : o.game as any
    const gName = gObj?.name || 'Unknown'
    c.gameCountMap[gName] = (c.gameCountMap[gName] || 0) + 1

    if (new Date(o.created_at) < new Date(c.firstSeen)) c.firstSeen = o.created_at
    if (new Date(o.created_at) > new Date(c.lastActive)) c.lastActive = o.created_at
  })

  // Process cashouts for customers
  cashouts?.forEach(cash => {
    const prof = Array.isArray(cash.profile) ? cash.profile[0] : cash.profile as any
    const isGuest = !cash.user_id
    const key = cash.user_id || `guest:${(cash.game_username || '').toLowerCase().trim()}`

    if (!customerStats[key]) {
      customerStats[key] = {
        customerId: cash.user_id || key,
        isGuest,
        fullName: prof?.full_name || (cash.game_username ? `${cash.game_username} (Guest)` : 'Guest Player'),
        username: prof?.username || cash.game_username || 'unknown',
        phone: prof?.phone,
        email: prof?.email,
        avatarUrl: prof?.avatar_url,
        orderCount: 0,
        totalLoaded: 0,
        totalCreditsReceived: 0,
        cashoutCount: 0,
        totalCashedOut: 0,
        gameCountMap: {},
        firstSeen: cash.created_at,
        lastActive: cash.created_at,
      }
    }

    const c = customerStats[key]
    c.cashoutCount += 1
    c.totalCashedOut += Number(cash.amount || 0)

    if (new Date(cash.created_at) < new Date(c.firstSeen)) c.firstSeen = cash.created_at
    if (new Date(cash.created_at) > new Date(c.lastActive)) c.lastActive = cash.created_at
  })

  const customersReport: CustomerReportItem[] = Object.values(customerStats).map(c => {
    // Determine most played game
    let topGame = '—'
    let maxGameCount = 0
    Object.entries(c.gameCountMap).forEach(([g, count]) => {
      if (count > maxGameCount) {
        maxGameCount = count
        topGame = g
      }
    })

    const netMargin = Math.round((c.totalLoaded - c.totalCashedOut) * 100) / 100

    return {
      customerId: c.customerId,
      isGuest: c.isGuest,
      fullName: c.fullName,
      username: c.username,
      phone: c.phone,
      email: c.email,
      avatarUrl: c.avatarUrl,
      orderCount: c.orderCount,
      totalLoaded: Math.round(c.totalLoaded * 100) / 100,
      totalCreditsReceived: Math.round(c.totalCreditsReceived * 100) / 100,
      cashoutCount: c.cashoutCount,
      totalCashedOut: Math.round(c.totalCashedOut * 100) / 100,
      netMargin,
      mostPlayedGame: topGame,
      gameBreakdown: c.gameCountMap,
      firstSeen: c.firstSeen,
      lastActive: c.lastActive
    }
  }).sort((a, b) => b.totalLoaded - a.totalLoaded || b.orderCount - a.orderCount)

  // 6. Calculate Top-Level KPIs
  const mostPlayedGameItem = [...gamesReport].sort((a, b) => b.orderCount - a.orderCount)[0]
  const mostCashoutGameItem = [...gamesReport].sort((a, b) => b.totalCashedOut - a.totalCashedOut)[0]
  const topPlayerAmountItem = [...customersReport].sort((a, b) => b.totalLoaded - a.totalLoaded)[0]
  const topPlayerFrequencyItem = [...customersReport].sort((a, b) => b.orderCount - a.orderCount)[0]

  const totalOrders = orders?.length || 0
  const totalLoadedAmount = Math.round(customersReport.reduce((sum, c) => sum + c.totalLoaded, 0) * 100) / 100
  const totalCashoutAmount = Math.round(customersReport.reduce((sum, c) => sum + c.totalCashedOut, 0) * 100) / 100
  const netHouseMargin = Math.round((totalLoadedAmount - totalCashoutAmount) * 100) / 100

  const timeframeLabel = dateFrom && dateTo
    ? dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`
    : 'All Time'

  return {
    timeframeLabel,
    kpis: {
      mostPlayedGame: mostPlayedGameItem && mostPlayedGameItem.orderCount > 0 ? {
        name: mostPlayedGameItem.gameName,
        count: mostPlayedGameItem.orderCount,
        amount: mostPlayedGameItem.totalLoaded,
        logoUrl: mostPlayedGameItem.logoUrl
      } : null,
      mostCashoutGame: mostCashoutGameItem && mostCashoutGameItem.totalCashedOut > 0 ? {
        name: mostCashoutGameItem.gameName,
        count: mostCashoutGameItem.cashoutCount,
        amount: mostCashoutGameItem.totalCashedOut,
        logoUrl: mostCashoutGameItem.logoUrl
      } : null,
      topPlayerByAmount: topPlayerAmountItem && topPlayerAmountItem.totalLoaded > 0 ? {
        name: topPlayerAmountItem.fullName,
        username: topPlayerAmountItem.username,
        amount: topPlayerAmountItem.totalLoaded,
        orderCount: topPlayerAmountItem.orderCount,
        id: topPlayerAmountItem.customerId,
        isGuest: topPlayerAmountItem.isGuest
      } : null,
      topPlayerByFrequency: topPlayerFrequencyItem && topPlayerFrequencyItem.orderCount > 0 ? {
        name: topPlayerFrequencyItem.fullName,
        username: topPlayerFrequencyItem.username,
        count: topPlayerFrequencyItem.orderCount,
        amount: topPlayerFrequencyItem.totalLoaded,
        id: topPlayerFrequencyItem.customerId,
        isGuest: topPlayerFrequencyItem.isGuest
      } : null,
      totalActiveCustomers: customersReport.length,
      totalOrders,
      totalLoadedAmount,
      totalCashoutAmount,
      netHouseMargin
    },
    games: gamesReport,
    customers: customersReport
  }
}
