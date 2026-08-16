import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Zap, ChevronRight, Check, Copy, ExternalLink, Loader2, CheckCircle } from 'lucide-react'
import { fetchGames } from '@/services/games'
import { fetchPaymentMethods } from '@/services/payments'
import { ScreenshotUpload } from '@/components/shared/ScreenshotUpload'
import { BonusPreview } from '@/components/shared/BonusPreview'
import { APP_NAME } from '@/lib/constants'
import { cn, formatCurrency, copyToClipboard } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { uploadPaymentScreenshot } from '@/services/payments'

const STEPS = ['Game', 'Username', 'Amount', 'Payment', 'Submit']

interface GuestInfo {
  name: string
  email: string
  phone: string
}

export default function QuickLoadPage() {
  const [step, setStep] = useState(1)
  const [selectedGameId, setSelectedGameId] = useState('')
  const [username, setUsername] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [selectedPaymentId, setSelectedPaymentId] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [guestInfo, setGuestInfo] = useState<GuestInfo>({ name: '', email: '', phone: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)
  const [copiedTag, setCopiedTag] = useState(false)
  const { profile } = useAuthStore()

  const { data: games = [] } = useQuery({ queryKey: ['games', 'active'], queryFn: fetchGames })
  const { data: paymentMethods = [] } = useQuery({ queryKey: ['payment-methods', 'active'], queryFn: fetchPaymentMethods })

  const selectedGame = games.find(g => g.id === selectedGameId)
  const selectedPayment = paymentMethods.find(p => p.id === selectedPaymentId)

  const handleCopyTag = async (tag: string) => {
    await copyToClipboard(tag)
    setCopiedTag(true)
    setTimeout(() => setCopiedTag(false), 2000)
  }

  const handleSubmit = async () => {
    if (!screenshotFile) {
      toast.error('Please upload your payment screenshot')
      return
    }
    if (!profile && (!guestInfo.name || !guestInfo.phone)) {
      toast.error('Please enter your name and phone number')
      return
    }

    setIsSubmitting(true)
    try {
      const tempOrderId = crypto.randomUUID()
      const screenshotPath = await uploadPaymentScreenshot(screenshotFile, tempOrderId, profile?.id || null)

      const { data, error } = await supabase.functions.invoke('create-order', {
        body: {
          game_id: selectedGameId,
          username: username.trim(),
          base_amount: amount,
          payment_method_id: selectedPaymentId,
          payment_screenshot_path: screenshotPath,
          guest_name: profile ? undefined : guestInfo.name,
          guest_email: profile ? undefined : guestInfo.email,
          guest_phone: profile ? undefined : guestInfo.phone,
        },
      })

      if (error) throw error
      setOrderId(data.order.id)
      setOrderNumber(data.order.order_number)
      setStep(6)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit order')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (step === 6 && orderNumber) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-16">
        <div className="glass-card p-8 max-w-md w-full text-center animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-green/20 border border-neon-green/30 mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-neon-green" />
          </div>
          <h2 className="text-2xl font-gaming font-bold text-white mb-2">Order Submitted!</h2>
          <p className="text-muted-foreground mb-4">
            Your order has been received. We\'ll verify your payment and process the load shortly.
          </p>
          <div className="bg-muted/30 rounded-xl p-4 mb-6">
            <p className="text-xs text-muted-foreground">Order Number</p>
            <p className="font-mono font-bold text-primary text-lg">{orderNumber}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-6">
            Save your order number for reference. You\'ll receive updates if you provided contact info.
          </p>
          <div className="flex gap-3">
            <button onClick={() => { setStep(1); setOrderId(null); setOrderNumber(null) }} className="btn-ghost-neon flex-1 py-2.5 text-sm">
              New Order
            </button>
            <a href="/register" className="btn-neon flex-1 py-2.5 text-sm">
              Create Account
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen hero-bg px-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-gaming font-bold text-white">{APP_NAME}</span>
          </div>
          <h1 className="text-2xl font-gaming font-bold text-white">Quick Load</h1>
          <p className="text-muted-foreground text-sm mt-1">No account required — pay and play</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
          {STEPS.map((label, i) => {
            const num = i + 1
            const isActive = step === num
            const isDone = step > num
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'step-indicator',
                    isActive ? 'active' : isDone ? 'completed' : 'inactive'
                  )}>
                    {isDone ? <Check className="h-4 w-4" /> : num}
                  </div>
                  <span className={cn('text-xs', isActive ? 'text-primary' : isDone ? 'text-neon-green' : 'text-muted-foreground')}>{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn('w-8 h-px mb-5', isDone ? 'bg-neon-green' : 'bg-border')} />
                )}
              </div>
            )
          })}
        </div>

        <div className="glass-card p-6 animate-slide-up">
          {/* STEP 1: Select Game */}
          {step === 1 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-4">Select Your Game</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGameId(game.id)}
                    className={cn(
                      'flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200',
                      selectedGameId === game.id
                        ? 'border-primary bg-primary/10 shadow-neon-blue'
                        : 'border-border bg-muted/20 hover:border-primary/50'
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 font-bold text-primary text-sm font-gaming flex-shrink-0">
                      {game.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{game.name}</p>
                      <p className="text-xs text-muted-foreground">${game.minimum_amount}–${game.maximum_amount}</p>
                    </div>
                    {selectedGameId === game.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedGameId}
                  className="btn-neon px-6 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Enter Username */}
          {step === 2 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-1">Enter Game Username</h2>
              <p className="text-xs text-muted-foreground mb-6">Your username in {selectedGame?.name}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Game Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your game username"
                    className="game-input"
                  />
                </div>
                {!profile && (
                  <>
                    <div className="border-t border-border pt-4">
                      <p className="text-xs text-muted-foreground mb-3">Your contact info (optional but recommended for order updates)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Your Name *</label>
                      <input
                        type="text"
                        value={guestInfo.name}
                        onChange={e => setGuestInfo(p => ({ ...p, name: e.target.value }))}
                        placeholder="John Smith"
                        className="game-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Phone Number *</label>
                      <input
                        type="tel"
                        value={guestInfo.phone}
                        onChange={e => setGuestInfo(p => ({ ...p, phone: e.target.value }))}
                        placeholder="(555) 000-0000"
                        className="game-input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Email (optional)</label>
                      <input
                        type="email"
                        value={guestInfo.email}
                        onChange={e => setGuestInfo(p => ({ ...p, email: e.target.value }))}
                        placeholder="you@example.com"
                        className="game-input"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(1)} className="btn-ghost-neon px-4 py-2.5 text-sm">Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!username.trim() || (!profile && !guestInfo.name)}
                  className="btn-neon px-6 py-3 disabled:opacity-40"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Amount */}
          {step === 3 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-1">Load Amount</h2>
              <p className="text-xs text-muted-foreground mb-6">
                Min ${selectedGame?.minimum_amount} — Max ${selectedGame?.maximum_amount}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
                    <input
                      type="number"
                      value={amount || ''}
                      onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder="100"
                      min={selectedGame?.minimum_amount}
                      max={selectedGame?.maximum_amount}
                      className="game-input pl-8"
                    />
                  </div>
                </div>
                {/* Quick amounts */}
                <div className="flex flex-wrap gap-2">
                  {[20, 50, 100, 200, 500].map(a => (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                        amount === a ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/50'
                      )}
                    >
                      ${a}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(2)} className="btn-ghost-neon px-4 py-2.5 text-sm">Back</button>
                <button
                  onClick={() => setStep(4)}
                  disabled={!amount || amount < (selectedGame?.minimum_amount || 10)}
                  className="btn-neon px-6 py-3 disabled:opacity-40"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Payment */}
          {step === 4 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-4">Select Payment Method</h2>
              <div className="grid grid-cols-1 gap-3 mb-6">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedPaymentId(method.id)}
                    className={cn(
                      'payment-card text-left',
                      selectedPaymentId === method.id && 'selected'
                    )}
                  >
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 font-bold text-primary text-sm flex-shrink-0">
                        {method.name.substring(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{method.name}</p>
                        {method.tag && <p className="text-xs text-primary font-mono">{method.tag}</p>}
                      </div>
                      {selectedPaymentId === method.id && <Check className="h-5 w-5 text-primary" />}
                    </div>

                    {/* Expanded details when selected */}
                    {selectedPaymentId === method.id && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {method.tag && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Tag/ID</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopyTag(method.tag!) }}
                              className="flex items-center gap-1.5 font-mono text-sm text-primary hover:text-primary/80"
                            >
                              <span>{method.tag}</span>
                              {copiedTag ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        )}
                        {method.payment_link && (
                          <a
                            href={method.payment_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80"
                            onClick={e => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open Payment Link
                          </a>
                        )}
                        {method.instructions && (
                          <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground whitespace-pre-line">{method.instructions}</p>
                          </div>
                        )}
                        <p className="text-xs font-semibold text-neon-gold">
                          Send exactly {formatCurrency(amount)} and screenshot your confirmation.
                        </p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button onClick={() => setStep(3)} className="btn-ghost-neon px-4 py-2.5 text-sm">Back</button>
                <button
                  onClick={() => setStep(5)}
                  disabled={!selectedPaymentId}
                  className="btn-neon px-6 py-3 disabled:opacity-40"
                >
                  Continue <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Submit */}
          {step === 5 && (
            <div>
              <h2 className="font-gaming font-bold text-white text-lg mb-6">Review & Submit</h2>

              {/* Order Summary */}
              <div className="space-y-2 mb-6">
                {[
                  { label: 'Game', value: selectedGame?.name },
                  { label: 'Username', value: username },
                  { label: 'Amount', value: formatCurrency(amount) },
                  { label: 'Payment', value: selectedPayment?.name },
                  { label: 'Your Name', value: profile?.full_name || guestInfo.name },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between py-2 border-b border-border text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium text-foreground">{value}</span>
                  </div>
                ))}
              </div>

              {/* Screenshot upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-3">Payment Screenshot *</label>
                <ScreenshotUpload
                  onFileSelect={setScreenshotFile}
                  onFileRemove={() => setScreenshotFile(null)}
                  selectedFile={screenshotFile}
                />
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(4)} className="btn-ghost-neon px-4 py-2.5 text-sm">Back</button>
                <button
                  onClick={handleSubmit}
                  disabled={!screenshotFile || isSubmitting}
                  className="btn-neon px-8 py-3 disabled:opacity-40"
                >
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
