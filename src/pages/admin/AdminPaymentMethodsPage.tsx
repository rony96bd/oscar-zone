import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPaymentMethods, updatePaymentMethod } from '@/services/payments'
import { CreditCard, ToggleLeft, ToggleRight } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPaymentMethodsPage() {
  const qc = useQueryClient()
  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['admin-payment-methods'],
    queryFn: fetchAllPaymentMethods,
  })
  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updatePaymentMethod(id, { is_active }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-payment-methods'] }) },
  })
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-gaming font-bold text-white">Payment Methods</h1>
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {(methods as any[]).map((m: any) => (
            <div key={m.id} className="glass-card p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 font-bold text-primary">{m.name.substring(0, 2)}</div>
              <div className="flex-1">
                <p className="font-semibold text-white">{m.name}</p>
                <p className="text-xs text-primary font-mono">{m.tag}</p>
                {m.account_name && <p className="text-xs text-muted-foreground">{m.account_name}</p>}
              </div>
              <button onClick={() => toggleMutation.mutate({ id: m.id, is_active: !m.is_active })}>
                {m.is_active ? <ToggleRight className="h-8 w-8 text-neon-green" /> : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
