import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Zap, ChevronRight, Check, Copy, ExternalLink, Loader2, CheckCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { fetchCustomerGames } from '@/services/games'
import { fetchPaymentMethods, uploadPaymentScreenshot } from '@/services/payments'
import { BonusPreview } from '@/components/shared/BonusPreview'
import { ScreenshotUpload } from '@/components/shared/ScreenshotUpload'
import { cn, formatCurrency, copyToClipboard } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { fetchGames } from '@/services/games'
import { calculateBonusPreview } from '@/services/orders'

const STEPS = ['Game', 'Amount', 'Payment', 'Review']

export default function LoadGamePage() {
  const { profile } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const locationState = location.state as any

  const [step, setStep] = useState(1)
  const [selectedGameId, setSelectedGameId] = useState(locationState?.gameId || '')
  const [selectedCgId, setSelectedCgId] = useState(locationState?.customerGameId || '')
  const [username, setUsername] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [selectedPaymentId, setSelectedPaymentId] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedOrder, setSubmittedOrder] = useState<any>(null)
  const [copiedTag, setCopiedTag] = useState(false)

  const { data: myGames = [] } = useQuery({
    queryKey: ['customer-games', profile?.id],
    queryFn: () => fetchCustomerGames(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: allGames = [] } = useQuery({
    queryKey: ['games', 'active'],
    queryFn: fetchGames,
  })

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ['payment-methods', 'active'],
    queryFn: fetchPaymentMethods,
  })

  const { data: bonusPreview, isLoading: bonusLoading } = useQuery({
    queryKey: ['bonus-preview', selectedGameId, amount],
    queryFn: () => calculateBonusPreview(selectedGameId, amount, profile?.id),
    enabled: !!selectedGameId && amount >= 10,
    staleTime: 30000,
  })

  const selectedGame = allGames.find((g: any) => g.id === selectedGameId)
  const selectedPayment = paymentMethods.find((p: any) => p.id === selectedPaymentId)

  useEffect(() => {
    if (selectedCgId && !username) {
      const cg = myGames.find((c: any) => c.id === selectedCgId)
      if (cg) setUsername((cg as any).username)
    }
  }, [selectedCgId, myGames])

  const handleCopyTag = async (tag: string) => {
    await copyToClipboard(tag)
    setCopiedTag(true)
    setTimeout(() => setCopiedTag(false), 2000)
  }

  const handleSubmit = async () => {
    if (!screenshotFile) { toast.error('Please upload your payment screenshot'); return }
    setIsSubmitting(true)
    try {
      const tempId = crypto.randomUUID()
      const screenshotPath = await uploadPaymentScreenshot(screenshotFile, tempId, profile?.id || null)
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: { game_id: selectedGameId, username, base_amount: amount, payment_method_id: selectedPaymentId, payment_screenshot_path: screenshotPath, customer_game_id: selectedCgId || undefined },
      })
      if (error) throw error
      setSubmittedOrder(data.order)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit order')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submittedOrder) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto glass-card p-8 text-center animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-green/20 border border-neon-green/30 mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-neon-green" />
          </div>
          <h2 className="text-2xl font-gaming font-bold text-white mb-2">Order Submitted!</h2>
          <p className="text-muted-foreground mb-4">We're processing your payment.</p>
          <div className="bg-muted/30 rounded-xl p-4 mb-6">
            <p className="text-xs text-muted-foreground">Order Number</p>
            <p className="font-mono font-bold text-primary text-lg">{submittedOrder.order_number}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/orders')} className="btn-ghost-neon flex-1 py-2.5 text-sm">View Orders</button>
            <button onClick={() => { setSubmittedOrder(null); setStep(1); setAmount(0); setScreenshotFile(null) }} className="btn-neon flex-1 py-2.5 text-sm">New Order</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-gaming font-bold text-gradient-white">Load Game</h1>
        </div>
        <div className="flex items-center gap-2 mb-6">
          {STEPS.map((label, i) => {
            const num = i + 1; const isActive = step === num; const isDone = step > num
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn('step-indicator', isActive ? 'active' : isDone ? 'completed' : 'inactive')}>
                    {isDone ? <Check className="h-4 w-4" /> : num}
                  </div>
                  <span className={cn('text-xs whitespace-nowrap', isActive ? 'text-primary' : isDone ? 'text-neon-green' : 'text-muted-foreground')}>{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={cn('w-8 h-px mb-5', isDone ? 'bg-neon-green' : 'bg-border')} />}
              </div>
            )
          })}
        </div>
        <div className="glass-card p-6">
          {step === 1 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-4">Select Game &amp; Username</h2>
              {myGames.length > 0 && (
                <div className="space-y-2 mb-4">
                  {myGames.map((cg: any) => (
                    <button key={cg.id} onClick={() => { setSelectedCgId(cg.id); setSelectedGameId(cg.game_id); setUsername(cg.username) }}
                      className={cn('w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                        selectedCgId === cg.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40')}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 font-bold text-primary text-xs font-gaming">
                        {cg.game?.name?.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1"><p className="text-sm font-semibold text-white">{cg.game?.name}</p><p className="text-xs font-mono text-primary">{cg.username}</p></div>
                      {selectedCgId === cg.id && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3 mt-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Game</label>
                  <select value={selectedGameId} onChange={e => { setSelectedGameId(e.target.value); setSelectedCgId('') }} className="game-input">
                    <option value="">Select a game...</option>
                    {allGames.map((g: any) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Game Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Your in-game username" className="game-input" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setStep(2)} disabled={!selectedGameId || !username.trim()} className="btn-neon px-6 py-3 disabled:opacity-40">
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-4">Load Amount</h2>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input type="number" value={amount || ''} onChange={e => setAmount(parseFloat(e.target.value) || 0)} placeholder="100" className="game-input pl-8" />
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {[20, 50, 100, 200, 500].map(a => (
                  <button key={a} onClick={() => setAmount(a)} className={cn('px-3 py-1.5 rounded-lg text-sm font-medium border transition-all', amount === a ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground')}>${a}</button>
                ))}
              </div>
              {amount >= 10 && <BonusPreview amount={amount} bonus={bonusPreview} isLoading={bonusLoading} />}
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(1)} className="btn-ghost-neon px-4 py-2.5 text-sm">Back</button>
                <button onClick={() => setStep(3)} disabled={!amount || amount < ((selectedGame as any)?.minimum_amount || 10)} className="btn-neon px-6 py-3 disabled:opacity-40">Continue <ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-4">Payment Method</h2>
              <div className="space-y-3 mb-6">
                {paymentMethods.map((method: any) => (
                  <button key={method.id} onClick={() => setSelectedPaymentId(method.id)}
                    className={cn('payment-card w-full text-left', selectedPaymentId === method.id && 'selected')}
                  >
                    <div className="relative flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 font-bold text-primary text-sm">{method.name.substring(0, 2)}</div>
                      <div className="flex-1"><p className="font-semibold text-white text-sm">{method.name}</p>{method.tag && <p className="text-xs text-primary font-mono">{method.tag}</p>}</div>
                      {selectedPaymentId === method.id && <Check className="h-5 w-5 text-primary" />}
                    </div>
                    {selectedPaymentId === method.id && (
                      <div className="mt-3 pt-3 border-t border-border space-y-2">
                        {method.tag && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Tag</span>
                            <button onClick={e => { e.stopPropagation(); handleCopyTag(method.tag) }} className="flex items-center gap-1.5 font-mono text-sm text-primary">
                              {method.tag} {copiedTag ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                        {method.instructions && <div className="bg-muted/30 rounded-lg p-3"><p className="text-xs text-muted-foreground whitespace-pre-line">{method.instructions}</p></div>}
                        <p className="text-xs font-semibold text-neon-gold">Send exactly {formatCurrency(amount)}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="btn-ghost-neon px-4 py-2.5 text-sm">Back</button>
                <button onClick={() => setStep(4)} disabled={!selectedPaymentId} className="btn-neon px-6 py-3 disabled:opacity-40">Continue <ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          {step === 4 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-6">Order Summary</h2>
              <div className="space-y-2 mb-4">
                {[{ label: 'Game', value: (selectedGame as any)?.name }, { label: 'Username', value: username }, { label: 'Payment', value: (selectedPayment as any)?.name }]
                  .map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-2 border-b border-border text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground">{value}</span>
                    </div>
                  ))}
              </div>
              <BonusPreview amount={amount} bonus={bonusPreview} isLoading={bonusLoading} />
              <div className="mt-6 mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">Payment Screenshot *</label>
                <ScreenshotUpload onFileSelect={setScreenshotFile} onFileRemove={() => setScreenshotFile(null)} selectedFile={screenshotFile} />
              </div>
              <div className="flex justify-between">
                <button onClick={() => setStep(3)} className="btn-ghost-neon px-4 py-2.5 text-sm">Back</button>
                <button onClick={handleSubmit} disabled={!screenshotFile || isSubmitting} className="btn-neon px-8 py-3 disabled:opacity-40">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {isSubmitting ? 'Submitting...' : 'Submit Order'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
