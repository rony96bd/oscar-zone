import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/services/notifications'
import { useNotificationStore } from '@/stores/notificationStore'
import { Bell, Trash2, CheckCheck } from 'lucide-react'
import { formatRelativeTime, cn } from '@/lib/utils'
import { useEffect } from 'react'

export default function NotificationsPage() {
  const { profile } = useAuthStore()
  const { setNotifications, markAsRead, markAllAsRead, removeNotification } = useNotificationStore()
  const qc = useQueryClient()

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: () => fetchNotifications(profile!.id),
    enabled: !!profile?.id,
  })

  useEffect(() => { if (notifications.length) setNotifications(notifications as any) }, [notifications])

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, id) => { markAsRead(id); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const readAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(profile!.id),
    onSuccess: () => { markAllAsRead(); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: (_, id) => { removeNotification(id); qc.invalidateQueries({ queryKey: ['notifications'] }) },
  })

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-gaming font-bold text-gradient-white">Notifications</h1>
        {(notifications as any[]).some((n: any) => !n.is_read) && (
          <button onClick={() => readAllMutation.mutate()} className="btn-ghost-neon text-sm px-4 py-2">
            <CheckCheck className="h-4 w-4" /> Mark All Read
          </button>
        )}
      </div>
      {(notifications as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Bell className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(notifications as any[]).map((n: any) => (
            <div key={n.id} onClick={() => { if (!n.is_read) readMutation.mutate(n.id) }}
              className={cn('game-card p-4 flex gap-4 cursor-pointer transition-all', !n.is_read && 'border-primary/30 bg-primary/5')}
            >
              <div className={cn('h-2 w-2 rounded-full mt-2 flex-shrink-0', !n.is_read ? 'bg-primary' : 'bg-transparent')} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(n.created_at)}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(n.id) }}
                className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-destructive/20 transition-colors flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
