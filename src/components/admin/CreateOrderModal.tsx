import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Search, Gift, DollarSign, Gamepad2, CheckCircle2 } from 'lucide-react'
import { fetchGames, fetchCustomerGames } from '@/services/games'
import { fetchPaymentMethods } from '@/services/payments'
import { fetchCustomers } from '@/services/admin'
import { calculateBonusPreview, adminCreateOrder } from '@/services/orders'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function CreateOrderModal({ isOpen, onClose, defaultUserId }: { isOpen: boolean; onClose: () => void; defaultUserId?: string }) {
  const [isFreePlay, setIsFreePlay] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState('')
  const [username, setUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [userId, setUserId] = useState(defaultUserId || '')
  const [status, setStatus] = useState('completed')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [customerPaymentTag, setCustomerPaymentTag] = useState('')
  const [adminNote, setAdminNote] = useState('')
  
  const [userSearch, setUserSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [dropdownRef])

  const qc = useQueryClient()

  const { data: games } = useQuery({ queryKey: ['games'], queryFn: fetchGames, enabled: isOpen })
  const { data: paymentMethods } = useQuery({ queryKey: ['payment-methods'], queryFn: fetchPaymentMethods, enabled: isOpen && !isFreePlay })
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => fetchCustomers({ role: 'customer' }), enabled: isOpen })
  
  const { data: customerGames = [] } = useQuery({
    queryKey: ['customer-games', userId],
    queryFn: () => fetchCustomerGames(userId),
    enabled: !!userId && isOpen
  })

  // Sync default customer if passed via props
  useEffect(() => {
    if (isOpen && defaultUserId) {
      setUserId(defaultUserId)
      if (customers) {
        const c = customers.find(x => x.id === defaultUserId)
        if (c) {
          setUserSearch(c.full_name || c.username || '')
        }
      }
    }
  }, [isOpen, defaultUserId, customers])

  // Auto-select if customer only has 1 game account
  useEffect(() => {
    if (customerGames && customerGames.length === 1 && !selectedGameId) {
      setSelectedGameId(customerGames[0].game_id)
      setUsername(customerGames[0].username)
    }
  }, [customerGames, selectedGameId])

  // Auto-fill username when game or user changes
  useEffect(() => {
    if (selectedGameId && userId && customerGames) {
      const cg = customerGames.find(g => g.game_id === selectedGameId)
      if (cg) {
        setUsername(cg.username)
      } else if (!username) {
        // Fallback to customer's full name if no specific game username exists
        const c = customers?.find(c => c.id === userId)
        if (c) setUsername(c.full_name || '')
      }
    }
  }, [selectedGameId, userId, customerGames])

  const { data: bonusData } = useQuery({
    queryKey: ['bonus', selectedGameId, parseFloat(amount), userId],
    queryFn: () => calculateBonusPreview(selectedGameId, parseFloat(amount), userId || undefined),
    enabled: !isFreePlay && !!selectedGameId && parseFloat(amount) > 0 && isOpen,
  })

  const createMutation = useMutation({
    mutationFn: (e: React.FormEvent) => {
      e.preventDefault()
      const creditAmount = parseFloat(amount)
      if (!selectedGameId || !username || !amount || isNaN(creditAmount) || creditAmount <= 0) {
        throw new Error('Please fill all required fields with a valid amount')
      }
      return adminCreateOrder({
        game_id: selectedGameId,
        username,
        base_amount: isFreePlay ? 0 : creditAmount,
        user_id: userId || undefined,
        total_bonus: isFreePlay ? 0 : (bonusData?.total_bonus || 0),
        final_credit: isFreePlay ? creditAmount : (bonusData?.final_credit || creditAmount),
        status: status as any,
        payment_method_id: isFreePlay ? undefined : (paymentMethodId || undefined),
        customer_payment_tag: isFreePlay ? undefined : (customerPaymentTag || undefined),
        is_free_play: isFreePlay,
        admin_note: adminNote.trim() || (isFreePlay ? '🎁 Free Play awarded by admin' : 'Created manually by admin')
      })
    },
    onSuccess: () => {
      toast.success(isFreePlay ? '🎁 Free Play order created successfully' : 'Order created successfully')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['game-point-balances'] })
      onClose()
      setSelectedGameId('')
      setUsername('')
      setAmount('')
      setUserId('')
      setUserSearch('')
      setPaymentMethodId('')
      setCustomerPaymentTag('')
      setAdminNote('')
      setIsFreePlay(false)
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create order')
  })

  const filteredCustomers = customers?.filter(c => 
    c.full_name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    c.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
    c.phone?.toLowerCase().includes(userSearch.toLowerCase())
  )

  const selectedCustomer = customers?.find(c => c.id === userId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-card flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="font-gaming text-lg font-bold text-white">Create Order</h2>
            {isFreePlay && (
              <span className="badge text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                <Gift className="h-3 w-3" /> Free Play
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <form id="create-order-form" onSubmit={createMutation.mutate} className="space-y-4">
            
            {/* Mode Switcher: Regular Deposit vs Free Play */}
            <div className="flex rounded-xl bg-black/40 p-1 border border-border">
              <button
                type="button"
                onClick={() => setIsFreePlay(false)}
                className={cn(
                  'flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  !isFreePlay
                    ? 'bg-primary text-primary-foreground shadow font-bold'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <DollarSign className="h-3.5 w-3.5" />
                Standard Deposit
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsFreePlay(true)
                  setPaymentMethodId('')
                  setCustomerPaymentTag('')
                }}
                className={cn(
                  'flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  isFreePlay
                    ? 'bg-purple-600 text-white shadow shadow-purple-600/30 font-bold'
                    : 'text-muted-foreground hover:text-purple-300'
                )}
              >
                <Gift className="h-3.5 w-3.5 text-purple-200" />
                🎁 Free Play
              </button>
            </div>

            {/* Free Play Info Banner */}
            {isFreePlay && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-start gap-2.5 text-xs text-purple-200">
                <Gift className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-purple-100">Free Play Mode</p>
                  <p className="text-[11px] text-purple-300/80 mt-0.5">
                    No payment method required. Free play credits will be added to the player's account without requiring a cash deposit.
                  </p>
                </div>
              </div>
            )}

            {/* Registered Customer Search */}
            <div ref={dropdownRef} className="relative">
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Registered Customer (Optional)</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, username, or phone..."
                  value={userSearch}
                  onChange={e => {
                    setUserSearch(e.target.value)
                    setIsDropdownOpen(true)
                    setUserId('')
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="game-input w-full pl-9"
                />
                {userSearch && (
                   <button 
                     type="button"
                     onClick={() => {
                        setUserSearch('')
                        setUserId('')
                        setSelectedGameId('')
                        setUsername('')
                     }}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                   >
                     <X className="h-4 w-4" />
                   </button>
                )}
              </div>
              
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 z-50 max-h-60 overflow-y-auto bg-popover border border-border rounded-lg shadow-xl mt-1">
                  <div 
                    onClick={() => { setUserId(''); setUserSearch(''); setIsDropdownOpen(false) }}
                    className="p-3 text-sm cursor-pointer hover:bg-white/5 border-b border-border text-muted-foreground"
                  >
                    -- Guest Order (No User) --
                  </div>
                  {filteredCustomers?.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">No customers found</div>
                  ) : (
                    filteredCustomers?.map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => { 
                          setUserId(c.id)
                          setUserSearch(c.full_name || c.username || '')
                          setIsDropdownOpen(false)
                          if (!username) setUsername(c.full_name || '')
                        }}
                        className="p-3 text-sm cursor-pointer hover:bg-white/5 border-b border-border last:border-0"
                      >
                        <div className="font-medium text-white">{c.full_name}</div>
                        <div className="text-xs text-muted-foreground">@{c.username || 'unknown'}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
              {selectedCustomer && (
                <p className="text-xs text-neon-green mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Selected: <strong>{selectedCustomer.full_name}</strong> (@{selectedCustomer.username})
                </p>
              )}
              <p className="text-[10px] text-muted-foreground mt-0.5">If selected, the order will appear in the customer's dashboard.</p>
            </div>

            {/* Customer's Linked Game Accounts Quick Chips */}
            {userId && (
              <div className="rounded-xl border border-primary/25 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Gamepad2 className="h-4 w-4" />
                    Customer's Game Accounts ({customerGames.length})
                  </span>
                  {customerGames.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">Click to quick-select</span>
                  )}
                </div>

                {customerGames.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {customerGames.map(cg => {
                      const isSelected = selectedGameId === cg.game_id && username === cg.username
                      return (
                        <button
                          key={cg.id}
                          type="button"
                          onClick={() => {
                            setSelectedGameId(cg.game_id)
                            setUsername(cg.username)
                          }}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left",
                            isSelected
                              ? "bg-primary text-black border-primary font-bold shadow-md shadow-primary/20 scale-[1.02]"
                              : "bg-black/40 text-white border-border hover:border-primary/50 hover:bg-primary/10"
                          )}
                        >
                          {cg.game?.logo_url ? (
                            <img src={cg.game.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                          ) : (
                            <Gamepad2 className="h-3.5 w-3.5 text-primary" />
                          )}
                          <div>
                            <div className={isSelected ? "text-black font-semibold" : "text-white"}>{cg.game?.name || 'Game'}</div>
                            <div className={cn("text-[10px] font-mono", isSelected ? "text-black/80 font-bold" : "text-muted-foreground")}>
                              ID: {cg.username}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    This customer has no game accounts linked yet. You can select any game below.
                  </p>
                )}
              </div>
            )}

            {/* Game Selector */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Game *</label>
              <select
                value={selectedGameId}
                onChange={e => {
                  const gId = e.target.value
                  setSelectedGameId(gId)
                  const match = customerGames.find(cg => cg.game_id === gId)
                  if (match) {
                    setUsername(match.username)
                  }
                }}
                className="game-input w-full"
                required
              >
                <option value="">Select a game</option>
                {customerGames.length > 0 && (
                  <optgroup label="⭐ Customer's Registered Accounts">
                    {customerGames.map(cg => (
                      <option key={cg.id} value={cg.game_id}>
                        ⭐ {cg.game?.name} (Player ID: {cg.username})
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label={customerGames.length > 0 ? "Other Available Games" : "All Games"}>
                  {games
                    ?.filter(g => !customerGames.some(cg => cg.game_id === g.id))
                    .map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </optgroup>
              </select>
            </div>

            {/* Player Username */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Player Username / ID in Game *</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="game-input w-full" required />
            </div>

            {/* Amount / Credits */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                {isFreePlay ? 'Free Play Amount / Credits *' : 'Amount ($) *'}
              </label>
              <input 
                type="number" 
                step="1" 
                min="1"
                placeholder={isFreePlay ? 'e.g. 10, 20' : '10'} 
                value={amount} 
                onChange={e => setAmount(e.target.value)} 
                className="game-input w-full" 
                required 
              />
              {isFreePlay && (
                <p className="text-[10px] text-purple-300/80 mt-1">Total credits to award directly to player game account.</p>
              )}
            </div>
            
            {/* Payment & Status Section */}
            {isFreePlay ? (
              <div className="p-3 border border-purple-500/20 rounded-lg bg-black/20 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="game-input w-full">
                    <option value="completed">Completed (Direct Load)</option>
                    <option value="processing">Processing</option>
                    <option value="pending_payment_review">Pending</option>
                  </select>
                </div>
              </div>
            ) : (
              <>
                {/* Standard Deposit Options */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Method</label>
                  <select value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)} className="game-input w-full">
                    <option value="">None / Cash</option>
                    {paymentMethods?.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer Payment Tag / Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. $JohnDoe, John Doe, etc."
                    value={customerPaymentTag}
                    onChange={e => setCustomerPaymentTag(e.target.value)}
                    className="game-input w-full"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">The Cashtag, Chime Tag, or sender name the customer used to pay.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Order Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)} className="game-input w-full">
                    <option value="completed">Completed (Load Directly)</option>
                    <option value="pending_payment_review">Pending Payment Review</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
              </>
            )}

            {/* Admin Note */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Admin Note (Optional)</label>
              <textarea
                placeholder={isFreePlay ? 'e.g. Daily loyalty reward, VIP bonus...' : 'Internal note about this order...'}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                className="game-input w-full h-16 resize-none"
              />
            </div>

            {/* Bonus Preview (Only for standard orders) */}
            {!isFreePlay && bonusData && parseFloat(amount) > 0 && (
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-neon-green">Order Summary</div>
                <div className="flex justify-between">
                  <span>Base Amount:</span>
                  <span>${parseFloat(amount).toFixed(2)}</span>
                </div>
                {bonusData.regular_bonus_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Regular Bonus ({bonusData.regular_bonus_pct}%):</span>
                    <span>+${bonusData.regular_bonus_amount.toFixed(2)}</span>
                  </div>
                )}
                {bonusData.promo_bonus_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{bonusData.promotion_name || 'Promo Bonus'} ({bonusData.promo_bonus_pct}%):</span>
                    <span>+${bonusData.promo_bonus_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-border pt-1 mt-1 text-white">
                  <span>Total Game Credit:</span>
                  <span className="text-primary font-mono">{bonusData.final_credit} points</span>
                </div>
              </div>
            )}

            {/* Free Play Total Preview */}
            {isFreePlay && parseFloat(amount) > 0 && (
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-xs space-y-1">
                <div className="font-semibold text-purple-300">Free Play Summary</div>
                <div className="flex justify-between text-white">
                  <span>Deposit Cost:</span>
                  <span className="text-neon-green font-bold">$0.00 (Free)</span>
                </div>
                <div className="flex justify-between font-bold border-t border-purple-500/20 pt-1 mt-1 text-white">
                  <span>Game Points to Load:</span>
                  <span className="text-purple-300 font-mono text-sm">{parseFloat(amount)} points</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost-neon px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className={cn(
                  'px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2',
                  isFreePlay
                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30'
                    : 'btn-neon'
                )}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  isFreePlay ? '🎁 Issue Free Play' : 'Create Order'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
