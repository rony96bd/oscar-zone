import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchFinanceReport, addFinanceLog, deleteFinanceLog } from '@/services/finance'
import { fetchDailyReport, exportDailyReportToCSV } from '@/services/dailyReport'
import { fetchCustomerReport } from '@/services/customerReports'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Calculator,
  Copy,
  Trash2,
  Plus,
  DollarSign,
  Users,
  ShoppingBag,
  Printer,
  Download,
  Calendar,
  Search,
  ExternalLink,
  Gamepad2,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'

// Helper for local today string
function getTodayStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AdminReportsPage() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()

  // Active top tab: default to 'daily' as requested
  const [activeTab, setActiveTab] = useState<'daily' | 'log' | 'players' | 'games'>('daily')

  // Selected date for Daily Report (defaults to today)
  const [selectedDate, setSelectedDate] = useState(getTodayStr())

  // Date range for Log tab (defaults to today)
  const [dateFrom, setDateFrom] = useState(getTodayStr())
  const [dateTo, setDateTo] = useState(getTodayStr())

  // Log add form state
  const [isAdding, setIsAdding] = useState(false)
  const [logType, setLogType] = useState<'cashout' | 'point_purchase' | 'other_expense' | 'manual_load'>('cashout')
  const [logAmount, setLogAmount] = useState('')
  const [logMethod, setLogMethod] = useState('')
  const [logNote, setLogNote] = useState('')

  // Search filter for Players tab
  const [playerSearch, setPlayerSearch] = useState('')

  // 1. Daily Report Query
  const {
    data: dailyData,
    isLoading: isDailyLoading,
    refetch: refetchDaily,
  } = useQuery({
    queryKey: ['daily-report', selectedDate],
    queryFn: () => fetchDailyReport(selectedDate),
  })

  // 2. Finance Log Query
  const {
    data: logData,
    isLoading: isLogLoading,
  } = useQuery({
    queryKey: ['finance', dateFrom, dateTo],
    queryFn: () => fetchFinanceReport(dateFrom, dateTo),
  })

  // 3. Customer & Games Overview Query (for Players & Games tabs)
  const {
    data: customerData,
    isLoading: isCustomerLoading,
  } = useQuery({
    queryKey: ['customer-report-all'],
    queryFn: () => fetchCustomerReport(),
    enabled: activeTab === 'players' || activeTab === 'games',
  })

  // Step selected date by N days
  const stepDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    dateObj.setDate(dateObj.getDate() + days)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    setSelectedDate(`${year}-${month}-${day}`)
  }

  const isToday = selectedDate === getTodayStr()

  // Format date for title
  const dateTitle = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [selectedDate])

  // Mutation for adding manual finance log
  const addMutation = useMutation({
    mutationFn: (e: React.FormEvent) => {
      e.preventDefault()
      if (!logAmount || isNaN(Number(logAmount))) throw new Error('Invalid amount')
      return addFinanceLog({
        type: logType,
        amount: Number(logAmount),
        method: logMethod,
        note: logNote,
        log_date: dateTo,
        created_by: profile!.id,
      })
    },
    onSuccess: () => {
      toast.success('Log added')
      setIsAdding(false)
      setLogAmount('')
      setLogMethod('')
      setLogNote('')
      qc.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (e: any) => toast.error(e.message),
  })

  // Mutation for deleting manual finance log
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFinanceLog(id),
    onSuccess: () => {
      toast.success('Log deleted')
      qc.invalidateQueries({ queryKey: ['finance'] })
    },
  })

  const copyLogReport = () => {
    if (!logData) return
    const dateRange = dateFrom === dateTo ? dateFrom : `${dateFrom} to ${dateTo}`
    let report = `📋 Finance Report (${dateRange})\n`
    report += `\n🟢 TOTAL LOADS: ${formatCurrency(logData.totalLoads)}`

    Object.entries(logData.loadsByMethod).forEach(([m, amt]) => {
      report += `\n  • ${m}: ${formatCurrency(amt as number)}`
    })

    report += `\n\n🔴 CASHOUTS: ${formatCurrency(logData.totalCashouts)}`
    report += `\n🟠 POINT PURCHASES: ${formatCurrency(logData.totalPurchases)}`
    if (logData.totalExpenses > 0) report += `\n🟠 OTHER EXPENSES: ${formatCurrency(logData.totalExpenses)}`
    report += `\n\n💰 NET PROFIT: ${formatCurrency(logData.netProfit)}`

    navigator.clipboard.writeText(report)
    toast.success('Report copied to clipboard')
  }

  const handleDownloadCSV = () => {
    if (!dailyData) {
      toast.error('No daily report data available to download')
      return
    }
    exportDailyReportToCSV(dailyData, selectedDate)
    toast.success(`Downloaded daily report CSV for ${selectedDate}`)
  }

  // Filtered players list
  const filteredPlayers = useMemo(() => {
    if (!customerData?.customers) return []
    if (!playerSearch.trim()) return customerData.customers
    const q = playerSearch.toLowerCase().trim()
    return customerData.customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.username.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
    )
  }, [customerData?.customers, playerSearch])

  const totalPlayersCount = dailyData?.totalPlayersCount || customerData?.customers?.length || 0

  return (
    <div className="space-y-6">
      {/* Top Header & Tab Pills */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-3">
            <Calculator className="h-6 w-6 text-primary" />
            Finance & Reports
          </h1>
          <p className="text-muted-foreground text-sm">
            Daily activity, payments breakdown, game performance and audits
          </p>
        </div>

        {/* Navigation Tab Pills matching screenshot style */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {/* Log Pill */}
          <button
            onClick={() => setActiveTab('log')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'log'
                ? 'bg-[#ff7aa2] text-slate-950 shadow-[0_0_12px_rgba(255,122,162,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
          >
            Log
          </button>

          {/* Daily Report Pill */}
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'daily'
                ? 'bg-[#ff7aa2] text-slate-950 shadow-[0_0_12px_rgba(255,122,162,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
          >
            Daily report
          </button>

          {/* Players Pill */}
          <button
            onClick={() => setActiveTab('players')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'players'
                ? 'bg-[#ff7aa2] text-slate-950 shadow-[0_0_12px_rgba(255,122,162,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
          >
            Players <span className="opacity-80 text-[11px] font-mono">{totalPlayersCount}</span>
          </button>

          {/* Games Pill */}
          <button
            onClick={() => setActiveTab('games')}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'games'
                ? 'bg-[#ff7aa2] text-slate-950 shadow-[0_0_12px_rgba(255,122,162,0.4)]'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
            }`}
          >
            Games
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DAILY REPORT (Matching User Video Screenshots Exactly)  */}
      {/* ============================================================== */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Top Main Box with Glowing Teal/Cyan Outline */}
          <div className="rounded-2xl border border-cyan-500/40 bg-[#0b1320] p-5 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
            {/* Header: Title and Day Before */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white tracking-wide">
                {isToday ? 'Today' : dateTitle}
              </h2>
              <button
                onClick={() => stepDate(-1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
              >
                <span>←</span> Day before
              </button>
            </div>

            {/* Date Input and Day After */}
            <div className="flex items-center gap-3 mt-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => stepDate(1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
              >
                Day after <span>→</span>
              </button>
            </div>

            {/* Action Buttons: Today and Download CSV */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => setSelectedDate(getTodayStr())}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  isToday
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download CSV
              </button>
            </div>

            {/* 10 Summary Metric Cards */}
            {isDailyLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-20 skeleton rounded-xl bg-slate-800/40" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
                {/* 1. RECEIVED */}
                <div className="rounded-xl p-3.5 bg-[#052323] border border-[#0d5959]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#2dd4bf] uppercase">RECEIVED</p>
                  <p className="text-2xl font-bold font-mono text-[#2dd4bf] mt-1">
                    {formatCurrency(dailyData?.summary?.received || 0)}
                  </p>
                </div>

                {/* 2. CASHED OUT */}
                <div className="rounded-xl p-3.5 bg-[#290d18] border border-[#711639]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#fb7185] uppercase">CASHED OUT</p>
                  <p className="text-2xl font-bold font-mono text-[#fb7185] mt-1">
                    {formatCurrency(dailyData?.summary?.cashedOut || 0)}
                  </p>
                </div>

                {/* 3. NET */}
                <div className="rounded-xl p-3.5 bg-[#0e1628] border border-[#1e293b]">
                  <p className="text-[11px] font-bold tracking-wider text-[#818cf8] uppercase">NET</p>
                  <p
                    className={`text-2xl font-bold font-mono mt-1 ${
                      (dailyData?.summary?.net || 0) >= 0 ? 'text-[#2dd4bf]' : 'text-[#fb7185]'
                    }`}
                  >
                    {formatCurrency(dailyData?.summary?.net || 0)}
                  </p>
                </div>

                {/* 4. POINTS LOADED */}
                <div className="rounded-xl p-3.5 bg-[#261709] border border-[#783e10]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#fb923c] uppercase">POINTS LOADED</p>
                  <p className="text-2xl font-bold font-mono text-[#fb923c] mt-1">
                    {dailyData?.summary?.pointsLoaded || 0}
                  </p>
                </div>

                {/* 5. BONUS GIVEN */}
                <div className="rounded-xl p-3.5 bg-[#241d07] border border-[#6b5610]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#facc15] uppercase">BONUS GIVEN</p>
                  <p className="text-2xl font-bold font-mono text-[#facc15] mt-1">
                    {dailyData?.summary?.bonusGiven || 0}
                  </p>
                </div>

                {/* 6. FREE PLAY */}
                <div className="rounded-xl p-3.5 bg-[#1d0e2b] border border-[#5b2782]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#c084fc] uppercase">FREE PLAY</p>
                  <p className="text-2xl font-bold font-mono text-[#c084fc] mt-1">
                    {dailyData?.summary?.freePlayCount || 0}
                  </p>
                </div>

                {/* 7. DEPOSITS */}
                <div className="rounded-xl p-3.5 bg-[#052323] border border-[#0d5959]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#2dd4bf] uppercase">DEPOSITS</p>
                  <p className="text-2xl font-bold font-mono text-[#2dd4bf] mt-1">
                    {dailyData?.summary?.depositsCount || 0}
                  </p>
                </div>

                {/* 8. CASHOUTS */}
                <div className="rounded-xl p-3.5 bg-[#290d18] border border-[#711639]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#fb7185] uppercase">CASHOUTS</p>
                  <p className="text-2xl font-bold font-mono text-[#fb7185] mt-1">
                    {dailyData?.summary?.cashoutsCount || 0}
                  </p>
                </div>

                {/* 9. PLAYERS */}
                <div className="rounded-xl p-3.5 bg-[#0b1b31] border border-[#1d4375]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#60a5fa] uppercase">PLAYERS</p>
                  <p className="text-2xl font-bold font-mono text-[#60a5fa] mt-1">
                    {dailyData?.summary?.playersCount || 0}
                  </p>
                </div>

                {/* 10. NEW PLAYERS */}
                <div className="rounded-xl p-3.5 bg-[#27150c] border border-[#703517]/60">
                  <p className="text-[11px] font-bold tracking-wider text-[#fb923c] uppercase">NEW PLAYERS</p>
                  <p className="text-2xl font-bold font-mono text-[#fb923c] mt-1">
                    {dailyData?.summary?.newPlayersCount || 0}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 1: By Payment Method & By Game (Amber/Orange Glow Border) */}
          <div className="rounded-2xl border border-amber-500/40 bg-[#0b1320] p-5 shadow-[0_0_20px_rgba(245,158,11,0.15)] space-y-6">
            {/* BY PAYMENT METHOD */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-3">
                BY PAYMENT METHOD
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-amber-500/20 text-[11px] font-bold tracking-wider text-amber-500/80 uppercase">
                      <th className="pb-2">METHOD</th>
                      <th className="pb-2 text-right">RECEIVED</th>
                      <th className="pb-2 text-right">CASHED OUT</th>
                      <th className="pb-2 text-right">NET</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dailyData?.byPaymentMethod.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                          No payment methods used on this day
                        </td>
                      </tr>
                    ) : (
                      dailyData?.byPaymentMethod.map((pm) => (
                        <tr key={pm.method} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5">
                            <span className="inline-block px-2.5 py-1 rounded bg-[#0d3330] text-[#2dd4bf] text-xs font-semibold">
                              {pm.method}
                            </span>
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-white">
                            {formatCurrency(pm.received)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-[#fb7185]">
                            {formatCurrency(pm.cashedOut)}
                          </td>
                          <td
                            className={`py-2.5 text-right font-mono font-semibold ${
                              pm.net >= 0 ? 'text-[#2dd4bf]' : 'text-[#fb7185]'
                            }`}
                          >
                            {formatCurrency(pm.net)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BY GAME */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-3">
                BY GAME
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-amber-500/20 text-[11px] font-bold tracking-wider text-amber-500/80 uppercase">
                      <th className="pb-2">GAME</th>
                      <th className="pb-2 text-right">RECEIVED</th>
                      <th className="pb-2 text-right">POINTS OUT</th>
                      <th className="pb-2 text-right">FREE PLAY</th>
                      <th className="pb-2 text-right">NET</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dailyData?.byGame.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                          No game activity on this day
                        </td>
                      </tr>
                    ) : (
                      dailyData?.byGame.map((g) => (
                        <tr key={g.game} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 font-bold text-white flex items-center gap-2">
                            {g.logoUrl && (
                              <img src={g.logoUrl} alt={g.game} className="h-6 w-6 rounded object-cover" />
                            )}
                            <span>{g.game}</span>
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-white">
                            {formatCurrency(g.received)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-[#fb923c]">
                            {g.pointsOut}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-[#c084fc]">
                            {g.freePlay}
                          </td>
                          <td
                            className={`py-2.5 text-right font-mono font-semibold ${
                              g.net >= 0 ? 'text-[#2dd4bf]' : 'text-[#fb7185]'
                            }`}
                          >
                            {formatCurrency(g.net)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Top Players & By Staff (Blue Glow Border) */}
          <div className="rounded-2xl border border-blue-500/40 bg-[#0b1320] p-5 shadow-[0_0_20px_rgba(59,130,246,0.15)] space-y-6">
            {/* TOP PLAYERS */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">
                TOP PLAYERS
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-blue-500/20 text-[11px] font-bold tracking-wider text-blue-400/80 uppercase">
                      <th className="pb-2">PLAYER</th>
                      <th className="pb-2 text-right">DEPOSITED</th>
                      <th className="pb-2 text-right">CASHED OUT</th>
                      <th className="pb-2 text-right">NET</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dailyData?.topPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-xs text-muted-foreground">
                          No player activity on this day
                        </td>
                      </tr>
                    ) : (
                      dailyData?.topPlayers.map((p) => (
                        <tr key={p.playerId} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5">
                            <span className="font-bold text-white block">{p.playerName}</span>
                            {p.username && p.username !== 'unknown' && (
                              <span className="text-[11px] text-slate-400 font-mono">@{p.username}</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-white">
                            {formatCurrency(p.deposited)}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-[#fb7185]">
                            {formatCurrency(p.cashedOut)}
                          </td>
                          <td
                            className={`py-2.5 text-right font-mono font-semibold ${
                              p.net >= 0 ? 'text-[#2dd4bf]' : 'text-[#fb7185]'
                            }`}
                          >
                            {formatCurrency(p.net)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BY STAFF */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-3">
                BY STAFF
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-blue-500/20 text-[11px] font-bold tracking-wider text-blue-400/80 uppercase">
                      <th className="pb-2">STAFF</th>
                      <th className="pb-2 text-center">DEPOSITS</th>
                      <th className="pb-2 text-right">RECEIVED</th>
                      <th className="pb-2 text-center">CASHOUTS</th>
                      <th className="pb-2 text-right">PAID OUT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {dailyData?.byStaff.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-xs text-muted-foreground">
                          No staff activity on this day
                        </td>
                      </tr>
                    ) : (
                      dailyData?.byStaff.map((s) => (
                        <tr key={s.staffId} className="hover:bg-white/5 transition-colors">
                          <td className="py-2.5 font-bold text-white">
                            {s.staffName}
                          </td>
                          <td className="py-2.5 text-center font-mono font-semibold text-[#2dd4bf]">
                            {s.depositsCount}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-white">
                            {formatCurrency(s.received)}
                          </td>
                          <td className="py-2.5 text-center font-mono font-semibold text-[#fb7185]">
                            {s.cashoutsCount}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-[#fb7185]">
                            {formatCurrency(s.paidOut)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 3: Last 14 Days (Pink Glow Border) */}
          <div className="rounded-2xl border border-rose-500/40 bg-[#0b1320] p-5 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">
              LAST 14 DAYS
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-rose-500/20 text-[11px] font-bold tracking-wider text-rose-400/80 uppercase">
                    <th className="pb-2">DAY</th>
                    <th className="pb-2 text-right">RECEIVED</th>
                    <th className="pb-2 text-right">CASHED OUT</th>
                    <th className="pb-2 text-right">NET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {dailyData?.last14Days.map((d) => {
                    const isSelected = d.date === selectedDate
                    return (
                      <tr
                        key={d.date}
                        onClick={() => setSelectedDate(d.date)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-rose-500/10' : 'hover:bg-white/5'
                        }`}
                        title="Click to view this day's daily report"
                      >
                        <td className="py-2.5">
                          <span
                            className={
                              isSelected ? 'text-cyan-400 font-bold' : 'text-slate-200 font-medium'
                            }
                          >
                            {d.dayLabel}
                          </span>
                          {isSelected && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                              Selected
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-white">
                          {formatCurrency(d.received)}
                        </td>
                        <td className="py-2.5 text-right font-mono font-semibold text-[#fb7185]">
                          {formatCurrency(d.cashedOut)}
                        </td>
                        <td
                          className={`py-2.5 text-right font-mono font-semibold ${
                            d.net >= 0 ? 'text-[#2dd4bf]' : 'text-[#fb7185]'
                          }`}
                        >
                          {formatCurrency(d.net)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LOG (Previous Financial Audit Log & Expense Management)  */}
      {/* ============================================================== */}
      {activeTab === 'log' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Transaction Logs & Expenses</h2>
              <p className="text-muted-foreground text-xs">Filter by custom range, record expenses and copy report</p>
            </div>
            <div className="flex gap-2 print:hidden items-center">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="game-input py-1 text-xs"
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="game-input py-1 text-xs"
              />
            </div>
          </div>

          {isLogLoading || !logData ? (
            <div className="h-48 skeleton rounded-xl" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 print:hidden">
              {/* 1. Total Loads */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-neon-green/20 text-neon-green">
                    <ArrowDownRight className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Total Loads</p>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(logData.totalLoads)}</h3>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {Object.entries(logData.loadsByMethod).map(([m, amt]) => (
                    <div key={m} className="flex justify-between">
                      <span>{m}:</span>
                      <span className="text-white">{formatCurrency(amt as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Agent Commission */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-orange-400/20 text-orange-400">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Agent Commission</p>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(logData.totalAgentCommissions)}</h3>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {Object.entries(logData.commissionsByMethod || {}).map(([m, amt]) => (
                    <div key={m} className="flex justify-between">
                      <span>{m}:</span>
                      <span className="text-white">{formatCurrency(amt as number)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Game Point Purchases */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-blue-400/20 text-blue-400">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Game Points (Cost)</p>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(logData.totalPurchases)}</h3>
              </div>

              {/* 4. Total Cashouts */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-destructive/20 text-destructive">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Total Cashouts</p>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(logData.totalCashouts)}</h3>
                {logData.totalExpenses > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    +{formatCurrency(logData.totalExpenses)} other expenses
                  </p>
                )}
              </div>

              {/* 5. Net Profit */}
              <div className="glass-card p-4 border-t-2 border-neon-gold">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-neon-gold/20 text-neon-gold">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-muted-foreground">Net Profit</p>
                </div>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(logData.netProfit)}</h3>
                <p className="text-[10px] text-muted-foreground mt-2">Loads - Comm - Points - Cashouts</p>
              </div>
            </div>
          )}

          <div className="flex gap-2 print:hidden">
            <button
              onClick={() => setIsAdding(!isAdding)}
              className="btn-neon px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add Expense / Cashout
            </button>
            <button
              onClick={copyLogReport}
              className="btn-ghost-neon px-4 py-2 text-sm flex items-center gap-2 text-neon-gold hover:bg-neon-gold/10 hover:border-neon-gold/30 hover:text-neon-gold"
            >
              <Copy className="h-4 w-4" /> Copy Report
            </button>
            <button
              onClick={() => window.print()}
              className="btn-ghost-neon px-4 py-2 text-sm flex items-center gap-2 text-white hover:bg-white/10 hover:border-white/30"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
          </div>

          {isAdding && (
            <form
              onSubmit={addMutation.mutate}
              className="glass-card p-4 flex flex-col md:flex-row gap-3 items-end bg-black/40 print:hidden"
            >
              <div className="flex-1 w-full">
                <label className="block text-xs text-muted-foreground mb-1">Type</label>
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value as any)}
                  className="game-input w-full"
                >
                  <option value="cashout">Cashout</option>
                  <option value="point_purchase">Point Purchase</option>
                  <option value="other_expense">Other Expense</option>
                  <option value="manual_load">Manual Load (Deposit)</option>
                </select>
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs text-muted-foreground mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={logAmount}
                  onChange={(e) => setLogAmount(e.target.value)}
                  className="game-input w-full"
                  required
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs text-muted-foreground mb-1">Method / Source (Optional)</label>
                <input
                  type="text"
                  value={logMethod}
                  onChange={(e) => setLogMethod(e.target.value)}
                  placeholder="e.g. CashApp, Chime"
                  className="game-input w-full"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs text-muted-foreground mb-1">Note (Optional)</label>
                <input
                  type="text"
                  value={logNote}
                  onChange={(e) => setLogNote(e.target.value)}
                  placeholder="Player name, etc."
                  className="game-input w-full"
                />
              </div>
              <button type="submit" disabled={addMutation.isPending} className="btn-neon px-6 py-2.5">
                Save
              </button>
            </form>
          )}

          {/* Transactions Table */}
          <div className="glass-card overflow-hidden print-table">
            <div className="p-4 border-b border-border bg-black/20 flex items-center justify-between">
              <h2 className="font-semibold text-white">All Transactions ({logData?.allTransactions?.length || 0})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/5">
                    <th className="p-3 font-medium text-muted-foreground">Date</th>
                    <th className="p-3 font-medium text-muted-foreground">Type</th>
                    <th className="p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="p-3 font-medium text-muted-foreground">Customer (Staff)</th>
                    <th className="p-3 font-medium text-muted-foreground">Method</th>
                    <th className="p-3 font-medium text-muted-foreground">Note</th>
                    <th className="p-3 font-medium text-muted-foreground print:hidden">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logData?.allTransactions?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        No transactions in this date range
                      </td>
                    </tr>
                  ) : (
                    logData?.allTransactions?.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                        <td className="p-3 whitespace-nowrap">{formatDateTime(tx.date)}</td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{tx.type}</span>
                            {tx.subType && (
                              <span className="text-xs text-muted-foreground capitalize">{tx.subType}</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-medium text-white">{formatCurrency(tx.amount)}</td>
                        <td className="p-3">
                          <span className="text-white">{tx.customer}</span>
                          {tx.staff && (
                            <span className="text-[10px] text-muted-foreground ml-1">({tx.staff})</span>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground">{tx.method || '-'}</td>
                        <td className="p-3 text-muted-foreground">{tx.note || '-'}</td>
                        <td className="p-3 print:hidden">
                          {tx.rawType === 'manual_log' && (
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this log?')) deleteMutation.mutate(tx.id)
                              }}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete log"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PLAYERS (Players performance list & deep links)         */}
      {/* ============================================================== */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search player by name, username, email..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="game-input pl-9 w-full text-sm"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Showing {filteredPlayers.length} of {customerData?.customers?.length || 0} players
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-3">Player</th>
                    <th className="p-3 text-right">Total Deposited</th>
                    <th className="p-3 text-right">Total Cashed Out</th>
                    <th className="p-3 text-right">Net Margin</th>
                    <th className="p-3 text-center">Orders</th>
                    <th className="p-3 text-center">Cashouts</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isCustomerLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Loading players data...
                      </td>
                    </tr>
                  ) : filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No players found
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map((c) => (
                      <tr key={c.customerId} className="hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{c.fullName}</div>
                          <div className="text-xs text-muted-foreground font-mono">@{c.username}</div>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-white">
                          {formatCurrency(c.totalLoaded)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-[#fb7185]">
                          {formatCurrency(c.totalCashedOut)}
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-semibold ${
                            c.netMargin >= 0 ? 'text-[#2dd4bf]' : 'text-[#fb7185]'
                          }`}
                        >
                          {formatCurrency(c.netMargin)}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-cyan-400">
                          {c.orderCount}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-[#fb7185]">
                          {c.cashoutCount}
                        </td>
                        <td className="p-3 text-right">
                          {!c.isGuest ? (
                            <Link
                              to={`/admin/customers/${c.customerId}`}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Profile <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Guest</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: GAMES (Games catalog overview & analytics)             */}
      {/* ============================================================== */}
      {activeTab === 'games' && (
        <div className="space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="p-3">Game</th>
                    <th className="p-3 text-right">Total Loaded</th>
                    <th className="p-3 text-right">Total Cashed Out</th>
                    <th className="p-3 text-right">Net Margin</th>
                    <th className="p-3 text-center">Orders</th>
                    <th className="p-3 text-center">Cashouts</th>
                    <th className="p-3 text-right">Hold %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isCustomerLoading ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        Loading games data...
                      </td>
                    </tr>
                  ) : customerData?.games?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No games data available
                      </td>
                    </tr>
                  ) : (
                    customerData?.games?.map((g) => (
                      <tr key={g.gameId} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 font-bold text-white flex items-center gap-2.5">
                          {g.logoUrl ? (
                            <img src={g.logoUrl} alt={g.gameName} className="h-7 w-7 rounded object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                              {g.gameName.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span>{g.gameName}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-white">
                          {formatCurrency(g.totalLoaded)}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-[#fb7185]">
                          {formatCurrency(g.totalCashedOut)}
                        </td>
                        <td
                          className={`p-3 text-right font-mono font-semibold ${
                            g.netMargin >= 0 ? 'text-[#2dd4bf]' : 'text-[#fb7185]'
                          }`}
                        >
                          {formatCurrency(g.netMargin)}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-cyan-400">
                          {g.orderCount}
                        </td>
                        <td className="p-3 text-center font-mono font-semibold text-[#fb7185]">
                          {g.cashoutCount}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-[#facc15]">
                          {g.holdPercentage}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
