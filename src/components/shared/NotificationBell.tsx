import { Bell } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useNotificationStore } from '@/stores/notificationStore'
import { cn } from '@/lib/utils'

export function NotificationBell({ href = '/notifications' }: { href?: string }) {
  const { unreadCount } = useNotificationStore()

  return (
    <Link to={href} className="relative inline-flex">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted hover:bg-accent transition-colors">
        <Bell className="h-5 w-5 text-muted-foreground" />
      </div>
      {unreadCount > 0 && (
        <span className={cn(
          'notification-badge',
          unreadCount > 99 ? 'text-[10px]' : 'text-xs'
        )}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
