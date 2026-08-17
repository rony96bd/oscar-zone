import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['regular', 'daily', 'first_load', 'weekend', 'vip', 'game_specific', 'customer_specific']),
  bonus_percentage: z.coerce.number().min(0).max(100),
  minimum_amount: z.coerce.number().min(0),
  priority: z.coerce.number().min(0),
  is_active: z.boolean(),
})

type FormData = z.infer<typeof schema>

interface PromotionModalProps {
  isOpen: boolean
  onClose: () => void
  initialData?: any
  onSubmit: (data: FormData) => Promise<void>
}

export function PromotionModal({ isOpen, onClose, initialData, onSubmit }: PromotionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      type: 'regular',
      bonus_percentage: 0,
      minimum_amount: 0,
      priority: 0,
      is_active: true,
    },
  })

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        name: initialData.name,
        description: initialData.description || '',
        type: initialData.type,
        bonus_percentage: initialData.bonus_percentage,
        minimum_amount: initialData.minimum_amount,
        priority: initialData.priority,
        is_active: initialData.is_active,
      })
    } else if (isOpen && !initialData) {
      reset({
        name: '',
        description: '',
        type: 'regular',
        bonus_percentage: 0,
        minimum_amount: 0,
        priority: 0,
        is_active: true,
      })
    }
  }, [isOpen, initialData, reset])

  if (!isOpen) return null

  const onSubmitForm = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg rounded-2xl bg-game-dark border border-border p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-white">
          {initialData ? 'Edit Promotion' : 'New Promotion'}
        </h2>

        <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Bonus Name</label>
            <input
              {...register('name')}
              className={cn('game-input', errors.name && 'border-destructive')}
              placeholder="e.g., Summer Special"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Description (Optional)</label>
            <textarea
              {...register('description')}
              className="game-input h-20 resize-none"
              placeholder="Short description..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Type (Rule)</label>
            <select {...register('type')} className="game-input">
              <option value="regular">Regular Bonus</option>
              <option value="first_load">Account First Load (Lifetime)</option>
              <option value="daily">Daily First Load (Today)</option>
              <option value="weekend">Weekend Special</option>
              <option value="vip">VIP Only</option>
            </select>
            {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Bonus %</label>
              <input
                {...register('bonus_percentage')}
                type="number"
                step="0.01"
                className={cn('game-input', errors.bonus_percentage && 'border-destructive')}
              />
              {errors.bonus_percentage && <p className="text-xs text-destructive mt-1">{errors.bonus_percentage.message}</p>}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Min Amount ($)</label>
              <input
                {...register('minimum_amount')}
                type="number"
                step="1"
                className={cn('game-input', errors.minimum_amount && 'border-destructive')}
              />
              {errors.minimum_amount && <p className="text-xs text-destructive mt-1">{errors.minimum_amount.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Priority (Higher runs first)</label>
              <input
                {...register('priority')}
                type="number"
                className={cn('game-input', errors.priority && 'border-destructive')}
              />
            </div>
            <div className="flex items-center pt-8">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('is_active')}
                  className="rounded border-border bg-black/50 text-neon-green focus:ring-neon-green"
                />
                <span className="text-sm text-white">Active</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-neon px-6 py-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? 'Save Changes' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
