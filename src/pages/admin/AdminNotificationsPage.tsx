import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Trash2, Send, Search, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification, sendNotificationToUser } from '@/services/notifications'
import { fetchCustomers } from '@/services/admin'
import { formatRelativeTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/EmptyState'

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'send'>('inbox')
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Notifications Hub</h1>
          <p className="text-sm text-muted-foreground">Manage your system alerts and send notifications to users</p>
        </div>
      </div>

      <div className="flex border-b border-game-border">
        <button
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'inbox' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
          )}
          onClick={() => setActiveTab('inbox')}
        >
          Inbox Alerts
        </button>
        <button
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'send' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-white'
          )}
          onClick={() => setActiveTab('send')}
        >
          Send Notification
        </button>
      </div>

      {activeTab === 'inbox' ? <AdminInboxTab /> : <AdminSendNotificationTab />}
    </div>
  )
}

function AdminInboxTab() {
  const { profile } = useAuthStore()
  const { setNotifications, markAsRead, markAllAsRead, removeNotification, notifications: storeNotifs } = useNotificationStore()
  const qc = useQueryClient()

  // Use the store directly to keep sync with the bell, but we can also fetch fresh
  const { data: notifications = [] } = useQuery({
    queryKey: ['admin-notifications', profile?.id],
    queryFn: () => fetchNotifications(profile!.id),
    enabled: !!profile?.id,
  })

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: (_, id) => { markAsRead(id); qc.invalidateQueries({ queryKey: ['admin-notifications'] }) },
  })

  const readAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(profile!.id),
    onSuccess: () => { markAllAsRead(); qc.invalidateQueries({ queryKey: ['admin-notifications'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: (_, id) => { removeNotification(id); qc.invalidateQueries({ queryKey: ['admin-notifications'] }) },
  })

  const displayNotifs = notifications.length > 0 ? notifications : storeNotifs

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Your Alerts</h2>
        {displayNotifs.some((n: any) => !n.is_read) && (
          <button onClick={() => readAllMutation.mutate()} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            <CheckCheck className="h-3 w-3" /> Mark All Read
          </button>
        )}
      </div>

      {displayNotifs.length === 0 ? (
        <EmptyState icon={<Bell className="h-12 w-12" />} title="No alerts" description="You're all caught up!" />
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {displayNotifs.map((notif: any) => (
            <div
              key={notif.id}
              className={cn(
                'flex items-start justify-between p-4 rounded-xl border transition-colors',
                notif.is_read ? 'bg-white/5 border-white/10' : 'bg-primary/5 border-primary/20'
              )}
            >
              <div className="flex gap-4">
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0',
                  notif.is_read ? 'bg-white/10' : 'bg-primary/20'
                )}>
                  <Bell className={cn("h-5 w-5", notif.is_read ? "text-muted-foreground" : "text-primary")} />
                </div>
                <div>
                  <h4 className={cn("font-medium", notif.is_read ? "text-foreground" : "text-white")}>{notif.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                  <span className="text-[10px] text-muted-foreground mt-2 block">
                    {formatRelativeTime(notif.created_at)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!notif.is_read && (
                  <button
                    onClick={() => readMutation.mutate(notif.id)}
                    className="p-2 hover:bg-white/10 rounded-lg text-primary transition-colors"
                    title="Mark as read"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(notif.id)}
                  className="p-2 hover:bg-destructive/10 rounded-lg text-destructive transition-colors"
                  title="Delete notification"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminSendNotificationTab() {
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<'orders' | 'promotions' | 'referral' | 'support' | 'system'>('system')

  const { data: users = [], isLoading: searching } = useQuery({
    queryKey: ['admin-search-users', search],
    queryFn: () => fetchCustomers({ search }),
    enabled: search.length >= 2,
  })

  const sendMutation = useMutation({
    mutationFn: () => sendNotificationToUser(selectedUser.id, title, message, category),
    onSuccess: () => {
      toast.success(`Notification sent to ${selectedUser.username}`)
      setTitle('')
      setMessage('')
      setSelectedUser(null)
      setSearch('')
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to send notification')
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return toast.error('Please select a user')
    sendMutation.mutate()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Find User</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); }}
            placeholder="Search by username or email..."
            className="game-input pl-10 w-full"
          />
        </div>

        {search.length >= 2 && (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
            {searching ? (
              <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
            ) : (
              users.map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={cn(
                    'w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left',
                    selectedUser?.id === u.id ? 'bg-primary/20 border-primary' : 'bg-white/5 border-transparent hover:bg-white/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-white text-sm">@{u.username}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Compose Message</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {selectedUser && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div>
                <p className="text-xs text-primary">Sending to</p>
                <p className="text-sm font-medium text-white">@{selectedUser.username}</p>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="text-xs text-muted-foreground hover:text-white">
                Change
              </button>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="game-input w-full"
              required
            >
              <option value="system">System Alert</option>
              <option value="orders">Order Update</option>
              <option value="promotions">Promotion</option>
              <option value="support">Support</option>
              <option value="referral">Referral</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="game-input w-full"
              placeholder="E.g., Special Bonus Added!"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="game-input w-full h-24 resize-none"
              placeholder="Type your notification message here..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={!selectedUser || !title || !message || sendMutation.isPending}
            className="btn-neon w-full py-3 flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" />
            {sendMutation.isPending ? 'Sending...' : 'Send Notification'}
          </button>
        </form>
      </div>
    </div>
  )
}
