import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Gamepad2, Wallet, CheckCircle, Loader2, Clock, XCircle, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { fetchPaymentMethods } from '@/services/payments'
import { createCashoutRequest, fetchMyCashoutRequests } from '@/services/cashout'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils'
import type { PaymentMethod } from '@/types'

export default function CashoutPage() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const [submitted, setSubmitted] = useState(false)
  const [submittedNumber, setSubmittedNumber] = useState('')
  const [gameName, setGameName] = useState('')
  const [gameUsername, setGameUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('')
  const [paymentDetail, setPaymentDetail] = useState('')

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: fetchPaymentMethods,
  })

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-cashout-requests'],
    queryFn: fetchMyCashoutRequests,
  })

  const submitMutation = useMutation({
    mutationFn: async () => {
      const selectedPM = (paymentMethods as PaymentMethod[]).find((m) => m.id === selectedMethod)
      if (!selectedPM) throw new Error('Please select a payment method')
      const request = await createCashoutRequest({
        game_name: gameName,
        game_username: gameUsername,
        amount: parseFloat(amount),
        payment_method_name: selectedPM.name,
        payment_detail: paymentDetail,
      })
      try {
        await supabase.functions.invoke('send-cashout-telegram', {
          body: {
            request_number: request.request_number,
            customer_name: profile?.full_name || profile?.username || 'Customer',
            game_name: request.game_name,
            game_username: request.game_username,
            amount: request.amount,
            payment_method_name: request.payment_method_name,
            payment_detail: request.payment_detail,
          },
        })
      } catch (err) {
        console.warn('Telegram notify failed:', err)
      }
      return request
    },
    onSuccess: (data) => {
      setSubmittedNumber(data.request_number)
      setSubmitted(true)
      qc.invalidateQueries({ queryKey: ['my-cashout-requests'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to submit request'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMethod) { toast.error('Please select a payment method'); return }
    submitMutation.mutate()
  }

  const handleReset = () => {
    setSubmitted(false)
    setGameName('')
    setGameUsername('')
    setAmount('')
    setSelectedMethod('')
    setPaymentDetail('')
    setSubmittedNumber('')
  }

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="h-4 w-4 text-neon-green" />
    if (status === 'rejected') return <XCircle className="h-4 w-4 text-destructive" />
    return <Clock className="h-4 w-4 text-yellow-400" />
  }

  const getStatusClass = (status: string) => {
    if (status === 'approved') return 'bg-neon-green/20 text-neon-green'
    if (status === 'rejected') return 'bg-destructive/20 text-destructive'
    return 'bg-yellow-400/20 text-yellow-400'
  }

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-lg pb-24 lg:pb-8">
        <div className="glass-card p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-neon-green/20 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-neon-green" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Request Submitted!</h2>
          <p className="text-muted-foreground text-sm mb-1">Your cashout request has been received.</p>
          <p className="text-xs text-primary font-mono mb-6">{submittedNumber}</p>
          <p className="text-sm text-muted-foreground mb-6">
            Our team will review and process your payment. You will be notified once approved.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={handleReset} className="btn-neon px-6 py-2">New Request</button>
            <Link to="/dashboard" className="btn-ghost-neon px-6 py-2">Dashboard</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-white mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <h1 className="text-2xl font-gaming font-bold text-gradient-white flex items-center gap-2">
          <ArrowDownToLine className="h-6 w-6 text-primary" /> Cashout Request
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Submit a cashout request for your game balance</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" /> Game Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Game Name</label>
                  <input type="text" value={gameName} onChange={(e) => setGameName(e.target.value)}
                    placeholder="e.g., Fire Kirin" className="game-input w-full" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Game Username</label>
                  <input type="text" value={gameUsername} onChange={(e) => setGameUsername(e.target.value)}
                    placeholder="Your in-game username" className="game-input w-full" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cashout Amount ($)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" min="1" step="0.01" className="game-input w-full" required />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> Receive Payment Via
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(paymentMethods as PaymentMethod[]).map((method) => (
                  <button key={method.id} type="button" onClick={() => setSelectedMethod(method.id)}
                    className={cn(
                      'flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-2',
                      selectedMethod === method.id
                        ? 'border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]'
                        : 'border-border hover:border-primary/50 bg-white/5'
                    )}>
                    {method.logo_url
                      ? <img src={method.logo_url} alt={method.name} className="h-8 w-auto object-contain" />
                      : <Wallet className="h-6 w-6 text-muted-foreground" />
                    }
                    <span className="text-xs font-medium text-center">{method.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedMethod && (
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Your {(paymentMethods as PaymentMethod[]).find((m) => m.id === selectedMethod)?.name} Number / Tag / ID
                </label>
                <input type="text" value={paymentDetail} onChange={(e) => setPaymentDetail(e.target.value)}
                  placeholder="Enter your account number, tag, or ID" className="game-input w-full" required />
                <p className="text-xs text-yellow-400 mt-1.5">
                  Double-check your details. Payment will be sent to this account.
                </p>
              </div>
            )}

            <button type="submit" disabled={submitMutation.isPending}
              className="btn-neon w-full py-3 flex items-center justify-center gap-2">
              {submitMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                : <><ArrowDownToLine className="h-4 w-4" /> Submit Cashout Request</>
              }
            </button>
          </form>
        </div>

        <div>
          <div className="glass-card p-5">
            <h3 className="font-semibold text-white text-sm mb-4">Previous Requests</h3>
            {myRequests.length === 0 ? (
              <div className="text-center py-8">
                <ArrowDownToLine className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No requests yet</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(myRequests as any[]).map((req) => (
                  <div key={req.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-primary">{req.request_number}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1', getStatusClass(req.status))}>
                        {getStatusIcon(req.status)} {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-white font-medium">{req.game_name} - {req.game_username}</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-xs text-muted-foreground">{req.payment_method_name}</span>
                      <span className="text-xs font-bold text-white">{formatCurrency(req.amount)}</span>
                    </div>
                    {req.admin_note && (
                      <p className="text-xs text-muted-foreground mt-1.5 border-t border-white/10 pt-1.5">
                        Note: {req.admin_note}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(req.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
