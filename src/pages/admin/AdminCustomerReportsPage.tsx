import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { 
  Users, Gamepad2, ArrowDownToLine, Trophy, TrendingUp, 
  Search, RefreshCw, Copy, ExternalLink, Flame, ShieldAlert,
  Award, ArrowUpRight, DollarSign, Calendar, Filter, Sparkles
} from 'lucide-react'
import { fetchCustomerReport } from '@/services/customerReports'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { toast } from 'sonner'

type DatePreset = 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'all_time' | 'custom'

function getDateRangeForPreset(preset: DatePreset): { from?: string; to?: string } {
  const today = new Date()
  const formatDate = (d: Date) => d.toISOString().split('T')[0]

  switch (preset) {
    case 'today': {
      const d = formatDate(today)
      return { from: d, to: d }
    }
    case 'yesterday': {
      const y = new Date(today)
      y.setDate(y.getDate() - 1)
      const d = formatDate(y)
      return { from: d, to: d }
    }
    case '7days': {
      const past = new Date(today)
      past.setDate(past.getDate() - 7)
      return { from: formatDate(past), to: formatDate(today) }
    }
    case '30days': {
      const past = new Date(today)
      past.setDate(past.getDate() - 30)
      return { from: formatDate(past), to: formatDate(today) }
    }
    case 'this_month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from: formatDate(start), to: formatDate(today) }
    }
    case 'all_time':
    default:
      return { from: undefined, to: undefined }
  }
}

export default function AdminCustomerReportsPage() {
  const [preset, setPreset] = useState<DatePreset>('30days')
  const defaultDates = useMemo(() => getDateRangeForPreset('30days'), [])
  const [dateFrom, setDateFrom] = useState<string>(defaultDates.from || '')
  const [dateTo, setDateTo] = useState<string>(defaultDates.to || '')
  
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'customers'>('overview')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSortBy, setCustomerSortBy] = useState<'loaded' | 'orders' | 'cashout' | 'net_margin'>('loaded')
  const [gameSortBy, setGameSortBy] = useState<'orders' | 'loaded' | 'cashout' | 'margin'>('orders')
  const [customerFilter, setCustomerFilter] = useState<'all' | 'registered' | 'guest' | 'high_rollers'>('all')

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['customer-report', dateFrom, dateTo],
    queryFn: () => fetchCustomerReport(dateFrom || undefined, dateTo || undefined),
  })

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset)
    if (newPreset !== 'custom') {
      const range = getDateRangeForPreset(newPreset)
      setDateFrom(range.from || '')
      setDateTo(range.to || '')
    }
  }

  // Filtered & Sorted Games
  const sortedGames = useMemo(() => {
    if (!data?.games) return []
    return [...data.games].sort((a, b) => {
      if (gameSortBy === 'orders') return b.orderCount - a.orderCount || b.totalLoaded - a.totalLoaded
      if (gameSortBy === 'loaded') return b.totalLoaded - a.totalLoaded || b.orderCount - a.orderCount
      if (gameSortBy === 'cashout') return b.totalCashedOut - a.totalCashedOut
      if (gameSortBy === 'margin') return b.netMargin - a.netMargin
      return 0
    })
  }, [data?.games, gameSortBy])

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    if (!data?.customers) return []
    let list = [...data.customers]

    // Search filter
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase().trim()
      list = list.filter(c => 
        c.fullName.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      )
    }

    // Segment filter
    if (customerFilter === 'registered') {
      list = list.filter(c => !c.isGuest)
    } else if (customerFilter === 'guest') {
      list = list.filter(c => c.isGuest)
    } else if (customerFilter === 'high_rollers') {
      list = list.filter(c => c.totalLoaded >= 200)
    }

    // Sorting
    list.sort((a, b) => {
      if (customerSortBy === 'loaded') return b.totalLoaded - a.totalLoaded || b.orderCount - a.orderCount
      if (customerSortBy === 'orders') return b.orderCount - a.orderCount || b.totalLoaded - a.totalLoaded
      if (customerSortBy === 'cashout') return b.totalCashedOut - a.totalCashedOut
      if (customerSortBy === 'net_margin') return b.netMargin - a.netMargin
      return 0
    })

    return list
  }, [data?.customers, customerSearch, customerFilter, customerSortBy])

  const copyReportSummary = () => {
    if (!data) return
    const rangeText = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Time'
    let text = `📊 CUSTOMER & GAME REPORT (${rangeText})\n`
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    text += `💰 Total Volume Loaded: ${formatCurrency(data.kpis.totalLoadedAmount)}\n`
    text += `💸 Total Cashouts Paid: ${formatCurrency(data.kpis.totalCashoutAmount)}\n`
    text += `📈 Net House Margin: ${formatCurrency(data.kpis.netHouseMargin)}\n`
    text += `👥 Active Players: ${data.kpis.totalActiveCustomers} (${data.kpis.totalOrders} orders)\n\n`

    if (data.kpis.mostPlayedGame) {
      text += `🎮 MOST PLAYED GAME: ${data.kpis.mostPlayedGame.name} (${data.kpis.mostPlayedGame.count} plays, ${formatCurrency(data.kpis.mostPlayedGame.amount)} loaded)\n`
    }
    if (data.kpis.mostCashoutGame) {
      text += `💸 HIGHEST CASHOUT GAME: ${data.kpis.mostCashoutGame.name} (${formatCurrency(data.kpis.mostCashoutGame.amount)} cashed out)\n`
    }
    if (data.kpis.topPlayerByAmount) {
      text += `👑 TOP PLAYER (HIGHEST VOLUME): ${data.kpis.topPlayerByAmount.name} (@${data.kpis.topPlayerByAmount.username}) - ${formatCurrency(data.kpis.topPlayerByAmount.amount)} (${data.kpis.topPlayerByAmount.orderCount} orders)\n`
    }
    if (data.kpis.topPlayerByFrequency) {
      text += `🔁 MOST FREQUENT PLAYER: ${data.kpis.topPlayerByFrequency.name} (@${data.kpis.topPlayerByFrequency.username}) - ${data.kpis.topPlayerByFrequency.count} orders\n\n`
    }

    text += `🏆 TOP 5 PLAYERS BY VOLUME:\n`
    data.customers.slice(0, 5).forEach((c, idx) => {
      text += `${idx + 1}. ${c.fullName} (@${c.username}): ${formatCurrency(c.totalLoaded)} loaded (${c.orderCount} plays) | Cashout: ${formatCurrency(c.totalCashedOut)}\n`
    })

    text += `\n🕹️ GAMES RANKING:\n`
    data.games.forEach((g, idx) => {
      text += `${idx + 1}. ${g.gameName}: ${g.orderCount} plays | Loaded: ${formatCurrency(g.totalLoaded)} | Cashed Out: ${formatCurrency(g.totalCashedOut)} | Margin: ${formatCurrency(g.netMargin)}\n`
    })

    navigator.clipboard.writeText(text)
    toast.success('Customer report summary copied to clipboard!')
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-gaming font-bold text-white">Customer Report</h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Analyze player activity, most played games, highest cashouts, and high rollers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={copyReportSummary} 
            disabled={isLoading || !data}
            className="btn-ghost-neon text-xs px-3 py-2 flex items-center gap-1.5"
            title="Copy Report Summary"
          >
            <Copy className="h-3.5 w-3.5" />
            Copy Summary
          </button>
          <button 
            onClick={() => refetch()} 
            disabled={isFetching}
            className="btn-ghost-neon text-xs px-3 py-2 flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Filters Bar */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Timeframe:
            </span>
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: '7 Days' },
                { id: '30days', label: '30 Days' },
                { id: 'this_month', label: 'This Month' },
                { id: 'all_time', label: 'All Time' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  preset === p.id
                    ? 'bg-primary text-primary-foreground font-bold shadow'
                    : 'bg-muted/40 text-muted-foreground hover:text-white hover:bg-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                setPreset('custom')
              }}
              className="game-input py-1 px-2 text-xs"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                setPreset('custom')
              }}
              className="game-input py-1 px-2 text-xs"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 skeleton rounded-xl" />
            ))}
          </div>
          <div className="h-96 skeleton rounded-xl" />
        </div>
      ) : !data ? (
        <div className="glass-card p-12 text-center text-muted-foreground">
          No customer data found for the selected timeframe.
        </div>
      ) : (
        <>
          {/* Key Metric Highlights (Answers User Questions Directly) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Most Played Game */}
            <div className="glass-card p-4 border border-blue-500/20 bg-gradient-to-br from-blue-950/20 to-transparent relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                  <Gamepad2 className="h-3.5 w-3.5" /> Most Played Game
                </span>
                <span className="badge text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">
                  #1 Popular
                </span>
              </div>
              {data.kpis.mostPlayedGame ? (
                <>
                  <div className="flex items-center gap-2.5 my-1">
                    {data.kpis.mostPlayedGame.logoUrl ? (
                      <img src={data.kpis.mostPlayedGame.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center font-bold text-xs text-blue-400">
                        {data.kpis.mostPlayedGame.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white text-base leading-tight">
                        {data.kpis.mostPlayedGame.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {data.kpis.mostPlayedGame.count} loads / plays
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border flex justify-between">
                    <span>Total Loaded:</span>
                    <span className="text-white font-medium">{formatCurrency(data.kpis.mostPlayedGame.amount)}</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic my-2">No game orders yet</p>
              )}
            </div>

            {/* Most Cashed Out Game */}
            <div className="glass-card p-4 border border-amber-500/20 bg-gradient-to-br from-amber-950/20 to-transparent relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-neon-gold uppercase tracking-wider flex items-center gap-1">
                  <ArrowDownToLine className="h-3.5 w-3.5" /> Highest Cashout Game
                </span>
                <span className="badge text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded">
                  Top Payout
                </span>
              </div>
              {data.kpis.mostCashoutGame ? (
                <>
                  <div className="flex items-center gap-2.5 my-1">
                    {data.kpis.mostCashoutGame.logoUrl ? (
                      <img src={data.kpis.mostCashoutGame.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center font-bold text-xs text-amber-400">
                        {data.kpis.mostCashoutGame.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-white text-base leading-tight">
                        {data.kpis.mostCashoutGame.name}
                      </p>
                      <p className="text-xs text-neon-gold font-semibold">
                        {formatCurrency(data.kpis.mostCashoutGame.amount)} cashed out
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border flex justify-between">
                    <span>Requests:</span>
                    <span className="text-white font-medium">{data.kpis.mostCashoutGame.count} cashouts</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic my-2">No cashouts in period</p>
              )}
            </div>

            {/* Top Player (Who Played / Loaded the Most) */}
            <div className="glass-card p-4 border border-purple-500/20 bg-gradient-to-br from-purple-950/20 to-transparent relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" /> Top Player (Most Loaded)
                </span>
                <span className="badge text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-1.5 py-0.5 rounded">
                  High Roller
                </span>
              </div>
              {data.kpis.topPlayerByAmount ? (
                <>
                  <div className="my-1">
                    <p className="font-bold text-white text-base truncate">
                      {data.kpis.topPlayerByAmount.name}
                    </p>
                    <p className="text-xs text-purple-300 truncate">
                      @{data.kpis.topPlayerByAmount.username}
                      {data.kpis.topPlayerByAmount.isGuest && ' (Guest)'}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border flex justify-between items-center">
                    <span>Volume:</span>
                    <span className="text-neon-green font-bold">
                      {formatCurrency(data.kpis.topPlayerByAmount.amount)}
                      <span className="text-muted-foreground font-normal text-[11px] ml-1">
                        ({data.kpis.topPlayerByAmount.orderCount} orders)
                      </span>
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic my-2">No customer activity</p>
              )}
            </div>

            {/* Active Customers & Net Margin */}
            <div className="glass-card p-4 border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-transparent relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" /> Total Active & Margin
                </span>
                <span className="badge text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                  Summary
                </span>
              </div>
              <div className="my-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{data.kpis.totalActiveCustomers}</span>
                  <span className="text-xs text-muted-foreground">active players</span>
                </div>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                  House Win: {formatCurrency(data.kpis.netHouseMargin)}
                </p>
              </div>
              <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border flex justify-between">
                <span>Loaded: {formatCurrency(data.kpis.totalLoadedAmount)}</span>
                <span>Out: {formatCurrency(data.kpis.totalCashoutAmount)}</span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-border gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              Summary & Insights
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'games'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-white'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              Game Performance ({data.games.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'customers'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              Customer Leaderboard ({data.customers.length})
            </button>
          </div>

          {/* TAB 1: OVERVIEW & INSIGHTS */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Games Ranking Preview */}
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-gaming font-bold text-white text-base flex items-center gap-2">
                        <Flame className="h-4 w-4 text-orange-400" />
                        Most Played Games Ranking
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Games ranked by total order volume and plays</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('games')}
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      View All <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {data.games.slice(0, 5).map((game, idx) => {
                      const totalOrdersAll = data.kpis.totalOrders || 1
                      const pctOfOrders = Math.round((game.orderCount / totalOrdersAll) * 100)

                      return (
                        <div key={game.gameId} className="p-3 rounded-xl bg-black/20 border border-border flex items-center gap-3">
                          <span className={`w-6 text-center font-bold text-sm ${idx === 0 ? 'text-neon-gold' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                            #{idx + 1}
                          </span>
                          {game.logoUrl ? (
                            <img src={game.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-xs text-primary">
                              {game.gameName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-white text-sm truncate">{game.gameName}</p>
                              <span className="font-bold text-white text-xs">{game.orderCount} plays</span>
                            </div>
                            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden my-1.5">
                              <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${pctOfOrders}%` }} />
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Loaded: <strong className="text-white">{formatCurrency(game.totalLoaded)}</strong></span>
                              <span>Cashed out: <strong className="text-neon-gold">{formatCurrency(game.totalCashedOut)}</strong></span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top Players Preview (Who Played the Most) */}
                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-gaming font-bold text-white text-base flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-neon-gold" />
                        Top Players Leaderboard
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Customers who loaded and played the most</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('customers')}
                      className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      View All <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {data.customers.slice(0, 5).map((customer, idx) => (
                      <div key={customer.customerId} className="p-3 rounded-xl bg-black/20 border border-border flex items-center gap-3">
                        <span className={`w-6 text-center font-bold text-sm ${idx === 0 ? 'text-neon-gold' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                          #{idx + 1}
                        </span>
                        <div className="h-9 w-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                          {customer.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-white text-sm truncate">{customer.fullName}</p>
                            <span className="font-bold text-neon-green text-xs">{formatCurrency(customer.totalLoaded)}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-0.5">
                            <span className="truncate">@{customer.username} · {customer.orderCount} orders</span>
                            <span>Fav: <strong className="text-white">{customer.mostPlayedGame}</strong></span>
                          </div>
                        </div>
                        {!customer.isGuest && (
                          <Link 
                            to={`/admin/customers/${customer.customerId}`}
                            className="text-muted-foreground hover:text-white p-1"
                            title="View Customer Profile"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    ))}
                    {data.customers.length === 0 && (
                      <p className="text-sm text-muted-foreground italic text-center py-6">No customer data available in this timeframe</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Cashout Analysis Card */}
              <div className="glass-card p-5">
                <h3 className="font-gaming font-bold text-white text-base mb-1 flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4 text-neon-gold" />
                  Game Cashout & RTP Hold Analysis
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Compare which games had the highest payouts vs deposits
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.games.filter(g => g.totalLoaded > 0 || g.totalCashedOut > 0).slice(0, 6).map((g) => {
                    const isPositive = g.netMargin >= 0
                    return (
                      <div key={g.gameId} className="p-4 rounded-xl bg-black/25 border border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-white text-sm truncate">{g.gameName}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-destructive/20 text-destructive'}`}>
                            {g.holdPercentage}% Hold
                          </span>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Deposits Loaded:</span>
                            <span className="text-white font-medium">{formatCurrency(g.totalLoaded)}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Cashed Out:</span>
                            <span className="text-neon-gold font-medium">{formatCurrency(g.totalCashedOut)} ({g.cashoutCount}x)</span>
                          </div>
                          <div className="flex justify-between pt-1 border-t border-border font-semibold">
                            <span>Net House Win:</span>
                            <span className={isPositive ? 'text-neon-green' : 'text-destructive'}>
                              {formatCurrency(g.netMargin)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GAME PERFORMANCE */}
          {activeTab === 'games' && (
            <div className="glass-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-gaming font-bold text-white text-base">Game Performance Breakdown</h3>
                  <p className="text-xs text-muted-foreground">Which games are played most and which games have the highest cashouts</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Sort By:</span>
                  <select
                    value={gameSortBy}
                    onChange={(e) => setGameSortBy(e.target.value as any)}
                    className="game-input text-xs py-1"
                  >
                    <option value="orders">Most Played (Orders Count)</option>
                    <option value="loaded">Highest Loaded ($ Amount)</option>
                    <option value="cashout">Highest Cashout ($ Amount)</option>
                    <option value="margin">Highest House Margin ($)</option>
                  </select>
                </div>
              </div>

              {/* Games Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Game</th>
                      <th className="py-3 px-3 text-right">Orders / Plays</th>
                      <th className="py-3 px-3 text-right">Total Loaded</th>
                      <th className="py-3 px-3 text-right">Avg Load</th>
                      <th className="py-3 px-3 text-right">Cashout Amount</th>
                      <th className="py-3 px-3 text-right">Cashouts</th>
                      <th className="py-3 px-3 text-right">House Net Win</th>
                      <th className="py-3 px-3 text-right">Hold %</th>
                      <th className="py-3 px-3 text-right">Players</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sortedGames.map((game, idx) => (
                      <tr key={game.gameId} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 font-semibold text-muted-foreground">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {game.logoUrl ? (
                              <img src={game.logoUrl} alt="" className="h-7 w-7 rounded-lg object-cover" />
                            ) : (
                              <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-[10px] text-primary">
                                {game.gameName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-white text-sm">{game.gameName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-white text-sm">
                          {game.orderCount}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-neon-green">
                          {formatCurrency(game.totalLoaded)}
                        </td>
                        <td className="py-3 px-3 text-right text-muted-foreground">
                          {formatCurrency(game.averageLoad)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-neon-gold">
                          {formatCurrency(game.totalCashedOut)}
                        </td>
                        <td className="py-3 px-3 text-right text-muted-foreground">
                          {game.cashoutCount}x
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${game.netMargin >= 0 ? 'text-neon-green' : 'text-destructive'}`}>
                          {formatCurrency(game.netMargin)}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            game.holdPercentage >= 20 ? 'bg-emerald-500/20 text-emerald-400' :
                            game.holdPercentage > 0 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-destructive/20 text-destructive'
                          }`}>
                            {game.holdPercentage}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-white">
                          {game.uniquePlayersCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOMER LEADERBOARD */}
          {activeTab === 'customers' && (
            <div className="glass-card p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h3 className="font-gaming font-bold text-white text-base">Customer Leaderboard</h3>
                  <p className="text-xs text-muted-foreground">Detailed activity and top customers ranking</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search customer, username..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="game-input text-xs py-1.5 pl-8 w-48 sm:w-60"
                    />
                  </div>

                  {/* Filter segment */}
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value as any)}
                    className="game-input text-xs py-1.5"
                  >
                    <option value="all">All Players</option>
                    <option value="registered">Registered Users Only</option>
                    <option value="guest">Guest Players</option>
                    <option value="high_rollers">High Rollers (Loaded $200+)</option>
                  </select>

                  {/* Sort */}
                  <select
                    value={customerSortBy}
                    onChange={(e) => setCustomerSortBy(e.target.value as any)}
                    className="game-input text-xs py-1.5"
                  >
                    <option value="loaded">Most Loaded ($ Volume)</option>
                    <option value="orders">Most Orders (Frequency)</option>
                    <option value="cashout">Highest Cashout ($)</option>
                    <option value="net_margin">Highest House Profit ($)</option>
                  </select>
                </div>
              </div>

              {/* Customers Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3">Rank</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Top Game</th>
                      <th className="py-3 px-3 text-right">Orders</th>
                      <th className="py-3 px-3 text-right">Total Loaded</th>
                      <th className="py-3 px-3 text-right">Total Cashout</th>
                      <th className="py-3 px-3 text-right">Net House Win</th>
                      <th className="py-3 px-3 text-right">Last Active</th>
                      <th className="py-3 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-muted-foreground">
                          No customers found matching the criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCustomers.map((c, idx) => (
                        <tr key={c.customerId} className="hover:bg-white/5 transition-colors">
                          <td className="py-3 px-3 font-semibold text-muted-foreground">
                            #{idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                {c.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-semibold text-white truncate">{c.fullName}</p>
                                  {c.isGuest ? (
                                    <span className="badge text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 py-0.2 rounded">
                                      Guest
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  @{c.username} {c.phone ? `· ${c.phone}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="badge text-xs bg-white/5 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                              {c.mostPlayedGame}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-white text-sm">
                            {c.orderCount}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-neon-green">
                            {formatCurrency(c.totalLoaded)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-neon-gold">
                            {formatCurrency(c.totalCashedOut)}
                            {c.cashoutCount > 0 && (
                              <span className="text-[10px] text-muted-foreground block font-normal">
                                ({c.cashoutCount}x)
                              </span>
                            )}
                          </td>
                          <td className={`py-3 px-3 text-right font-bold ${c.netMargin >= 0 ? 'text-neon-green' : 'text-destructive'}`}>
                            {formatCurrency(c.netMargin)}
                          </td>
                          <td className="py-3 px-3 text-right text-muted-foreground">
                            {formatRelativeTime(c.lastActive)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {!c.isGuest ? (
                              <Link
                                to={`/admin/customers/${c.customerId}`}
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline px-2 py-1 rounded hover:bg-primary/10 transition-colors"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
