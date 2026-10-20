import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Search, Gift, Check, CheckCircle2, User, Gamepad2 } from 'lucide-react'
import { fetchCustomers } from '@/services/admin'
import { fetchGames } from '@/services/games'
import { adminCreateFreePlay } from '@/services/freePlays'
import { sendNotificationToUser } from '@/services/notifications'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreateFreePlayModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateFreePlayModal({ isOpen, onClose }: CreateFreePlayModalProps) {
  const qc = useQueryClient()

  const [userId, setUserId] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  const [gameId, setGameId] = useState('')
  const [status, setStatus] = useState<'approved' | 'pending'>('approved')
  const [notifyCustomer, setNotifyCustomer] = useState(true)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setUserId('')
      setCustomerSearch('')
      setSelectedCustomer(null)
      setGameId('')
      setStatus('approved')
      setNotifyCustomer(true)
    }
  }, [isOpen])

  // Customers Query
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['customers-for-freeplay'],
    queryFn: () => fetchCustomers({ role: 'customer' }),
    enabled: isOpen,
  })

  // Games Query
  const { data: games = [] } = useQuery({
    queryKey: ['games-active-freeplay'],
    queryFn: fetchGames,
    enabled: isOpen,
  })

  // Customer Linked Games
  const { data: customerGames = [] } = useQuery({
    queryKey: ['customer-games-freeplay', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('customer_games')
        .select('*, game:games(*)')
        .eq('customer_id', userId)
        .eq('status', 'active')
      if (error) throw error
      return data || []
    },
    enabled: !!userId,
  })

  // Auto-select first game if customer only has 1 game account
  useEffect(() => {
    if (customerGames.length === 1 && !gameId) {
      setGameId(customerGames[0].game_id)
    }
  }, [customerGames, gameId])

  // Filter customers by search
  const filteredCustomers = customers.filter(c => {
    const q = customerSearch.toLowerCase()
    return (
      c.username?.toLowerCase().includes(q) ||
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
    )
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Please select a customer')
      if (!gameId) throw new Error('Please select a game')

      const result = await adminCreateFreePlay({
        userId,
        gameId,
        status,
      })

      if (notifyCustomer) {
        const game = games.find(g => g.id === gameId)
        await sendNotificationToUser(
          userId,
          'Free Play Granted! 🎁',
          `An admin has granted you a Free Play for ${game?.name || 'your game'}! Check your account.`,
          'promotions',
          '/my-games'
        ).catch(err => console.error('Failed to notify customer:', err))
      }

      return result
    },
    onSuccess: (data) => {
      toast.success(
        status === 'approved'
          ? 'Free Play granted and marked as Approved!'
          : 'Free Play request created as Pending.'
      )
      qc.invalidateQueries({ queryKey: ['admin-free-plays'] })
      qc.invalidateQueries({ queryKey: ['game-point-balances'] })
      qc.invalidateQueries({ queryKey: ['free-play-eligibility'] })
      onClose()
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to grant Free Play')
    }
  })

  if (!isOpen) return null

  const selectedGame = games.find(g => g.id === gameId)
  const linkedAccount = customerGames.find(cg => cg.game_id === gameId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="glass-card w-full max-w-lg border-border shadow-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border bg-white/5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-neon-gold/20 flex items-center justify-center text-neon-gold">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Give Free Play</h2>
              <p className="text-xs text-muted-foreground">Grant free play credits directly to a customer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Customer <span className="text-destructive">*</span>
            </label>

            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                    {(selectedCustomer.full_name || selectedCustomer.username)?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{selectedCustomer.full_name || 'No Name'}</p>
                    <p className="text-xs font-mono text-primary">@{selectedCustomer.username}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomer(null)
                    setUserId('')
                    setGameId('')
                  }}
                  className="p-1 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 text-xs flex items-center gap-1"
                >
                  <X className="h-4 w-4" /> Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Search by username, name, or phone..."
                    className="game-input w-full pl-9 text-sm"
                    autoFocus
                  />
                </div>

                <div className="max-h-40 overflow-y-auto rounded-xl border border-border divide-y divide-border bg-black/40">
                  {customersLoading ? (
                    <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading customers...
                    </div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No customers found matching "{customerSearch}".
                    </div>
                  ) : (
                    filteredCustomers.slice(0, 15).map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(c)
                          setUserId(c.id)
                          setCustomerSearch('')
                        }}
                        className="w-full text-left p-2.5 hover:bg-white/5 flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{c.full_name || 'Unnamed'}</p>
                          <p className="text-xs font-mono text-muted-foreground">@{c.username}</p>
                        </div>
                        {c.phone && <span className="text-[11px] text-muted-foreground">{c.phone}</span>}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Customer Linked Game Accounts Quick Chips */}
          {userId && (
            <div className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
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
                    const isSelected = gameId === cg.game_id
                    return (
                      <button
                        key={cg.id}
                        type="button"
                        onClick={() => setGameId(cg.game_id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-left",
                          isSelected
                            ? "bg-purple-600 text-white border-purple-400 font-bold shadow-md shadow-purple-600/30 scale-[1.02]"
                            : "bg-black/40 text-white border-border hover:border-purple-500/50 hover:bg-purple-500/10"
                        )}
                      >
                        {cg.game?.logo_url ? (
                          <img src={cg.game.logo_url} alt="" className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <Gamepad2 className="h-3.5 w-3.5 text-purple-300" />
                        )}
                        <div>
                          <div className={isSelected ? "text-white font-semibold" : "text-white"}>{cg.game?.name || 'Game'}</div>
                          <div className={cn("text-[10px] font-mono", isSelected ? "text-purple-200" : "text-muted-foreground")}>
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

          {/* Game Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Game <span className="text-destructive">*</span>
            </label>

            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="game-input w-full text-sm bg-black/40"
              disabled={!userId}
            >
              <option value="">-- Select Game --</option>
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
                  .filter(g => !customerGames.some(cg => cg.game_id === g.id))
                  .map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
              </optgroup>
            </select>

            {userId && linkedAccount && (
              <div className="p-2.5 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center gap-2 text-xs text-neon-green">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Linked in-game account: <strong>{linkedAccount.username}</strong>
                  {linkedAccount.game_password && ` · Pass: ${linkedAccount.game_password}`}
                </span>
              </div>
            )}

            {userId && !linkedAccount && gameId && (
              <p className="text-[11px] text-yellow-400/90">
                ⚠️ Customer does not have a linked account for this game yet.
              </p>
            )}
          </div>

          {/* Initial Status */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Request Status
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('approved')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  status === 'approved'
                    ? 'bg-neon-green/10 border-neon-green shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                    : 'bg-white/5 border-border hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-neon-green">Approved Immediately</span>
                  {status === 'approved' && <Check className="h-3.5 w-3.5 text-neon-green" />}
                </div>
                <p className="text-[10px] text-muted-foreground">Assigned credits in game software already</p>
              </button>

              <button
                type="button"
                onClick={() => setStatus('pending')}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  status === 'pending'
                    ? 'bg-orange-500/10 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.2)]'
                    : 'bg-white/5 border-border hover:border-white/20'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-orange-400">Mark as Pending</span>
                  {status === 'pending' && <Check className="h-3.5 w-3.5 text-orange-400" />}
                </div>
                <p className="text-[10px] text-muted-foreground">Will be approved by staff later</p>
              </button>
            </div>
          </div>

          {/* Notification Checkbox */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-border">
            <input
              id="notify-customer-fp"
              type="checkbox"
              checked={notifyCustomer}
              onChange={(e) => setNotifyCustomer(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary h-4 w-4 bg-black/40"
            />
            <label htmlFor="notify-customer-fp" className="text-xs text-white cursor-pointer select-none">
              Send in-app notification to customer
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost-neon px-4 py-2 text-xs"
            disabled={createMutation.isPending}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={!userId || !gameId || createMutation.isPending}
            className="btn-neon px-5 py-2 text-xs flex items-center gap-1.5"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Granting...
              </>
            ) : (
              <>
                <Gift className="h-3.5 w-3.5" />
                Give Free Play
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
