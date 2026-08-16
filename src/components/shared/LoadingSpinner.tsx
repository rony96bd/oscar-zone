import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }
  return (
    <Loader2 className={cn('animate-spin text-primary', sizes[size], className)} />
  )
}

export function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
        </div>
        <p className="text-sm text-muted-foreground font-gaming tracking-wider">LOADING...</p>
      </div>
    </div>
  )
}

export function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <LoadingSpinner size="lg" />
    </div>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 opacity-30">
          {icon}
        </div>
      )}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
