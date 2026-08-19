import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  telegram: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  role: z.enum(['customer', 'admin', 'support_agent']),
})

type FormData = z.infer<typeof schema>

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  defaultRole?: 'customer' | 'admin' | 'support_agent'
}

export function CreateUserModal({ isOpen, onClose, defaultRole = 'customer' }: CreateUserModalProps) {
  const qc = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: defaultRole }
  })

  if (!isOpen) return null

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await res.json()
      
      if (!res.ok) throw new Error(result.error || 'Failed to create user')
      
      toast.success('User created successfully')
      
      // Invalidate queries based on role
      if (data.role === 'customer') {
        qc.invalidateQueries({ queryKey: ['admin-customers'] })
      } else {
        qc.invalidateQueries({ queryKey: ['admin-users'] })
      }
      
      reset()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to create user')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md rounded-2xl bg-game-dark border border-border p-6 shadow-2xl animate-scale-in">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-white/10 transition-colors">
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-white">Create {defaultRole === 'customer' ? 'Customer' : 'Admin/Support'}</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Full Name *</label>
            <input {...register('full_name')} className={cn('game-input', errors.full_name && 'border-destructive')} />
            {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Username *</label>
            <input {...register('username')} className={cn('game-input', errors.username && 'border-destructive')} />
            {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Password *</label>
            <input type="text" {...register('password')} className={cn('game-input', errors.password && 'border-destructive')} placeholder="Minimum 6 characters" />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          {defaultRole !== 'customer' && (
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Role *</label>
              <select {...register('role')} className={cn('game-input', errors.role && 'border-destructive')}>
                <option value="admin">Admin</option>
                <option value="support_agent">Support Agent</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Phone (Optional)</label>
              <input {...register('phone')} className="game-input" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Telegram (Optional)</label>
              <input {...register('telegram')} className="game-input" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1 block">Email (Optional)</label>
            <input type="email" {...register('email')} className="game-input" />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-neon px-6 py-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
