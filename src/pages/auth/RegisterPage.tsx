import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, User, CheckCircle, MessageCircle, Zap, X as XIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Logo } from '@/components/ui/Logo'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be less than 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores allowed'),
  telegram: z.string().optional(),
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
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const refCode = searchParams.get('ref') || ''
  const { allowRegistration } = useSettingsStore()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const usernameValue = watch('username')

  if (!allowRegistration && !refCode) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="glass-card w-full max-w-md p-8 text-center space-y-4 animate-scale-in">
          <Logo className="mx-auto h-12 w-auto mb-6" />
          <div className="mx-auto h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mb-4">
            <XIcon className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-gaming font-bold text-white">Registration Closed</h2>
          <p className="text-muted-foreground">Public registration is currently disabled by the administrator. You need a valid referral link from an existing member to create an account.</p>
          <button onClick={() => navigate('/login')} className="btn-neon px-8 py-2 mt-4">
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Check username availability on blur
  const handleUsernameBlur = async () => {
    if (!usernameValue || usernameValue.length < 3) return
    
    setIsCheckingUsername(true)
    try {
      const { data, error } = await supabase.rpc('check_username_available', {
        username_to_check: usernameValue
      })
      
      if (error) throw error
      setUsernameAvailable(data)
    } catch (err) {
      console.error('Username check failed:', err)
    } finally {
      setIsCheckingUsername(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    if (usernameAvailable === false) {
      toast.error('This username is already taken')
      return
    }

    setIsLoading(true)
    try {
      // Create a dummy email for Supabase Auth to work behind the scenes
      const dummyEmail = `${data.username.toLowerCase()}@users.oscarzone.com`

      const { error } = await supabase.auth.signUp({
        email: dummyEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            username: data.username,
            telegram: data.telegram,
            referral_code_used: refCode || null,
          },
        },
      })
      if (error) throw error
      
      toast.success('Account created successfully!')
      // Redirect to dashboard, supabase will automatically log them in
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="mb-6">
            <Logo iconSize="lg" textClassName="text-xl" />
          </div>
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
              <label className="block text-sm font-medium text-foreground mb-2">Name</label>
              <input
                {...register('full_name')}
                placeholder="John Doe"
                className={cn('game-input', errors.full_name && 'border-destructive')}
              />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  {...register('username')}
                  onBlur={handleUsernameBlur}
                  placeholder="player123"
                  className={cn(
                    'game-input pl-10', 
                    errors.username && 'border-destructive',
                    usernameAvailable === false && 'border-destructive'
                  )}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  {isCheckingUsername ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : usernameAvailable === true ? (
                    <CheckCircle className="h-4 w-4 text-neon-green" />
                  ) : usernameAvailable === false ? (
                    <span className="text-xs text-destructive font-medium">Taken</span>
                  ) : null}
                </div>
              </div>
              {errors.username && <p className="text-xs text-destructive mt-1">{errors.username.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Telegram (Optional)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MessageCircle className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  {...register('telegram')}
                  placeholder="@yourtelegram"
                  className={cn('game-input pl-10', errors.telegram && 'border-destructive')}
                />
              </div>
              {errors.telegram && <p className="text-xs text-destructive mt-1">{errors.telegram.message}</p>}
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
              disabled={isLoading || usernameAvailable === false}
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
