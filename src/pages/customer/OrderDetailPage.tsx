import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchOrderById } from '@/services/orders'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { formatCurrency, formatDateTime, getOrderStatusClass, getOrderStatusLabel } from '@/lib/utils'
import { CheckCircle } from 'lucide-react'

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => fetchOrderById(id!),
    enabled: !!id,
  })

  if (isLoading) return <PageLoader />
  if (!order) return <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">Order not found</div>

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-gaming font-bold text-white">{(order as any).order_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={getOrderStatusClass((order as any).status)}>{getOrderStatusLabel((order as any).status)}</span>
            <span className="text-xs text-muted-foreground">{formatDateTime((order as any).created_at)}</span>
          </div>
        </div>
        {(order as any).status_history?.length > 0 && (
          <div className="game-card p-6 mb-6">
            <h2 className="font-semibold text-white mb-4">Order Timeline</h2>
            <div className="space-y-4">
              {(order as any).status_history.map((h: any, i: number) => (
                <div key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <CheckCircle className="h-5 w-5 text-neon-green" />
                    {i < (order as any).status_history.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-foreground">{getOrderStatusLabel(h.status)}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</p>
                    {h.note && <p className="text-xs text-muted-foreground mt-1">{h.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="game-card p-6 mb-6">
          <h2 className="font-semibold text-white mb-4">Order Details</h2>
          <div className="space-y-2">
            {[{ label: 'Game', value: (order as any).game?.name }, { label: 'Username', value: (order as any).username }, { label: 'Payment', value: (order as any).payment_method?.name }]
              .map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-border text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-foreground">{value}</span>
                </div>
              ))}
          </div>
        </div>
        <div className="bonus-preview mb-6">
          <h2 className="font-semibold text-white mb-4">Bonus Breakdown</h2>
          <div className="bonus-line"><span className="text-muted-foreground">You Paid</span><span className="font-semibold">{formatCurrency((order as any).base_amount)}</span></div>
          {(order as any).regular_bonus_pct > 0 && (
            <div className="bonus-line"><span className="text-muted-foreground">Regular Bonus ({(order as any).regular_bonus_pct}%)</span><span className="text-neon-green font-semibold">+{formatCurrency((order as any).regular_bonus_amount)}</span></div>
          )}
          {(order as any).promo_bonus_pct > 0 && (
            <div className="bonus-line"><span className="text-muted-foreground">Promo Bonus ({(order as any).promo_bonus_pct}%)</span><span className="text-neon-gold font-semibold">+{formatCurrency((order as any).promo_bonus_amount)}</span></div>
          )}
          <div className="bonus-total"><span>Total Game Credit</span><span className="text-xl text-gradient-green">{Math.ceil((order as any).final_game_credit)}</span></div>
        </div>
      </div>
    </div>
  )
}
