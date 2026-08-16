import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { APP_NAME } from '@/lib/constants'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send reset email')
    } finally {
      setIsLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen hero-bg flex items-center justify-center px-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 mx-auto mb-4">
            <CheckCircle className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm mb-6">
            We sent a password reset link to <strong>{email}</strong>
          </p>
          <Link to="/login" className="btn-ghost-neon px-6 py-2 text-sm">
            Back to Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 border border-primary/30">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <span className="font-gaming font-bold text-lg text-white">{APP_NAME}</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-muted-foreground text-sm mt-1">Enter your email to receive a reset link</p>
        </div>
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="game-input"
                required
              />
            </div>
            <button type="submit" disabled={isLoading} className="btn-neon w-full py-3">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link to="/login" className="text-primary hover:text-primary/80">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
