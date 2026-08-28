import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, Gamepad2, Wallet, CheckCircle, Loader2, Clock, XCircle, ChevronLeft, AlertTriangle, Info, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { fetchPaymentMethods } from '@/services/payments'
import { createCashoutRequest, fetchMyCashoutRequests } from '@/services/cashout'
import { fetchCustomerGames } from '@/services/games'
import { fetchActiveCashoutRules, fetchCashoutTerms, findApplicableRule, calculateCashoutLimits } from '@/services/cashoutRules'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils'
import { ScreenshotUpload } from '@/components/customer/ScreenshotUpload'
import type { PaymentMethod, CustomerGame } from '@/types'

export default function CashoutPage() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  
  const [submitted, setSubmitted] = useState(false)
  const [submittedNumber, setSubmittedNumber] = useState('')
  
  const [selectedGameId, setSelectedGameId] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedMethod, setSelectedMethod] = useState('')
  const [paymentDetail, setPaymentDetail] = useState('')
  const [qrCodePath, setQrCodePath] = useState<string | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)

  const { data: myGames = [] } = useQuery({
    queryKey: ['my-games', profile?.id],
    queryFn: () => fetchCustomerGames(profile!.id),
    enabled: !!profile?.id
  })

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: fetchPaymentMethods,
  })

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-cashout-requests'],
    queryFn: fetchMyCashoutRequests,
  })

  const { data: cashoutRules = [] } = useQuery({
    queryKey: ['cashout-rules'],
    queryFn: fetchActiveCashoutRules,
  })

  const { data: cashoutTerms = '' } = useQuery({
    queryKey: ['cashout-terms'],
    queryFn: fetchCashoutTerms,
  })

  // Get the last deposit from approved/completed orders (scoped to selected game if any)
  const { data: lastDepositAmount = 0 } = useQuery({
    queryKey: ['my-last-deposit', profile?.id, selectedGameId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select('base_amount')
        .eq('user_id', profile!.id)
        .in('status', ['completed', 'payment_verified', 'processing'])
        .order('created_at', { ascending: false })
        .limit(1)
        
      if (selectedGameId) {
        query = query.eq('customer_game_id', selectedGameId)
      }
      
      const { data } = await query.maybeSingle()
      return data ? Number(data.base_amount) : 0
    },
    enabled: !!profile?.id
  })

  // Determine applicable rule and limits
  const applicableRule = useMemo(() => findApplicableRule(lastDepositAmount, cashoutRules as any), [lastDepositAmount, cashoutRules])
  const cashoutLimits = useMemo(() => applicableRule ? calculateCashoutLimits(applicableRule as any, lastDepositAmount) : null, [applicableRule, lastDepositAmount])

  const submitMutation = useMutation({
    mutationFn: async () => {
      const selectedPM = (paymentMethods as PaymentMethod[]).find((m) => m.id === selectedMethod)
      if (!selectedPM) throw new Error('Please select a payment method')
      
      const selectedGame = (myGames as CustomerGame[]).find(g => g.id === selectedGameId)
      if (!selectedGame) throw new Error('Please select a game')

      const request = await createCashoutRequest({
        game_name: selectedGame.game?.name || 'Unknown',
        game_username: selectedGame.username,
        amount: parseFloat(amount),
        payment_method_name: selectedPM.name,
        payment_detail: paymentDetail,
        qr_code_path: qrCodePath || undefined
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
            qr_code_path: request.qr_code_path
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
    if (!selectedGameId) { toast.error('Please select a game'); return }
    if (!selectedMethod) { toast.error('Please select a payment method'); return }
    
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) { toast.error('Please enter a valid amount'); return }

    // Validate against cashout rules
    if (cashoutLimits) {
      if (parsedAmount < cashoutLimits.min) {
        toast.error(`Minimum cashout amount is ${formatCurrency(cashoutLimits.min)} based on your last deposit.`)
        return
      }
      if (parsedAmount > cashoutLimits.max) {
        toast.error(`Maximum cashout amount is ${formatCurrency(cashoutLimits.max)} based on your last deposit.`)
        return
      }
    }

    submitMutation.mutate()
  }

  const handleReset = () => {
    setSubmitted(false)
    setSelectedGameId('')
    setAmount('')
    setSelectedMethod('')
    setPaymentDetail('')
    setQrCodePath(null)
    setQrCodeUrl(null)
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
          {submitted ? (
            <div className="glass-card p-8 text-center h-full flex flex-col justify-center min-h-[400px]">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-neon-green/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-neon-green" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Request Submitted!</h2>
              <p className="text-muted-foreground text-sm mb-1">Your cashout request has been received.</p>
              <p className="text-xs text-primary font-mono mb-6">{submittedNumber}</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Our team will review and process your payment. You will be notified once approved.
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={handleReset} className="btn-neon px-6 py-2">Make Another Request</button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
            
            {/* 1. Select Game */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-primary" /> 1. Select Game Account
              </h3>
              
              {(myGames as CustomerGame[]).length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-white/20 text-center">
                  <p className="text-sm text-muted-foreground mb-2">You don't have any active game accounts.</p>
                  <Link to="/load" className="text-primary text-sm font-medium hover:underline">
                    Load a game to get started
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(myGames as CustomerGame[]).map((cg) => (
                    <button
                      key={cg.id}
                      type="button"
                      onClick={() => setSelectedGameId(cg.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        selectedGameId === cg.id
                          ? "border-primary bg-primary/10 shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)]"
                          : "border-border hover:border-primary/50 bg-white/5"
                      )}
                    >
                      {cg.game?.logo_url ? (
                        <img src={cg.game.logo_url} alt={cg.game.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
                          <Gamepad2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{cg.game?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{cg.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Amount */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <ArrowDownToLine className="h-4 w-4 text-primary" /> 2. Cashout Amount
              </h3>

              {/* Limits info box */}
              {cashoutLimits ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/30 mb-3">
                  <Info className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Based on your <span className="text-white font-semibold">{formatCurrency(lastDepositAmount)}</span> last deposit — 
                    Min: <span className="text-neon-green font-bold">{formatCurrency(cashoutLimits.min)}</span> · 
                    Max: <span className="text-neon-gold font-bold">{formatCurrency(cashoutLimits.max)}</span>
                  </p>
                </div>
              ) : lastDepositAmount > 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mb-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  <p className="text-xs text-yellow-400">No cashout rule found for your deposit amount of {formatCurrency(lastDepositAmount)}. Contact support.</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border mb-3">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">No recent deposit found. Load the game first to be eligible for cashout.</p>
                </div>
              )}

              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={cashoutLimits ? `Min: $${cashoutLimits.min} · Max: $${cashoutLimits.max}` : 'Enter amount'}
                min={cashoutLimits?.min ?? 1}
                max={cashoutLimits?.max}
                step="0.01" className="game-input w-full" required />
            </div>

            {/* 3. Payment Method */}
            <div>
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" /> 3. Receive Payment Via
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

            {/* 4. Payment Details */}
            {selectedMethod && (
              <div className="space-y-4 pt-4 border-t border-white/10">
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
                
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Your QR Code (Optional)
                  </label>
                  <ScreenshotUpload 
                    onUpload={(key, url) => {
                      setQrCodePath(key)
                      setQrCodeUrl(url)
                    }}
                    onClear={() => {
                      setQrCodePath(null)
                      setQrCodeUrl(null)
                    }}
                    uploaded={!!qrCodePath}
                    orderId={`csh_${Date.now()}`}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Upload your payment QR code for faster processing.</p>
                </div>
              </div>
            )}

            <button type="submit" disabled={submitMutation.isPending || !selectedGameId || !selectedMethod}
              className="btn-neon w-full py-3 flex items-center justify-center gap-2 mt-6">
              {submitMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                : <><ArrowDownToLine className="h-4 w-4" /> Submit Cashout Request</>
              }
            </button>
            </form>
          )}
        </div>

        <div>
          {/* Cashout Policy Panel */}
          <div className="glass-card p-5 mb-5">
            <h3 className="font-semibold text-white text-sm mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-neon-green" /> Cashout Policy
            </h3>
            {cashoutRules.length > 0 ? (
              <>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white/5 text-muted-foreground">
                        <th className="text-left py-2 px-3 font-semibold">Loaded</th>
                        <th className="text-center py-2 px-3 font-semibold">Min</th>
                        <th className="text-center py-2 px-3 font-semibold">Max</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(cashoutRules as any[]).map((rule: any) => {
                        const isApplicable = lastDepositAmount >= rule.deposit_min && lastDepositAmount <= rule.deposit_max
                        return (
                          <tr key={rule.id} className={cn(
                            "transition-colors",
                            isApplicable ? "bg-neon-green/10 text-white" : "text-muted-foreground hover:bg-white/5"
                          )}>
                            <td className="py-2 px-3 font-medium">
                              {isApplicable && <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon-green mr-1.5 align-middle" />}
                              ${rule.deposit_min} - ${rule.deposit_max}
                            </td>
                            <td className="py-2 px-3 text-center text-neon-green font-semibold">
                              {rule.min_type === 'fixed'
                                ? `$${rule.min_fixed}`
                                : `Dep × ${rule.min_multiplier}`}
                            </td>
                            <td className="py-2 px-3 text-center text-neon-gold font-semibold">
                              Dep × {rule.max_multiplier}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {cashoutTerms && (
                  <div className="mt-4 p-3 rounded-xl bg-white/5 border border-border">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Terms & Conditions</p>
                    {cashoutTerms.split('\n').filter(Boolean).map((line: string, i: number) => (
                      <p key={i} className="text-[10px] text-muted-foreground leading-relaxed">{line}</p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">No policy rules set yet.</p>
            )}
          </div>

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
