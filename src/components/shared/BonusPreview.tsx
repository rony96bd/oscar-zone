import { TrendingUp, Gift, Zap } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { LoadingSpinner } from './LoadingSpinner'

interface BonusPreviewData {
  regular_bonus_pct: number
  regular_bonus_amount: number
  promo_bonus_pct: number
  promo_bonus_amount: number
  total_bonus: number
  final_credit: number
  promotion_name: string | null
}

interface BonusPreviewProps {
  amount: number
  bonus: BonusPreviewData | null | undefined
  isLoading?: boolean
}

export function BonusPreview({ amount, bonus, isLoading }: BonusPreviewProps) {
  if (!amount || amount < 10) return null

  return (
    <div className="bonus-preview animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-neon-gold" />
        <span className="text-sm font-semibold text-neon-gold">Bonus Breakdown</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <LoadingSpinner size="sm" />
        </div>
      ) : bonus ? (
        <>
          <div className="bonus-line">
            <span className="text-muted-foreground">You Load</span>
            <span className="font-semibold text-foreground">{formatCurrency(amount)}</span>
          </div>

          {bonus.regular_bonus_pct > 0 && (
            <div className="bonus-line">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Regular Bonus ({bonus.regular_bonus_pct}%)
              </span>
              <span className="font-semibold text-neon-green">+{formatCurrency(bonus.regular_bonus_amount)}</span>
            </div>
          )}

          {bonus.promo_bonus_pct > 0 && (
            <div className="bonus-line">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Gift className="h-3.5 w-3.5" />
                {bonus.promotion_name || 'Promo Bonus'} ({bonus.promo_bonus_pct}%)
              </span>
              <span className="font-semibold text-neon-gold">+{formatCurrency(bonus.promo_bonus_amount)}</span>
            </div>
          )}

          <div className="bonus-total">
            <span className="text-foreground">Total Game Credit</span>
            <span className="text-xl text-gradient-green">{formatCurrency(bonus.final_credit)}</span>
          </div>
        </>
      ) : (
        <div className="text-center text-sm text-muted-foreground py-2">
          Calculating bonus...
        </div>
      )}
    </div>
  )
}
