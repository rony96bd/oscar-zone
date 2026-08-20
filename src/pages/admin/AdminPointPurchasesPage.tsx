import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchGamePointPurchases, createGamePointPurchase } from '@/services/accounting'
import { fetchGames } from '@/services/games'
import { formatCurrency, formatRelativeTime } from '@/lib/utils'
import { Coins, Plus, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

export default function AdminPointPurchasesPage() {
  const queryClient = useQueryClient()
  const profile = useAuthStore(state => state.profile)
  const [showAddModal, setShowAddModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [gameId, setGameId] = useState('')

  const { data: purchases, isLoading } = useQuery({
    queryKey: ['point-purchases'],
    queryFn: fetchGamePointPurchases,
  })

  const { data: games } = useQuery({
    queryKey: ['admin-games'],
    queryFn: fetchGames,
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("No user profile")
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) throw new Error("Invalid amount")
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
      queryClient.invalidateQueries({ queryKey: ['active-accounting'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to load points')
    }
  })

  if (isLoading) {
    return <div className="h-64 skeleton rounded-xl" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Load Game Points</h1>
          <p className="text-muted-foreground text-sm">Track points purchased from payment agents</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-neon px-4 py-2 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Load Points
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-black/20">
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Game</th>
                <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
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
                  <td className="p-4 font-bold text-white">
                    {formatCurrency(purchase.amount)}
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="font-gaming font-bold text-xl text-white mb-2">Load Game Points</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter the amount of points/dollars you purchased from agents. This will be added to the active settlement cycle as an expense.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">Game</label>
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
                <label className="text-sm font-medium text-white mb-2 block">Amount ($)</label>
                <input 
                  type="number" 
                  className="game-input w-full"
                  placeholder="e.g. 500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowAddModal(false)}
                className="btn-secondary px-4 py-2"
                disabled={addMutation.isPending}
              >
                Cancel
              </button>
              <button 
                onClick={() => addMutation.mutate()}
                className="btn-neon px-4 py-2"
                disabled={addMutation.isPending || !amount || !gameId}
              >
                {addMutation.isPending ? 'Loading...' : 'Confirm Load'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
