import { useState } from 'react'
import { X, Trophy, MessageSquare, Loader2, Star } from 'lucide-react'
import { submitTestimonial } from '@/services/engagement'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'

interface ShareCashoutModalProps {
  cashoutRequest: {
    id: string
    game_name: string
    amount: number
  }
  onClose: () => void
  onSuccess: () => void
}

export function ShareCashoutModal({ cashoutRequest, onClose, onSuccess }: ShareCashoutModalProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      await submitTestimonial({
        cashout_request_id: cashoutRequest.id,
        game_name: cashoutRequest.game_name,
        amount: cashoutRequest.amount,
        message: message.trim(),
      })
      toast.success('Awesome! Your review has been submitted for approval.')
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="relative w-full max-w-md bg-game-card border border-white/10 rounded-2xl p-6 shadow-2xl animate-scale-in overflow-hidden">
        
        {/* Decorative background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/50 hover:text-white transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="text-center mb-6 relative z-10">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-neon-gold/20 mb-3 shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <Trophy className="h-6 w-6 text-neon-gold" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Share Your Win!</h2>
          <p className="text-xs text-muted-foreground">
            Share your <strong className="text-neon-gold">{formatCurrency(cashoutRequest.amount)}</strong> cashout on {cashoutRequest.game_name} to the Winner's Circle and get a free play reward once approved!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Your Message / Review (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Fast cashout! Love playing here."
              className="game-input w-full min-h-[100px] resize-y text-sm"
              maxLength={200}
            />
            <p className="text-[10px] text-right text-muted-foreground mt-1">
              {message.length}/200
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-neon-gold hover:bg-neon-gold/90 text-black font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,215,0,0.3)]"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Star className="h-5 w-5 fill-current" />
                Share & Get Reward
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
