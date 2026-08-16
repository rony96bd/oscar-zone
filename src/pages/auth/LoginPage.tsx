import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { APP_NAME } from '@/lib/constants'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const schema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { refreshProfile } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/dashboard'

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) throw error
      await refreshProfile()
      const { profile } = useAuthStore.getState()
      if (profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'support_agent') {
        navigate('/admin')
      } else {
        navigate(from)
      }
      toast.success('Welcome back!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
              <Zap className="h-6 w-6 text-primary" style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.8))' }} />
            </div>
            <span className="font-gaming font-bold text-xl text-white">{APP_NAME}</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your account to continue</p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className={cn('game-input', errors.email && 'border-destructive focus:border-destructive')}
                autoComplete="email"
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={cn('game-input pr-10', errors.password && 'border-destructive')}
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={isLoading}
              className="btn-neon w-full py-3 mt-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don\'t have an account?{' '}
              <Link to="/register" className="text-primary font-medium hover:text-primary/80 transition-colors">
                Create one free
              </Link>
            </p>
          </div>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Want to place an order without an account?{' '}
              <Link to="/quick-load" className="text-primary hover:text-primary/80 transition-colors">
                Quick Load
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
