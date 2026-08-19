import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Loader2 } from 'lucide-react'
import { fetchGames } from '@/services/games'
import { fetchPaymentMethods } from '@/services/payments'
import { fetchCustomers } from '@/services/admin'
import { calculateBonusPreview, adminCreateOrder } from '@/services/orders'
import { toast } from 'sonner'

export function CreateOrderModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedGameId, setSelectedGameId] = useState('')
  const [username, setUsername] = useState('')
  const [amount, setAmount] = useState('')
  const [userId, setUserId] = useState('')
  const [status, setStatus] = useState('completed')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const qc = useQueryClient()

  const { data: games } = useQuery({ queryKey: ['games'], queryFn: fetchGames, enabled: isOpen })
  const { data: paymentMethods } = useQuery({ queryKey: ['payment-methods'], queryFn: fetchPaymentMethods, enabled: isOpen })
  const { data: customers } = useQuery({ queryKey: ['customers'], queryFn: () => fetchCustomers({ role: 'customer' }), enabled: isOpen })

  const { data: bonusData } = useQuery({
    queryKey: ['bonus', selectedGameId, parseFloat(amount), userId],
    queryFn: () => calculateBonusPreview(selectedGameId, parseFloat(amount), userId || undefined),
    enabled: !!selectedGameId && parseFloat(amount) > 0 && isOpen,
  })

  const createMutation = useMutation({
    mutationFn: (e: React.FormEvent) => {
      e.preventDefault()
      if (!selectedGameId || !username || !amount || isNaN(parseFloat(amount))) {
        throw new Error('Please fill required fields')
      }
      return adminCreateOrder({
        game_id: selectedGameId,
        username,
        base_amount: parseFloat(amount),
        user_id: userId || undefined,
        total_bonus: bonusData?.total_bonus || 0,
        final_credit: bonusData?.final_credit || parseFloat(amount),
        status: status as any,
        payment_method_id: paymentMethodId || undefined
      })
    },
    onSuccess: () => {
      toast.success('Order created successfully')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      onClose()
      setSelectedGameId('')
      setUsername('')
      setAmount('')
      setUserId('')
      setPaymentMethodId('')
    },
    onError: (err: any) => toast.error(err.message || 'Failed to create order')
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass-card flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-gaming text-lg font-bold text-white">Create Order</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          <form id="create-order-form" onSubmit={createMutation.mutate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Registered Customer (Optional)</label>
              <select 
                value={userId} 
                onChange={e => {
                  setUserId(e.target.value)
                  // Auto-fill username if empty
                  if (e.target.value && !username) {
                    const c = customers?.find(c => c.id === e.target.value)
                    if (c) setUsername(c.full_name || '')
                  }
                }} 
                className="game-input w-full"
              >
                <option value="">-- Guest Order (No User) --</option>
                {customers?.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.email || c.phone || 'No Email'})</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">If selected, the order will appear in their dashboard.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Game *</label>
              <select value={selectedGameId} onChange={e => setSelectedGameId(e.target.value)} className="game-input w-full" required>
                <option value="">Select a game</option>
                {games?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Player Username / ID in Game *</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="game-input w-full" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Amount ($) *</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="game-input w-full" required />
            </div>
            
            <div className="p-3 border border-border rounded-lg bg-black/20 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Payment Method</label>
                <select value={paymentMethodId} onChange={e => setPaymentMethodId(e.target.value)} className="game-input w-full">
                  <option value="">-- None / Manual --</option>
                  {paymentMethods?.map(pm => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="game-input w-full">
                  <option value="completed">Completed</option>
                  <option value="payment_verified">Payment Verified</option>
                  <option value="pending_payment_review">Pending</option>
                </select>
              </div>
            </div>

            {bonusData && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Base Amount:</span>
                  <span className="text-white">${parseFloat(amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-neon-gold">
                  <span>Bonus:</span>
                  <span>+${bonusData.total_bonus.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-neon-green pt-1 border-t border-white/10">
                  <span>Final Credit:</span>
                  <span>${bonusData.final_credit.toFixed(2)}</span>
                </div>
              </div>
            )}
          </form>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost-neon px-4 py-2">Cancel</button>
          <button type="submit" form="create-order-form" disabled={createMutation.isPending} className="btn-neon px-4 py-2">
            {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
