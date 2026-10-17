import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGamePointPurchases, createGamePointPurchase, fetchGamePointBalances } from '@/services/accounting'
import { fetchGames } from '@/services/games'
import { formatPoints, cn } from '@/lib/utils'
import { Coins, Plus, Calendar, TrendingDown, ArrowUpRight, ShieldAlert, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

export default function AdminPointPurchasesPage() {
  const queryClient = useQueryClient()
  const profile = useAuthStore(state => state.profile)
  const [showAddModal, setShowAddModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [gameId, setGameId] = useState('')

  const { data: purchases, isLoading: purchasesLoading } = useQuery({
    queryKey: ['point-purchases'],
    queryFn: fetchGamePointPurchases,
  })

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['game-point-balances'],
    queryFn: fetchGamePointBalances,
  })

  const { data: games } = useQuery({
    queryKey: ['admin-games'],
    queryFn: fetchGames,
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("No user profile")
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new Error("Invalid points amount")
      if (!gameId) throw new Error("Please select a game")

      await createGamePointPurchase({
        game_id: gameId,
        amount: Number(amount),
        created_by: profile.id
      })
    },
    onSuccess: () => {
      toast.success('Game points loaded successfully!')
      setShowAddModal(false)
      setAmount('')
      setGameId('')
      queryClient.invalidateQueries({ queryKey: ['point-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['game-point-balances'] })
      queryClient.invalidateQueries({ queryKey: ['active-accounting'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to load points')
    }
  })

  const isLoading = purchasesLoading || balancesLoading

  if (isLoading) {
    return <div className="h-64 skeleton rounded-xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <Coins className="h-6 w-6 text-neon-gold" /> Game Point Inventory
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage point inventory per game. Points decrease automatically when games are loaded or free plays are awarded.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-neon px-4 py-2 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Load Points
        </button>
      </div>

      {/* Live Game Point Balances Overview */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-neon-gold" /> Real-time Game Stock Balances
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {balances?.map((b) => {
            const isLow = b.remaining_points <= 100 && b.remaining_points > 0
            const isOut = b.remaining_points <= 0

            return (
              <div
                key={b.game_id}
                className={cn(
                  'glass-card p-4 relative overflow-hidden flex flex-col justify-between gap-3 border',
                  isOut ? 'border-destructive/40 bg-destructive/5' :
                  isLow ? 'border-orange-500/40 bg-orange-500/5' :
                  'border-white/10'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.game_name} className="h-10 w-10 rounded-xl object-cover border border-white/10" />
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-neon-gold/10 border border-neon-gold/20 flex items-center justify-center font-bold text-neon-gold text-sm">
                        {b.game_name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white">{b.game_name}</h3>
                      <p className="text-[11px] text-muted-foreground">Point Inventory</p>
                    </div>
                  </div>

                  <span className={cn(
                    'text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                    isOut ? 'bg-destructive/20 text-destructive border-destructive/30' :
                    isLow ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                    'bg-neon-green/20 text-neon-green border-neon-green/30'
                  )}>
                    {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                  </span>
                </div>

                {/* Balance Display */}
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs text-muted-foreground mb-1">Available Points</p>
                  <div className="flex items-baseline gap-2">
                    <span className={cn(
                      'text-2xl font-bold tracking-tight',
                      isOut ? 'text-destructive font-mono' :
                      isLow ? 'text-orange-400 font-mono' :
                      'text-white font-mono'
                    )}>
                      {formatPoints(b.remaining_points)}
                    </span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-neon-green" /> Total Loaded:
                    </span>
                    <span className="font-semibold text-white/90 font-mono">
                      {formatPoints(b.total_purchased)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-destructive" /> Used / Dispatched:
                    </span>
                    <span className="font-semibold text-white/90 font-mono">
                      {formatPoints(b.total_loaded)}
                    </span>
                  </div>
                </div>

                {b.total_free_play > 0 && (
                  <div className="text-[11px] text-purple-300/80 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                    Free Play awarded: <span className="font-bold font-mono">{formatPoints(b.total_free_play)}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* History Table */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Point Load History
        </h2>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-black/20">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Game</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Points Loaded</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Loaded By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {purchases?.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-sm text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(purchase.created_at.replace(' ', 'T')).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-neon-gold">
                      {purchase.game?.name || 'Unknown Game'}
                    </td>
                    <td className="p-4 font-bold text-white font-mono">
                      {formatPoints(purchase.amount)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {purchase.profile?.full_name || 'Unknown'}
                    </td>
                  </tr>
                ))}
                {purchases?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-muted-foreground">
                      <Coins className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      No game points loaded yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="font-gaming font-bold text-xl text-white mb-2 flex items-center gap-2">
              <Coins className="h-5 w-5 text-neon-gold" /> Load Game Points
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the points purchased for this game. Points will be added to the game stock and deducted as players load credits or receive free plays.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Game *</label>
                <select 
                  className="game-input w-full"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                >
                  <option value="">Select a game...</option>
                  {games?.map(game => (
                    <option key={game.id} value={game.id}>{game.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-white mb-2 block">Points to Load (pts) *</label>
                <input 
                  type="number" 
                  className="game-input w-full"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Specify the number of points (not dollars).
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowAddModal(false)}
                className="btn-secondary px-4 py-2 text-sm"
                disabled={addMutation.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={() => addMutation.mutate()}
                className="btn-neon px-4 py-2 text-sm"
                disabled={addMutation.isPending || !amount || !gameId}
              >
                {addMutation.isPending ? 'Loading...' : 'Confirm Load Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

