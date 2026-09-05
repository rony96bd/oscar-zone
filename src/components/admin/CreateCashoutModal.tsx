import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2, Search, ArrowDownToLine } from 'lucide-react'
import { fetchCustomers } from '@/services/admin'
import { fetchGames } from '@/services/games'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { sendNotificationToUser } from '@/services/notifications'
import { toast } from 'sonner'

interface CreateCashoutModalProps {
  isOpen: boolean
  onClose: () => void
}

async function adminCreateCashout(payload: {
  user_id: string
  game_name: string
  game_username: string
  amount: number
  payment_method_name: string
  payment_detail: string
  admin_note?: string
  processed_by?: string
}) {
  // Generate request number
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let requestNumber = 'CSH-'
  for (let i = 0; i < 8; i++) requestNumber += chars[Math.floor(Math.random() * chars.length)]

  const { data, error } = await supabase
    .from('cashout_requests')
    .insert({
      request_number: requestNumber,
      user_id: payload.user_id,
      game_name: payload.game_name,
      game_username: payload.game_username,
      amount: payload.amount,
      payment_method_name: payload.payment_method_name,
      payment_detail: payload.payment_detail,
      status: 'approved',
      admin_note: payload.admin_note || 'Manually entered by admin',
      processed_by: payload.processed_by || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export function CreateCashoutModal({ isOpen, onClose }: CreateCashoutModalProps) {
  const { profile } = useAuthStore()
  const qc = useQueryClient()

  const [userId, setUserId] = useState('')
  const [search, setSearch] = useState('')
  const [gameName, setGameName] = useState('')
  const [gameUsername, setGameUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentMethodName, setPaymentMethodName] = useState('')
  const [paymentDetail, setPaymentDetail] = useState('')
  const [adminNote, setAdminNote] = useState('')
  const [notify, setNotify] = useState(true)

  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetchCustomers({ role: 'customer' }),
    enabled: isOpen,
  })

  const { data: games = [] } = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
    enabled: isOpen,
  })

  const filteredCustomers = customers.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.username?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q)
    )
  })

  const selectedCustomer = customers.find(c => c.id === userId)

  const reset = () => {
    setUserId('')
    setSearch('')
    setGameName('')
    setGameUsername('')
    setAmount('')
    setPaymentMethodName('')
    setPaymentDetail('')
    setAdminNote('')
    setNotify(true)
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Please select a customer')
      if (!gameName) throw new Error('Please enter game name')
      if (!gameUsername) throw new Error('Please enter game username')
      if (!amount || isNaN(parseFloat(amount))) throw new Error('Please enter a valid amount')
      if (!paymentMethodName) throw new Error('Please enter payment method')
      if (!paymentDetail) throw new Error('Please enter payment detail (account)')

      const data = await adminCreateCashout({
        user_id: userId,
        game_name: gameName,
        game_username: gameUsername,
        amount: parseFloat(amount),
        payment_method_name: paymentMethodName,
        payment_detail: paymentDetail,
        admin_note: adminNote || undefined,
        processed_by: profile?.id,
      })

      if (notify && selectedCustomer) {
        await sendNotificationToUser(
          userId,
          'Cashout Processed',
          `Your cashout of $${parseFloat(amount).toFixed(2)} from ${gameName} has been processed and approved.`,
          'support'
        )
      }

      return data
    },
    onSuccess: () => {
      toast.success('Cashout entry created and approved successfully!')
      qc.invalidateQueries({ queryKey: ['admin-cashout-requests'] })
      qc.invalidateQueries({ queryKey: ['live-activities'] })
      reset()
      onClose()
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create cashout'),
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg glass-card flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-neon-gold" />
            <h2 className="font-gaming text-lg font-bold text-white">Manual Cashout Entry</h2>
          </div>
          <button onClick={() => { reset(); onClose() }} className="text-muted-foreground hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            এই এন্ট্রিটি সরাসরি <strong className="text-yellow-400">Approved</strong> হিসেবে সেভ হবে এবং Live Ticker-এ দেখা যাবে।
          </p>

          {/* Customer Search & Select */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Customer *</label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, username, email, phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="game-input w-full pl-9 text-sm"
              />
            </div>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              className="game-input w-full"
              size={Math.min(filteredCustomers.length + 1, 5)}
            >
              <option value="">-- Select a customer --</option>
              {filteredCustomers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name || 'N/A'} — @{c.username || '?'} {c.email ? `(${c.email})` : c.phone ? `(${c.phone})` : ''}
                </option>
              ))}
            </select>
            {selectedCustomer && (
              <p className="text-xs text-neon-green mt-1">
                ✓ Selected: <strong>{selectedCustomer.full_name}</strong> (@{selectedCustomer.username})
              </p>
            )}
          </div>

          {/* Game */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Game *</label>
              <select
                value={gameName}
                onChange={e => setGameName(e.target.value)}
                className="game-input w-full"
              >
                <option value="">Select game</option>
                {games.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Game Username *</label>
              <input
                type="text"
                placeholder="In-game username"
                value={gameUsername}
                onChange={e => setGameUsername(e.target.value)}
                className="game-input w-full"
              />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Cashout Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="game-input w-full text-lg font-bold"
            />
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Method *</label>
              <input
                type="text"
                placeholder="e.g. Chime, PayPal, Cash App"
                value={paymentMethodName}
                onChange={e => setPaymentMethodName(e.target.value)}
                className="game-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Sent To (Account) *</label>
              <input
                type="text"
                placeholder="e.g. $username or email"
                value={paymentDetail}
                onChange={e => setPaymentDetail(e.target.value)}
                className="game-input w-full"
              />
            </div>
          </div>

          {/* Admin Note */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">Admin Note (Optional)</label>
            <input
              type="text"
              placeholder="Internal note..."
              value={adminNote}
              onChange={e => setAdminNote(e.target.value)}
              className="game-input w-full text-sm"
            />
          </div>

          {/* Notify toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notify}
              onChange={e => setNotify(e.target.checked)}
              className="sr-only peer"
            />
            <div className="relative w-10 h-5 bg-muted rounded-full peer peer-checked:bg-neon-green transition-colors">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-sm text-muted-foreground">কাস্টমারকে নোটিফিকেশন পাঠাও</span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button type="button" onClick={() => { reset(); onClose() }} className="btn-ghost-neon px-4 py-2">
            Cancel
          </button>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="btn-neon-gold px-6 py-2"
          >
            {createMutation.isPending
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              : <><ArrowDownToLine className="h-4 w-4" /> Save Cashout</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
