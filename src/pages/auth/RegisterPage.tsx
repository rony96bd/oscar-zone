import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { APP_NAME } from '@/lib/constants'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const refCode = searchParams.get('ref') || ''

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            phone: data.phone,
            referral_code_used: refCode || null,
          },
        },
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md w-full text-center animate-scale-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-green/20 border border-neon-green/30 mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-neon-green" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email!</h2>
          <p className="text-muted-foreground text-sm">
            We sent a confirmation link to your email. Click it to activate your account.
          </p>
          <Link to="/login" className="btn-neon mt-6 inline-flex">
            Go to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
              <Zap className="h-6 w-6 text-primary" style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.8))' }} />
            </div>
            <span className="font-gaming font-bold text-xl text-white">{APP_NAME}</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join thousands of players loading up daily</p>
          {refCode && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-green/15 border border-neon-green/30 text-xs font-medium text-neon-green">
              <CheckCircle className="h-3 w-3" />
              Referral code applied: {refCode}
            </div>
          )}
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
              <input
                {...register('full_name')}
                placeholder="John Smith"
                className={cn('game-input', errors.full_name && 'border-destructive')}
              />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className={cn('game-input', errors.email && 'border-destructive')}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="(555) 000-0000"
                className={cn('game-input', errors.phone && 'border-destructive')}
              />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  className={cn('game-input pr-10', errors.password && 'border-destructive')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Confirm Password</label>
              <input
                {...register('confirm_password')}
                type="password"
                placeholder="Repeat password"
                className={cn('game-input', errors.confirm_password && 'border-destructive')}
              />
              {errors.confirm_password && <p className="text-xs text-destructive mt-1">{errors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-neon w-full py-3 mt-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:text-primary/80">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
