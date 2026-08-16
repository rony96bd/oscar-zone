import { cn } from '@/lib/utils'

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
      {icon && <div className="mb-4 opacity-30">{icon}</div>}
      <p className="text-base font-semibold" style={{ color: 'hsl(210, 40%, 95%)' }}>{title}</p>
      {description && (
        <p className="text-sm mt-1 max-w-sm" style={{ color: 'hsl(210, 20%, 55%)' }}>{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
