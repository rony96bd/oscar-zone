import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPromotions, createPromotion, updatePromotion, deletePromotion } from '@/services/promotions'
import { Plus, Gift, Edit, ToggleLeft, ToggleRight, Users, Pin, Trash } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'
import { PromotionModal } from '@/components/admin/PromotionModal'
import { PromotionUsersModal } from '@/components/admin/PromotionUsersModal'
import { AssignedUsersList } from '@/components/admin/AssignedUsersList'

export default function AdminBonusesPage() {
  const qc = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPromo, setEditingPromo] = useState<any>(null)
  
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false)
  const [managingUsersPromo, setManagingUsersPromo] = useState<any>(null)

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: fetchAllPromotions,
  })

  const updatePropMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updatePromotion(id, updates),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['admin-promotions'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => {
      toast.success('Promotion deleted')
      qc.invalidateQueries({ queryKey: ['admin-promotions'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete promotion'),
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
  
  const openManageUsers = (promo: any) => {
    setManagingUsersPromo(promo)
    setIsUsersModalOpen(true)
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
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-white">{promo.name}</p>
                      <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">{promo.type}</span>
                      {promo.per_user_limit && (
                        <span className="text-[10px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                          Max Uses: {promo.per_user_limit}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neon-gold font-bold">+{promo.bonus_percentage}% Bonus</p>
                    <p className="text-xs text-muted-foreground">Min: ${promo.minimum_amount}{promo.maximum_amount ? ` / Max: $${promo.maximum_amount}` : ''}</p>
                    
                    {promo.applicable_customer_ids?.length > 0 && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1">
                        <Users className="h-3 w-3" /> 
                        <AssignedUsersList ids={promo.applicable_customer_ids} />
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => openManageUsers(promo)}
                    className="p-2 rounded-lg hover:bg-primary/20 text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 text-xs font-medium"
                    title="Assign specific users"
                  >
                    <Users className="h-4 w-4" /> Users
                  </button>
                  <button
                    onClick={() => {
                      if (promo.is_pinned) {
                        // Unpin
                        updatePropMutation.mutate({ id: promo.id, updates: { is_pinned: false, pin_text: null } })
                      } else {
                        // Pin with custom text
                        const customText = window.prompt('Enter custom text to show at the end of the badge (optional):', '')
                        if (customText !== null) {
                          updatePropMutation.mutate({ id: promo.id, updates: { is_pinned: true, pin_text: customText } })
                        }
                      }
                    }}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-medium ${promo.is_pinned ? 'bg-neon-gold/20 text-neon-gold' : 'hover:bg-white/5 text-muted-foreground hover:text-white'}`}
                    title={promo.is_pinned ? "Unpin from Homepage" : "Pin to Homepage"}
                  >
                    <Pin className="h-4 w-4" /> Pin
                  </button>
                  <button
                    onClick={() => openEdit(promo)}
                    className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this promotion?')) {
                        deleteMutation.mutate(promo.id)
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                    title="Delete Promotion"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => updatePropMutation.mutate({ id: promo.id, updates: { is_active: !promo.is_active } })}
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
      
      <PromotionUsersModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        promotion={managingUsersPromo}
      />
    </div>
  )
}
