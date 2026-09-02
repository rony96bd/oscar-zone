import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchCustomers } from '@/services/admin'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, cn } from '@/lib/utils'
import { Activity, Search, Filter, ArrowUpDown } from 'lucide-react'
import type { Profile } from '@/types'

interface StaffStats {
  profile: Profile
  ordersProcessed: number
  ordersAmount: number
  cashoutsProcessed: number
  cashoutsAmount: number
  manualLoadsAmount: number
  manualExpensesAmount: number
  pointsPurchasedAmount: number
}

type SortField = 'ordersProcessed' | 'ordersAmount' | 'cashoutsProcessed' | 'cashoutsAmount' | 'manualLoadsAmount' | 'manualExpensesAmount' | 'pointsPurchasedAmount'

export default function AdminStaffPerformancePage() {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('ordersProcessed')
  const [sortDesc, setSortDesc] = useState(true)

  const handlePresetDate = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const today = new Date()
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
    
    if (preset === 'today') {
      const d = today.toISOString().split('T')[0]
      setDateFrom(d)
      setDateTo(d)
    } else if (preset === 'yesterday') {
      const d = new Date(today)
      d.setDate(d.getDate() - 1)
      const dateStr = d.toISOString().split('T')[0]
      setDateFrom(dateStr)
      setDateTo(dateStr)
    } else if (preset === 'week') {
      const d = new Date(today)
      d.setDate(d.getDate() - 7)
      setDateFrom(d.toISOString().split('T')[0])
      setDateTo(today.toISOString().split('T')[0])
    } else if (preset === 'month') {
      const d = new Date(today)
      d.setDate(1) // First day of current month
      setDateFrom(d.toISOString().split('T')[0])
      setDateTo(today.toISOString().split('T')[0])
    } else if (preset === 'all') {
      setDateFrom('2024-01-01')
      setDateTo(today.toISOString().split('T')[0])
    }
  }

  const { data: stats, isLoading } = useQuery({
    queryKey: ['staff-performance', dateFrom, dateTo],
    queryFn: async () => {
      const staffProfiles = await fetchCustomers({ role: 'super_admin,admin,support_agent' })
      
      const fromISO = new Date(`${dateFrom}T00:00:00`).toISOString()
      const toISO   = new Date(`${dateTo}T23:59:59.999`).toISOString()

      const { data: orders } = await supabase
        .from('orders')
        .select('processed_by, base_amount')
        .in('status', ['completed', 'rejected'])
        .gte('updated_at', fromISO)
        .lte('updated_at', toISO)

      const { data: cashouts } = await supabase
        .from('cashout_requests')
        .select('processed_by, amount')
        .in('status', ['approved', 'rejected'])
        .gte('updated_at', fromISO)
        .lte('updated_at', toISO)

      const { data: logs } = await supabase
        .from('finance_logs')
        .select('created_by, type, amount')
        .gte('log_date', dateFrom)
        .lte('log_date', dateTo)

      const { data: purchases } = await supabase
        .from('game_point_purchases')
        .select('created_by, amount')
        .gte('created_at', fromISO)
        .lte('created_at', toISO)

      const results: StaffStats[] = staffProfiles.map(p => ({
        profile: p,
        ordersProcessed: 0,
        ordersAmount: 0,
        cashoutsProcessed: 0,
        cashoutsAmount: 0,
        manualLoadsAmount: 0,
        manualExpensesAmount: 0,
        pointsPurchasedAmount: 0
      }))

      orders?.forEach(o => {
        if (!o.processed_by) return
        const stat = results.find(r => r.profile.id === o.processed_by)
        if (stat) {
          stat.ordersProcessed++
          stat.ordersAmount += Number(o.base_amount) || 0
        }
      })

      cashouts?.forEach(c => {
        if (!c.processed_by) return
        const stat = results.find(r => r.profile.id === c.processed_by)
        if (stat) {
          stat.cashoutsProcessed++
          stat.cashoutsAmount += Number(c.amount) || 0
        }
      })

      logs?.forEach(l => {
        if (!l.created_by) return
        const stat = results.find(r => r.profile.id === l.created_by)
        if (stat) {
          if (l.type === 'manual_load') stat.manualLoadsAmount += Number(l.amount) || 0
          else if (l.type === 'other_expense') stat.manualExpensesAmount += Number(l.amount) || 0
        }
      })

      purchases?.forEach(p => {
        if (!p.created_by) return
        const stat = results.find(r => r.profile.id === p.created_by)
        if (stat) {
          stat.pointsPurchasedAmount += Number(p.amount) || 0
        }
      })

      return results
    }
  })

  const filteredAndSortedStats = useMemo(() => {
    if (!stats) return []
    let result = [...stats]

    // 1. Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(s => 
        s.profile.full_name?.toLowerCase().includes(q) || 
        s.profile.email?.toLowerCase().includes(q)
      )
    }

    // 2. Filter by Role
    if (roleFilter !== 'all') {
      result = result.filter(s => s.profile.role === roleFilter)
    }

    // 3. Sort
    result.sort((a, b) => {
      const valA = a[sortField]
      const valB = b[sortField]
      if (valA < valB) return sortDesc ? 1 : -1
      if (valA > valB) return sortDesc ? -1 : 1
      return 0
    })

    return result
  }, [stats, searchQuery, roleFilter, sortField, sortDesc])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDesc(!sortDesc)
    } else {
      setSortField(field)
      setSortDesc(true) // Default descending for new field
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => (
    <button onClick={() => toggleSort(field)} className="ml-1 inline-flex items-center justify-center p-1 hover:bg-white/10 rounded">
      <ArrowUpDown className={cn("h-3 w-3", sortField === field ? "text-primary" : "text-muted-foreground")} />
    </button>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            Staff Performance
          </h1>
          <p className="text-muted-foreground text-sm">Track team productivity and transactions</p>
        </div>
      </div>

      <div className="glass-card p-4 space-y-4">
        {/* Date Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b border-border pb-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handlePresetDate('today')} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">Today</button>
            <button onClick={() => handlePresetDate('yesterday')} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">Yesterday</button>
            <button onClick={() => handlePresetDate('week')} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">Last 7 Days</button>
            <button onClick={() => handlePresetDate('month')} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">This Month</button>
            <button onClick={() => handlePresetDate('all')} className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">All Time</button>
          </div>
          
          <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-border">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="game-input py-1 text-sm bg-transparent border-none" />
            <span className="text-muted-foreground self-center px-1">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="game-input py-1 text-sm bg-transparent border-none" />
          </div>
        </div>

        {/* Search & Role Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="game-input w-full pl-9"
            />
          </div>
          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="game-input w-full pl-9 appearance-none"
            >
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="support_agent">Support Agent</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-black/40 border-b border-border">
                <tr>
                  <th className="p-4 font-semibold text-white">Staff Member</th>
                  <th className="p-4 font-semibold text-white text-right">
                    Orders <SortIcon field="ordersProcessed" />
                  </th>
                  <th className="p-4 font-semibold text-white text-right">
                    Cashouts <SortIcon field="cashoutsProcessed" />
                  </th>
                  <th className="p-4 font-semibold text-white text-right">
                    Manual Loads <SortIcon field="manualLoadsAmount" />
                  </th>
                  <th className="p-4 font-semibold text-white text-right">
                    Manual Expenses <SortIcon field="manualExpensesAmount" />
                  </th>
                  <th className="p-4 font-semibold text-white text-right">
                    Points Purchased <SortIcon field="pointsPurchasedAmount" />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAndSortedStats?.map(stat => (
                  <tr key={stat.profile.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold flex-shrink-0">
                          {stat.profile.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-white">{stat.profile.full_name}</p>
                          <p className="text-xs text-muted-foreground uppercase">{stat.profile.role.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-bold text-white">{stat.ordersProcessed}</p>
                      <p className="text-xs text-primary">{formatCurrency(stat.ordersAmount)}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-bold text-white">{stat.cashoutsProcessed}</p>
                      <p className="text-xs text-destructive">{formatCurrency(stat.cashoutsAmount)}</p>
                    </td>
                    <td className="p-4 text-right font-mono text-neon-green">
                      {formatCurrency(stat.manualLoadsAmount)}
                    </td>
                    <td className="p-4 text-right font-mono text-orange-400">
                      {formatCurrency(stat.manualExpensesAmount)}
                    </td>
                    <td className="p-4 text-right font-mono text-blue-400">
                      {formatCurrency(stat.pointsPurchasedAmount)}
                    </td>
                  </tr>
                ))}
                {filteredAndSortedStats?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No matching staff found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
