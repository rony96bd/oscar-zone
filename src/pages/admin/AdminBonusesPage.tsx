import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPromotions, createPromotion, updatePromotion } from '@/services/promotions'
import { Plus, Gift, Edit, ToggleLeft, ToggleRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { PromotionModal } from '@/components/admin/PromotionModal'

export default function AdminBonusesPage() {
  const qc = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<any>(null)

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: fetchAllPromotions,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      updatePromotion(id, { is_active }),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-promotions'] }) },
  })

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editingPromo) return updatePromotion(editingPromo.id, data)
      return createPromotion(data)
    },
    onSuccess: () => {
      toast.success(editingPromo ? 'Promotion updated' : 'Promotion created')
      qc.invalidateQueries({ queryKey: ['admin-promotions'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to save promotion'),
  })

  const openNew = () => {
    setEditingPromo(null)
    setIsModalOpen(true)
  }

  const openEdit = (promo: any) => {
    setEditingPromo(promo)
    setIsModalOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-gaming font-bold text-white">Bonuses & Promotions</h1>
        <button onClick={openNew} className="btn-neon text-sm px-4 py-2">
          <Plus className="h-4 w-4" /> Add Promotion
        </button>
      </div>
      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-24 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {(promotions as any[]).map((promo: any) => (
            <div key={promo.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-gold/20 border border-neon-gold/30 flex-shrink-0">
                    <Gift className="h-5 w-5 text-neon-gold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{promo.name}</p>
                      <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">{promo.type}</span>
                    </div>
                    <p className="text-sm text-neon-gold font-bold">+{promo.bonus_percentage}% Bonus</p>
                    <p className="text-xs text-muted-foreground">Min: ${promo.minimum_amount}{promo.maximum_amount ? ` / Max: $${promo.maximum_amount}` : ''}</p>
                    {promo.end_date && <p className="text-xs text-muted-foreground">Ends: {formatDate(promo.end_date)}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openEdit(promo)}
                    className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate({ id: promo.id, is_active: !promo.is_active })}
                    className="flex-shrink-0 ml-2"
                  >
                    {promo.is_active
                      ? <ToggleRight className="h-8 w-8 text-neon-green" />
                      : <ToggleLeft className="h-8 w-8 text-muted-foreground" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PromotionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingPromo}
        onSubmit={async (data) => { await saveMutation.mutateAsync(data) }}
      />
    </div>
  )
}
