import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchCustomers } from '@/services/admin'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency } from '@/lib/utils'
import { Activity } from 'lucide-react'
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

export default function AdminStaffPerformancePage() {
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['staff-performance', dateFrom, dateTo],
    queryFn: async () => {
      // Fetch all staff and admins
      const staffProfiles = await fetchCustomers({ role: 'super_admin,admin,support_agent' })
      
      const fromISO = new Date(`${dateFrom}T00:00:00`).toISOString()
      const toISO   = new Date(`${dateTo}T23:59:59.999`).toISOString()

      // Fetch completed orders
      const { data: orders } = await supabase
        .from('orders')
        .select('processed_by, base_amount')
        .in('status', ['completed', 'rejected'])
        .gte('updated_at', fromISO)
        .lte('updated_at', toISO)

      // Fetch cashouts
      const { data: cashouts } = await supabase
        .from('cashout_requests')
        .select('processed_by, amount')
        .in('status', ['approved', 'rejected'])
        .gte('updated_at', fromISO)
        .lte('updated_at', toISO)

      // Fetch finance logs
      const { data: logs } = await supabase
        .from('finance_logs')
        .select('created_by, type, amount')
        .gte('log_date', dateFrom)
        .lte('log_date', dateTo)

      // Fetch point purchases
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

      return results.sort((a, b) => b.ordersProcessed - a.ordersProcessed)
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            Staff Performance
          </h1>
          <p className="text-muted-foreground text-sm">Track team productivity and transactions</p>
        </div>
        <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl border border-border">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="game-input py-1 text-sm bg-transparent border-none" />
          <span className="text-muted-foreground self-center px-1">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="game-input py-1 text-sm bg-transparent border-none" />
        </div>
      </div>

      {isLoading ? <PageLoader /> : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-black/40 border-b border-border">
                <tr>
                  <th className="p-4 font-semibold text-white">Staff Member</th>
                  <th className="p-4 font-semibold text-white text-right">Orders Handled</th>
                  <th className="p-4 font-semibold text-white text-right">Cashouts Handled</th>
                  <th className="p-4 font-semibold text-white text-right">Manual Loads</th>
                  <th className="p-4 font-semibold text-white text-right">Manual Expenses</th>
                  <th className="p-4 font-semibold text-white text-right">Points Purchased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stats?.map(stat => (
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
                {stats?.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No staff data found.
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
