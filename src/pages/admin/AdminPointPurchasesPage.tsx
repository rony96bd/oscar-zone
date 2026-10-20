import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchGamePointPurchases,
  createGamePointPurchase,
  fetchGamePointBalances,
} from '@/services/accounting'
import { fetchGames } from '@/services/games'
import { formatPoints, formatDateTime, cn } from '@/lib/utils'
import {
  Coins,
  Plus,
  Minus,
  Calendar,
  TrendingDown,
  ArrowUpRight,
  Sparkles,
  Gamepad2,
  AlertCircle,
  FileText,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

export default function AdminPointPurchasesPage() {
  const queryClient = useQueryClient()
  const profile = useAuthStore((state) => state.profile)

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'add' | 'remove'>('add')
  const [amount, setAmount] = useState('')
  const [gameId, setGameId] = useState('')
  const [notes, setNotes] = useState('')

  // Queries
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

  // Calculations for aggregate overview
  const totals = useMemo(() => {
    if (!balances) {
      return { balance: 0, added: 0, loaded: 0, cashedOut: 0 }
    }
    return balances.reduce(
      (acc, b) => {
        acc.balance += b.remaining_points
        acc.added += b.total_purchased
        acc.loaded += b.total_loaded
        acc.cashedOut += b.total_cashed_out || 0
        return acc
      },
      { balance: 0, added: 0, loaded: 0, cashedOut: 0 }
    )
  }, [balances])

  // Mutation
  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error('No user session')
      const pts = Number(amount)
      if (!amount || isNaN(pts) || pts <= 0) {
        throw new Error('Please enter a valid points amount')
      }
      if (!gameId) throw new Error('Please select a game')

      // If remove mode, store as negative amount
      const finalAmount = modalMode === 'remove' ? -pts : pts

      await createGamePointPurchase({
        game_id: gameId,
        amount: finalAmount,
        notes: notes.trim() || (modalMode === 'add' ? 'Added points by admin' : 'Deducted points by admin'),
        created_by: profile.id,
      })
    },
    onSuccess: () => {
      toast.success(
        modalMode === 'add'
          ? 'Game points added to inventory successfully!'
          : 'Game points deducted successfully!'
      )
      setShowModal(false)
      setAmount('')
      setGameId('')
      setNotes('')
      queryClient.invalidateQueries({ queryKey: ['point-purchases'] })
      queryClient.invalidateQueries({ queryKey: ['game-point-balances'] })
      queryClient.invalidateQueries({ queryKey: ['active-accounting'] })
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update points')
    },
  })

  const openModal = (mode: 'add' | 'remove', preselectedGameId?: string) => {
    setModalMode(mode)
    if (preselectedGameId) setGameId(preselectedGameId)
    setAmount('')
    setNotes('')
    setShowModal(true)
  }

  const isLoading = purchasesLoading || balancesLoading

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 skeleton rounded-2xl" />
        <div className="h-96 skeleton rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <Coins className="h-6 w-6 text-neon-gold" /> Game Point Balances & Inventory
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Real-time stock ledger per game. Formula: Balance = Added - Loaded out + Cashed out returned.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => openModal('add')}
            className="btn-neon px-4 py-2 text-xs flex items-center gap-1.5 font-bold shadow-lg shadow-primary/20"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Points
          </button>
          <button
            onClick={() => openModal('remove')}
            className="btn-ghost-neon px-3.5 py-2 text-xs flex items-center gap-1.5 font-bold border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
          >
            <Minus className="h-3.5 w-3.5" />
            Remove Points
          </button>
        </div>
      </div>

      {/* 4 Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card p-4 rounded-xl border border-neon-gold/25 bg-neon-gold/5">
          <p className="text-[11px] font-semibold text-neon-gold uppercase tracking-wider mb-1">
            Total Points in Stock
          </p>
          <p className="text-2xl font-bold font-mono text-white">
            {formatPoints(totals.balance)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Across all games</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            Total Points Added
          </p>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            {formatPoints(totals.added)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Purchased from distributors</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-pink-500/25 bg-pink-500/5">
          <p className="text-[11px] font-semibold text-pink-400 uppercase tracking-wider mb-1">
            Loaded Out to Players
          </p>
          <p className="text-2xl font-bold font-mono text-pink-400">
            {formatPoints(totals.loaded)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Orders + Free Plays</p>
        </div>

        <div className="glass-card p-4 rounded-xl border border-cyan-500/25 bg-cyan-500/5">
          <p className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">
            Returned via Cashouts
          </p>
          <p className="text-2xl font-bold font-mono text-cyan-400">
            {formatPoints(totals.cashedOut)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Re-stocked from withdrawals</p>
        </div>
      </div>

      {/* Game Point Balances Table (Exact Match to Reference Video) */}
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-neon-gold" /> Game Point Balances
          </h2>
          <span className="text-xs text-muted-foreground">
            {balances?.length || 0} active game catalogs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                <th className="pb-3">Game</th>
                <th className="pb-3 text-right">Balance</th>
                <th className="pb-3 text-right">Added</th>
                <th className="pb-3 text-right">Loaded Out</th>
                <th className="pb-3 text-right">Cashed Out</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {balances?.map((b) => {
                const isOut = b.remaining_points <= 0
                const isLow = b.remaining_points > 0 && b.remaining_points <= 200

                return (
                  <tr key={b.game_id} className="hover:bg-white/5 transition-colors">
                    {/* Game */}
                    <td className="py-3 font-semibold text-white flex items-center gap-2.5">
                      {b.logo_url ? (
                        <img
                          src={b.logo_url}
                          alt={b.game_name}
                          className="h-8 w-8 rounded-lg object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                          {b.game_name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span>{b.game_name}</span>
                    </td>

                    {/* Balance */}
                    <td className="py-3 text-right">
                      <span
                        className={cn(
                          'text-sm font-bold font-mono',
                          isOut
                            ? 'text-destructive'
                            : isLow
                            ? 'text-orange-400'
                            : 'text-neon-green'
                        )}
                      >
                        {formatPoints(b.remaining_points)}
                      </span>
                    </td>

                    {/* Added */}
                    <td className="py-3 text-right font-mono text-emerald-400 font-semibold">
                      {formatPoints(b.total_purchased)}
                    </td>

                    {/* Loaded Out */}
                    <td className="py-3 text-right font-mono text-pink-400 font-semibold">
                      {formatPoints(b.total_loaded)}
                    </td>

                    {/* Cashed Out */}
                    <td className="py-3 text-right font-mono text-cyan-400 font-semibold">
                      {formatPoints(b.total_cashed_out || 0)}
                    </td>

                    {/* Status */}
                    <td className="py-3 text-center">
                      <span
                        className={cn(
                          'text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase',
                          isOut
                            ? 'bg-destructive/20 text-destructive border-destructive/30'
                            : isLow
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        )}
                      >
                        {isOut ? 'Depleted' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>

                    {/* Quick Actions */}
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openModal('add', b.game_id)}
                          className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Add points to this game"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => openModal('remove', b.game_id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          title="Deduct points from this game"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {balances?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No games configured in catalog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Point History Table */}
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Game Point History
          </h2>
          <span className="text-xs text-muted-foreground">
            {purchases?.length || 0} adjustment log(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-muted-foreground font-semibold uppercase text-[10px]">
                <th className="pb-3">Date & Time</th>
                <th className="pb-3">Game</th>
                <th className="pb-3">Type</th>
                <th className="pb-3 text-right">Change (pts)</th>
                <th className="pb-3">Logged By</th>
                <th className="pb-3">Notes / Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {purchases?.map((p) => {
                const isPositive = Number(p.amount) >= 0

                return (
                  <tr key={p.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 text-muted-foreground whitespace-nowrap">
                      {formatDateTime(p.created_at)}
                    </td>
                    <td className="py-3 font-semibold text-white">
                      {p.game?.name || 'Unknown Game'}
                    </td>
                    <td className="py-3">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                          isPositive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        )}
                      >
                        {isPositive ? 'Add Points' : 'Remove Points'}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold">
                      <span
                        className={
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }
                      >
                        {isPositive ? '+' : ''}
                        {formatPoints(p.amount)}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground">
                      {p.profile?.full_name || 'System / Admin'}
                    </td>
                    <td className="py-3 text-muted-foreground max-w-xs truncate">
                      {p.notes || '—'}
                    </td>
                  </tr>
                )
              })}
              {purchases?.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No points inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Remove Points Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-6 rounded-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="font-gaming font-bold text-lg text-white mb-1 flex items-center gap-2">
              <Coins className="h-5 w-5 text-neon-gold" />
              {modalMode === 'add' ? 'Add Game Points' : 'Remove Game Points'}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {modalMode === 'add'
                ? 'Load purchased inventory points into the game stock balance.'
                : 'Deduct points from the game stock (for corrections or expired points).'}
            </p>

            {/* Mode switch */}
            <div className="flex gap-2 p-1 bg-black/40 rounded-xl mb-4 border border-white/10">
              <button
                type="button"
                onClick={() => setModalMode('add')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  modalMode === 'add'
                    ? 'bg-emerald-600 text-white font-bold shadow'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Points
              </button>
              <button
                type="button"
                onClick={() => setModalMode('remove')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  modalMode === 'remove'
                    ? 'bg-rose-600 text-white font-bold shadow'
                    : 'text-muted-foreground hover:text-white'
                )}
              >
                <Minus className="h-3.5 w-3.5" />
                Remove Points
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-medium text-white mb-1 block">
                  Select Game *
                </label>
                <select
                  className="game-input w-full text-xs"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                >
                  <option value="">-- Choose Game --</option>
                  {games?.map((game) => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-white mb-1 block">
                  Points (pts) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="100"
                  className="game-input w-full text-xs font-mono font-bold"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Specify game points quantity (1 point = 1 credit).
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-white mb-1 block">
                  Reason / Notes
                </label>
                <input
                  type="text"
                  className="game-input w-full text-xs"
                  placeholder={
                    modalMode === 'add'
                      ? 'e.g. Purchased from distributor #1024'
                      : 'e.g. Corrected stock discrepancy'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost-neon px-4 py-2 text-xs"
                disabled={adjustmentMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={() => adjustmentMutation.mutate()}
                className={cn(
                  'px-4 py-2 text-xs font-bold rounded-xl transition-all',
                  modalMode === 'add' ? 'btn-neon' : 'bg-rose-600 hover:bg-rose-500 text-white'
                )}
                disabled={adjustmentMutation.isPending || !amount || !gameId}
              >
                {adjustmentMutation.isPending
                  ? 'Saving...'
                  : modalMode === 'add'
                  ? 'Confirm Add Points'
                  : 'Confirm Remove Points'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
