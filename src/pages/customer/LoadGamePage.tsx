import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, Gamepad2, Zap, Image as ImageIcon, CheckCircle, Loader2, ZoomIn, X as XIcon, AlertTriangle, Info, Copy } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchGames, fetchCustomerGames } from '@/services/games'
import { calculateBonusPreview } from '@/services/orders'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from 'sonner'
import { cn, formatCurrency } from '@/lib/utils'
import { ScreenshotUpload } from '@/components/customer/ScreenshotUpload'
import { APP_NAME } from '@/lib/constants'
import type { Game, PaymentMethod } from '@/types'
import { Turnstile } from '@marsidev/react-turnstile'

export default function LoadGamePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, isAuthenticated } = useAuthStore()
  const { allowRegistration } = useSettingsStore()
  
  const stateGameId = location.state?.gameId
  const initialGameId = stateGameId || searchParams.get('game') || ''
  const [selectedGameId, setSelectedGameId] = useState(initialGameId)
  
  const [username, setUsername] = useState(profile?.username || profile?.full_name || '')
  const [amount, setAmount] = useState<string>('')
  
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  
  const [screenshotKey, setScreenshotKey] = useState<string | null>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)
  const [qrZoom, setQrZoom] = useState(false)

  // Guest verification states
  const [isVerifyingUsername, setIsVerifyingUsername] = useState(false)
  const [guestVerifiedUserId, setGuestVerifiedUserId] = useState<string | null>(null)
  
  // Turnstile state
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)

  const { data: games, isLoading: loadingGames } = useQuery({
    queryKey: ['games-active'],
    queryFn: fetchGames,
  })

  const { data: customerGames } = useQuery({
    queryKey: ['customer-games', profile?.id],
    queryFn: () => fetchCustomerGames(profile!.id),
    enabled: isAuthenticated && !!profile?.id,
  })

  // Fetch bonus preview dynamically when game and amount change
  const numericAmount = parseFloat(amount)
  const { data: bonusData, isLoading: loadingBonus } = useQuery({
    queryKey: ['bonus-preview', selectedGameId, numericAmount],
    queryFn: () => calculateBonusPreview(selectedGameId, numericAmount, profile?.id),
    enabled: !!selectedGameId && !isNaN(numericAmount) && numericAmount > 0,
    staleTime: 30000,
  })

  // Fetch active payment methods
  useEffect(() => {
    async function loadMethods() {
      const { data } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (data) setPaymentMethods(data)
    }
    loadMethods()
  }, [])

  // Auto-fill username if profile exists
  useEffect(() => {
    if (location.state?.customerGameId && customerGames) {
      const cg = customerGames.find((g: any) => g.id === location.state.customerGameId)
      if (cg) {
        setUsername(cg.username)
        return
      }
    }
    
    // Auto-select username if they select a game and only have 1 account for it
    if (isAuthenticated && selectedGameId && customerGames) {
      const accountsForGame = customerGames.filter((cg: any) => cg.game_id === selectedGameId)
      if (accountsForGame.length > 0) {
        // If they haven't selected a valid username for this game yet, or only have 1
        if (accountsForGame.length === 1 || !accountsForGame.find(cg => cg.username === username)) {
          setUsername(accountsForGame[0].username)
          return
        }
        return // keep existing valid selection
      } else {
        setUsername('') // Clear if they have no accounts for this game
        return
      }
    }

    if (profile?.username || profile?.full_name) {
      if (!username) setUsername(profile.username || profile.full_name || '')
    }
  }, [profile, customerGames, location.state, selectedGameId, isAuthenticated])

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method)
  }

  const handleVerifyGuestUsername = async () => {
    if (!selectedGameId) {
      toast.error('Please select a game first (Step 1)')
      return
    }
    if (!username) {
      toast.error('Please enter a username')
      return
    }
    setIsVerifyingUsername(true)
    setGuestVerifiedUserId(null)
    
    try {
      const { data, error } = await supabase.rpc('verify_game_username', {
        p_game_id: selectedGameId,
        p_username: username
      })
      
      if (error) throw error
      
      if (data) {
        setGuestVerifiedUserId(data)
        toast.success('Username verified!')
      } else {
        toast.error('Username not found. Please contact Live Support to create a new game account.')
      }
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to verify username.')
    } finally {
      setIsVerifyingUsername(false)
    }
  }

  const selectedGame = games?.find(g => g.id === selectedGameId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedGame) return toast.error('Please select a game')
    if (!username) return toast.error('Please enter your Game Username')
    if (!isAuthenticated && !guestVerifiedUserId) {
      return toast.error('Please verify your Game Username before submitting')
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return toast.error('Please enter a valid amount')
    if (Number(amount) < selectedGame.minimum_amount) {
      return toast.error(`Minimum load amount for this game is ${formatCurrency(selectedGame.minimum_amount)}`)
    }
    if (Number(amount) > selectedGame.maximum_amount) {
      return toast.error(`Maximum load amount for this game is ${formatCurrency(selectedGame.maximum_amount)}`)
    }
    if (!selectedMethod) return toast.error('Please select a payment method')
    if (!screenshotKey) return toast.error('Please upload your payment screenshot')
    if (!turnstileToken) return toast.error('Please complete the security check')

    setIsSubmitting(true)

    try {
      // Temporarily we do the logic using the edge function
      const { error } = await supabase.functions.invoke('create-order', {
        body: {
          game_id: selectedGame.id,
          username: username,
          base_amount: Number(amount),
          payment_method_id: selectedMethod.id,
          payment_screenshot_path: screenshotKey,
          is_guest: !isAuthenticated,
          guest_verified_user_id: guestVerifiedUserId,
          cf_turnstile_token: turnstileToken,
        },
      })

      if (error) throw error
      
      setOrderComplete(true)
      toast.success('Order submitted successfully!')
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to submit order. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen hero-bg pt-20 pb-10 px-4 flex flex-col items-center justify-center">
        <div className="glass-card p-8 max-w-lg w-full text-center animate-scale-in">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-neon-green/20 border border-neon-green/30 mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-neon-green" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Order Received!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your load order for <strong className="text-white">{selectedGame?.name}</strong> has been submitted. Our team is verifying your payment and will process it shortly.
          </p>
          
          <div className="bg-game-darker rounded-xl p-4 border border-border text-left mb-6 space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Account:</span>
              <span className="text-white font-medium">{username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground text-sm">Amount:</span>
              <span className="text-white font-medium">{formatCurrency(Number(amount))}</span>
            </div>
            {bonusData && (
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground text-sm">Game Credit:</span>
                <span className="text-neon-green font-bold">{Math.ceil(bonusData.final_credit || Number(amount))}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <Link to="/orders" className="btn-neon px-6 py-3">View My Orders</Link>
            ) : (
              <Link to="/" className="btn-neon px-6 py-3">Back to Home</Link>
            )}
            <button onClick={() => window.location.reload()} className="px-6 py-3 rounded-xl border border-border text-foreground hover:bg-white/5 transition-colors font-gaming font-semibold tracking-wide">
              Load Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen hero-bg pt-20 pb-20">
      <div className="container max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/50 text-muted-foreground hover:bg-card hover:text-foreground transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Load Game</h1>
            <p className="text-sm text-muted-foreground">Select game, enter amount, and upload screenshot</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* 1. Select Game */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">1</span>
                    Select Game
                  </label>
                  
                  {loadingGames ? (
                    <div className="h-24 skeleton rounded-xl" />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {games?.map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => setSelectedGameId(game.id)}
                          className={cn(
                            "relative overflow-hidden rounded-xl border p-3 flex flex-col items-center gap-2 transition-all group",
                            selectedGameId === game.id 
                              ? "border-primary bg-primary/10 shadow-neon-blue" 
                              : "border-border bg-game-darker hover:border-primary/50"
                          )}
                        >
                          {game.logo_url ? (
                            <img src={game.logo_url} alt={game.name} className="h-10 w-10 object-contain" />
                          ) : (
                            <Gamepad2 className={cn("h-8 w-8", selectedGameId === game.id ? "text-primary" : "text-muted-foreground")} />
                          )}
                          <span className={cn(
                            "text-xs font-semibold text-center leading-tight",
                            selectedGameId === game.id ? "text-white" : "text-muted-foreground"
                          )}>
                            {game.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Username & Amount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">2</span>
                      Game Username
                    </label>
                    {isAuthenticated ? (
                      <select 
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="game-input"
                      >
                        <option value="">-- Select your Game ID --</option>
                        {customerGames?.filter(cg => cg.game_id === selectedGameId).map(cg => (
                          <option key={cg.id} value={cg.username}>{cg.username}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value)
                            setGuestVerifiedUserId(null)
                          }}
                          placeholder="e.g. player123"
                          className="game-input flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyGuestUsername}
                          disabled={isVerifyingUsername || !!guestVerifiedUserId}
                          className={cn(
                            "px-4 py-2 rounded-xl border text-sm font-semibold transition-all",
                            guestVerifiedUserId 
                              ? "bg-neon-green/20 border-neon-green/30 text-neon-green"
                              : "bg-primary/20 border-primary/30 text-primary hover:bg-primary/30"
                          )}
                        >
                          {isVerifyingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : guestVerifiedUserId ? <CheckCircle className="h-4 w-4" /> : 'Verify'}
                        </button>
                      </div>
                    )}
                    {isAuthenticated && selectedGameId && customerGames?.filter(cg => cg.game_id === selectedGameId).length === 0 && (
                      <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> No accounts found for this game. Contact Support.
                      </p>
                    )}
                    {!isAuthenticated && guestVerifiedUserId && (
                      <p className="text-xs text-neon-green mt-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Account verified.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">3</span>
                      Load Amount ($)
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <input
                        type="number"
                        required
                        min={selectedGame?.minimum_amount || 1}
                        max={selectedGame?.maximum_amount || 1000}
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="game-input pl-8"
                      />
                    </div>
                    {/* Bonus Preview Display */}
                    {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                      <div className="mt-3 flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5 animate-fade-in">
                        <span className="text-xs text-muted-foreground">You will receive:</span>
                        {loadingBonus ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <div className="text-right">
                            <span className="text-lg font-bold text-primary tracking-wide">
                              {Math.ceil(bonusData?.final_credit || parseFloat(amount))}
                            </span>
                            {(bonusData?.total_bonus || 0) > 0 && (
                              <p className="text-[10px] text-neon-green">
                                Includes {formatCurrency(bonusData!.total_bonus)} bonus
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">4</span>
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {paymentMethods.map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedMethod(method)}
                        className={cn(
                          "relative rounded-xl border p-3 flex flex-col items-center gap-2 transition-all",
                          selectedMethod?.id === method.id 
                            ? "border-neon-green bg-neon-green/10 shadow-neon-green" 
                            : "border-border bg-game-darker hover:border-neon-green/50"
                        )}
                      >
                        {method.logo_url ? (
                          <img src={method.logo_url} alt={method.name} className="h-8 object-contain" />
                        ) : (
                          <span className="font-gaming font-bold text-lg">{method.name}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Payment Details Reveal */}
                  {selectedMethod && (
                    <div className="mt-4 animate-fade-in">
                      <div className="p-4 rounded-xl border border-neon-green/30 bg-neon-green/5">
                        <h4 className="font-semibold text-white mb-3">
                          Send payment via {selectedMethod.name}
                        </h4>
                        
                        <div className="flex gap-2 items-start bg-orange-500/10 border border-orange-500/30 p-2 rounded-lg text-orange-400 mb-4">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] leading-tight font-medium">
                            <strong>WARNING:</strong> Our payment account / tag changes frequently. Do not send money to any old or previously saved accounts. Always check the active account details below before sending money.
                          </p>
                        </div>

                        {/* Row: QR left | Tag+Instructions right */}
                        <div className="flex flex-col sm:flex-row gap-4 items-start">

                          {/* QR Code — clickable to zoom */}
                          {selectedMethod.qr_code_url && (
                            <div className="flex-shrink-0 flex flex-col items-center gap-2 mx-auto sm:mx-0">
                              <button
                                type="button"
                                onClick={() => setQrZoom(true)}
                                className="relative group bg-white p-2 rounded-lg cursor-zoom-in transition-transform hover:scale-105"
                                title="Click to zoom"
                              >
                                <img
                                  src={selectedMethod.qr_code_url}
                                  alt="QR Code"
                                  className="w-36 h-36 object-contain"
                                  onError={(e) => { e.currentTarget.parentElement!.style.display = 'none' }}
                                />
                                <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                                  <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                </div>
                              </button>
                              <p className="text-xs text-muted-foreground">Tap to zoom</p>
                            </div>
                          )}

                          {/* Right side: Tag + Link + Instructions */}
                          <div className="flex-1 space-y-3 w-full">
                            {/* Tag */}
                            {selectedMethod.tag && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Send to</p>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedMethod.tag || '')
                                    toast.success('Payment tag copied to clipboard')
                                  }}
                                  className="inline-flex items-center gap-3 bg-card hover:bg-card/80 border border-border px-4 py-2 rounded-lg mb-2 cursor-pointer transition-colors group"
                                  title="Click to copy"
                                >
                                  <span className="text-neon-green font-mono text-lg font-bold">{selectedMethod.tag}</span>
                                  <Copy className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                                </button>
                              </div>
                            )}

                            {/* Payment Link */}
                            {selectedMethod.payment_link && (
                              <a href={selectedMethod.payment_link} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 underline">
                                Click here to pay
                              </a>
                            )}

                            {/* Important Instructions — inline right of QR */}
                            {selectedMethod.instructions && (
                              <div className="rounded-lg border border-destructive/40 bg-destructive/8 p-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                  <Info className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                                  <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Important Instructions</span>
                                </div>
                                <ul className="space-y-1.5">
                                  {selectedMethod.instructions.split('\n').filter(Boolean).map((line, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                                      {line.match(/^\d+\./) ? (
                                        <>
                                          <span className="flex-shrink-0 h-4 w-4 rounded-full bg-destructive/20 text-destructive text-[10px] font-bold flex items-center justify-center mt-0.5">
                                            {line.match(/^(\d+)\./)?.[1]}
                                          </span>
                                          <span>{line.replace(/^\d+\.\s*/, '')}</span>
                                        </>
                                      ) : (
                                        <>
                                          <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0 mt-0.5" />
                                          <span>{line.replace(/^[-•*]\s*/, '')}</span>
                                        </>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* QR Zoom Modal */}
                  {qrZoom && selectedMethod?.qr_code_url && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
                      onClick={() => setQrZoom(false)}
                    >
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <div className="bg-white p-4 rounded-2xl shadow-2xl">
                          <img
                            src={selectedMethod.qr_code_url}
                            alt="QR Code Zoomed"
                            className="w-72 h-72 object-contain"
                          />
                        </div>
                        <p className="text-center text-white/70 text-sm mt-3">Scan with your camera app</p>
                        <button
                          onClick={() => setQrZoom(false)}
                          className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Screenshot */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">5</span>
                    Payment Screenshot
                  </label>
                  <ScreenshotUpload 
                    onUpload={(key, url) => {
                      setScreenshotKey(key)
                      setScreenshotUrl(url)
                    }}
                    onClear={() => {
                      setScreenshotKey(null)
                      setScreenshotUrl(null)
                    }}
                    uploaded={!!screenshotKey}
                    orderId="temp" // Just a placeholder for R2 key generation
                  />
                </div>
                <div className="pt-4 border-t border-border flex flex-col items-center gap-4">
                  <Turnstile 
                    siteKey="0x4AAAAAAEVMea_wWH0o2Jxu"
                    onSuccess={(token) => setTurnstileToken(token)}
                    onError={() => setTurnstileToken(null)}
                    options={{
                      theme: 'dark',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedGame || !username || !amount || !selectedMethod || !screenshotKey || !turnstileToken}
                    className="btn-neon w-full py-4 text-lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        Submit Order
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* Sidebar / Summary */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Order Summary</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground text-sm">Game</span>
                  <span className="font-medium text-white">{selectedGame?.name || 'Not selected'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground text-sm">Account</span>
                  <span className="font-medium text-white max-w-[120px] truncate">{username || '---'}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground text-sm">Amount</span>
                  <span className="font-medium text-white">
                    {amount ? formatCurrency(Number(amount)) : '---'}
                  </span>
                </div>

                <div className="bg-game-darker rounded-xl p-4 border border-primary/20 mt-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/10 rounded-bl-full blur-xl" />
                  <p className="text-xs text-muted-foreground mb-1">Total to Pay</p>
                  <p className="text-2xl font-bold text-primary">
                    {amount ? formatCurrency(Number(amount)) : '$0.00'}
                  </p>
                </div>
              </div>
            </div>

            {!isAuthenticated && allowRegistration && (
              <div className="glass-card p-6 border-primary/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full" />
                <h3 className="text-base font-bold text-white mb-2">Create an account!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Track your orders, earn referral bonuses, and chat with live support.
                </p>
                <Link to="/register" className="btn-neon w-full py-2 text-sm text-center block">
                  Sign Up Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
