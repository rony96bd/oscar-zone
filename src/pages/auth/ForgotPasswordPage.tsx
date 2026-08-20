import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { HeadphonesIcon } from 'lucide-react'

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-6">
            <Logo iconSize="lg" textClassName="text-xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-muted-foreground text-sm mt-1">Contact support to reset your password</p>
        </div>
        <div className="glass-card p-8 text-center">
          
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
              <HeadphonesIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <h2 className="text-lg font-bold text-white mb-3">Forgot your password?</h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            For security reasons, password resets are handled manually by our support team. Please contact us via Live Chat or the Support page to get a new password.
          </p>

          <div className="space-y-4">
            <Link to="/contact" className="btn-neon w-full py-3 inline-block">
              Contact Support
            </Link>
            
            <p className="text-center text-sm text-muted-foreground">
              Remember your password?{' '}
              <Link to="/login" className="text-primary hover:text-primary/80">Sign In</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
