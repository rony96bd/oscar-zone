import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Zap, Eye, EyeOff, Loader2, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { APP_NAME } from '@/lib/constants'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const schema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  const from = location.state?.from?.pathname || '/dashboard'

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)
    try {
      // Reconstruct the dummy email used during registration
      const dummyEmail = `${data.username.toLowerCase()}@oscarzone.system`
      
      const { error } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: data.password,
      })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Incorrect username or password')
        }
        throw error
      }
      
      toast.success('Welcome back!')
      navigate(from, { replace: true })
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign in')
    } finally {
      setIsLoading(false)
    }
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
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  {...register('username')}
                  placeholder="player123"
                  autoComplete="username"
                  className={cn('game-input pl-10', errors.username && 'border-destructive')}
                />
              </div>
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-foreground">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:text-primary/80">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
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

            <button
              type="submit"
              disabled={isLoading}
              className="btn-neon w-full py-3 mt-4"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary font-medium hover:text-primary/80">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
