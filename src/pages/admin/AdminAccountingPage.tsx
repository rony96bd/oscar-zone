import { useQuery } from '@tanstack/react-query'
import { fetchAllCycles } from '@/services/accounting'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Calendar, DollarSign, ArrowDownRight, Users, TrendingUp } from 'lucide-react'

export default function AdminAccountingPage() {
  const { data: cycles, isLoading } = useQuery({
    queryKey: ['accounting-cycles'],
    queryFn: fetchAllCycles,
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 skeleton rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-gaming font-bold text-white">Settlement History</h1>
        <p className="text-muted-foreground text-sm">Past accounting cycles and their profit/loss records</p>
      </div>

      <div className="space-y-4">
        {cycles?.map((cycle) => (
          <div key={cycle.id} className="glass-card p-6 relative overflow-hidden group">
            {cycle.status === 'active' && (
              <div className="absolute top-0 right-0 px-3 py-1 bg-neon-green/20 text-neon-green text-[10px] font-bold uppercase rounded-bl-lg">
                Active
              </div>
            )}
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6 pb-6 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-6 w-6 text-neon-gold" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {new Date(cycle.start_date).toLocaleDateString()} - {cycle.end_date ? new Date(cycle.end_date).toLocaleDateString() : 'Present'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {new Date(cycle.start_date).toLocaleTimeString()} to {cycle.end_date ? new Date(cycle.end_date).toLocaleTimeString() : '...'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Settled By</p>
                <p className="font-medium text-white">{cycle.closed_by_profile?.full_name || (cycle.status === 'active' ? '-' : 'Unknown')}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3 w-3 text-primary" />
                  Total Deposits
                </div>
                <div className="text-lg font-semibold text-white">{formatCurrency(cycle.total_deposits)}</div>
              </div>
              
              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <ArrowDownRight className="h-3 w-3 text-neon-green" />
                  Total Cashouts
                </div>
                <div className="text-lg font-semibold text-white">{formatCurrency(cycle.total_cashouts)}</div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Users className="h-3 w-3 text-orange-400" />
                  Agent Commissions
                </div>
                <div className="text-lg font-semibold text-white">{formatCurrency(cycle.total_agent_commissions)}</div>
              </div>

              <div className="pl-4 border-l border-border">
                <div className="flex items-center gap-2 text-xs text-neon-gold mb-1 font-bold">
                  <TrendingUp className="h-3 w-3" />
                  Net Profit / Loss
                </div>
                <div className="text-xl font-bold text-neon-gold">{formatCurrency(cycle.net_profit)}</div>
              </div>
            </div>
          </div>
        ))}
        {cycles?.length === 0 && (
          <div className="text-center p-12 glass-card text-muted-foreground">
            No accounting cycles found.
          </div>
        )}
      </div>
    </div>
  )
}
