import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchFinanceReport, addFinanceLog, deleteFinanceLog } from '@/services/finance'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatTime } from '@/lib/utils'
import { toast } from 'sonner'
import { Calculator, Copy, Trash2, Plus, DollarSign, Wallet, ArrowDownRight, ArrowUpRight, Users, ShoppingBag } from 'lucide-react'

export default function AdminReportsPage() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  
  // Default to today
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0])
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0])
  
  const [isAdding, setIsAdding] = useState(false)
  const [type, setType] = useState<'cashout' | 'point_purchase' | 'other_expense' | 'manual_load'>('cashout')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('')
  const [note, setNote] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['finance', dateFrom, dateTo],
    queryFn: () => fetchFinanceReport(dateFrom, dateTo),
  })

  const addMutation = useMutation({
    mutationFn: (e: React.FormEvent) => {
      e.preventDefault()
      if (!amount || isNaN(Number(amount))) throw new Error('Invalid amount')
      return addFinanceLog({
        type,
        amount: Number(amount),
        method,
        note,
        log_date: dateTo, // default to end date
        created_by: profile!.id
      })
    },
    onSuccess: () => {
      toast.success('Log added')
      setIsAdding(false)
      setAmount('')
      setMethod('')
      setNote('')
      qc.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (e: any) => toast.error(e.message)
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFinanceLog(id),
    onSuccess: () => {
      toast.success('Log deleted')
      qc.invalidateQueries({ queryKey: ['finance'] })
    }
  })

  const copyReport = () => {
    if (!data) return
    const dateRange = dateFrom === dateTo ? dateFrom : dateFrom + ' to ' + dateTo
    let report = `📋 Finance Report (${dateRange})\n`
    report += `\n🟢 TOTAL LOADS: ${formatCurrency(data.totalLoads)}`
    
    Object.entries(data.loadsByMethod).forEach(([m, amt]) => {
      report += `\n  • ${m}: ${formatCurrency(amt as number)}`
    })

    report += `\n\n🔴 CASHOUTS: ${formatCurrency(data.totalCashouts)}`
    report += `\n🟠 POINT PURCHASES: ${formatCurrency(data.totalPurchases)}`
    if (data.totalExpenses > 0) report += `\n🟠 OTHER EXPENSES: ${formatCurrency(data.totalExpenses)}`
    
    report += `\n\n💰 NET PROFIT: ${formatCurrency(data.netProfit)}`

    navigator.clipboard.writeText(report)
    toast.success('Report copied to clipboard')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-neon-gold" />
            Finance & Reports
          </h1>
          <p className="text-muted-foreground text-sm">Track loads, point purchases, and cashouts</p>
        </div>
        <div className="flex gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="game-input py-1" />
          <span className="text-muted-foreground self-center">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="game-input py-1" />
        </div>
      </div>

      {isLoading || !data ? (
        <div className="h-64 skeleton rounded-xl" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total Loads */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-neon-green/20 text-neon-green"><ArrowDownRight className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-muted-foreground">Total Loads</p>
            </div>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(data.totalLoads)}</h3>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {Object.entries(data.loadsByMethod).map(([m, amt]) => (
                <div key={m} className="flex justify-between"><span>{m}:</span><span className="text-white">{formatCurrency(amt as number)}</span></div>
              ))}
            </div>
          </div>

          {/* 2. Agent Commission */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-orange-400/20 text-orange-400"><Users className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-muted-foreground">Agent Commission</p>
            </div>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(data.totalAgentCommissions)}</h3>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {Object.entries(data.commissionsByMethod || {}).map(([m, amt]) => (
                <div key={m} className="flex justify-between"><span>{m}:</span><span className="text-white">{formatCurrency(amt as number)}</span></div>
              ))}
            </div>
          </div>

          {/* 3. Game Point Purchases */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-blue-400/20 text-blue-400"><ShoppingBag className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-muted-foreground">Game Points (Cost)</p>
            </div>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(data.totalPurchases)}</h3>
          </div>

          {/* 4. Total Cashouts */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-destructive/20 text-destructive"><ArrowUpRight className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-muted-foreground">Total Cashouts</p>
            </div>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(data.totalCashouts)}</h3>
            {data.totalExpenses > 0 && (
              <p className="text-xs text-muted-foreground mt-2">+{formatCurrency(data.totalExpenses)} other expenses</p>
            )}
          </div>

          {/* 5. Net Profit */}
          <div className="glass-card p-4 border-t-2 border-neon-gold">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-neon-gold/20 text-neon-gold"><DollarSign className="h-5 w-5" /></div>
              <p className="text-sm font-semibold text-muted-foreground">Net Profit</p>
            </div>
            <h3 className="text-2xl font-bold text-white">{formatCurrency(data.netProfit)}</h3>
            <p className="text-[10px] text-muted-foreground mt-2">
              Loads - Agent Comm - Points - Cashouts
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setIsAdding(!isAdding)} className="btn-neon px-4 py-2 text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Expense / Cashout
        </button>
        <button onClick={copyReport} className="btn-ghost-neon px-4 py-2 text-sm flex items-center gap-2 text-neon-gold hover:bg-neon-gold/10 hover:border-neon-gold/30 hover:text-neon-gold">
          <Copy className="h-4 w-4" /> Copy Report
        </button>
      </div>

      {isAdding && (
        <form onSubmit={addMutation.mutate} className="glass-card p-4 flex flex-col md:flex-row gap-3 items-end bg-black/40">
          <div className="flex-1 w-full">
            <label className="block text-xs text-muted-foreground mb-1">Type</label>
            <select value={type} onChange={e => setType(e.target.value as any)} className="game-input w-full">
              <option value="cashout">Cashout</option>
              <option value="point_purchase">Point Purchase</option>
              <option value="other_expense">Other Expense</option>
              <option value="manual_load">Manual Load (Deposit)</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs text-muted-foreground mb-1">Amount ($)</label>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="game-input w-full" required />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs text-muted-foreground mb-1">Method / Source (Optional)</label>
            <input type="text" value={method} onChange={e => setMethod(e.target.value)} placeholder="e.g. CashApp, Chime" className="game-input w-full" />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs text-muted-foreground mb-1">Note (Optional)</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Player name, etc." className="game-input w-full" />
          </div>
          <button type="submit" disabled={addMutation.isPending} className="btn-neon px-6 py-2.5">Save</button>
        </form>
      )}

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-border bg-black/20">
          <h2 className="font-semibold text-white">Recent Manual Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/5">
                <th className="p-3 font-medium text-muted-foreground">Date</th>
                <th className="p-3 font-medium text-muted-foreground">Type</th>
                <th className="p-3 font-medium text-muted-foreground">Amount</th>
                <th className="p-3 font-medium text-muted-foreground">Method</th>
                <th className="p-3 font-medium text-muted-foreground">Note</th>
                <th className="p-3 font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {data?.logs.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No logs in this date range</td></tr>
              ) : (
                data?.logs.map((log: any) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/5 transition-colors">
                    <td className="p-3 whitespace-nowrap">{log.log_date}</td>
                    <td className="p-3">
                      <span className="capitalize">{log.type.replace('_', ' ')}</span>
                    </td>
                    <td className="p-3 font-medium text-white">{formatCurrency(log.amount)}</td>
                    <td className="p-3 text-muted-foreground">{log.method || '-'}</td>
                    <td className="p-3 text-muted-foreground">{log.note || '-'}</td>
                    <td className="p-3">
                      <button onClick={() => { if(window.confirm('Delete this log?')) deleteMutation.mutate(log.id) }} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
