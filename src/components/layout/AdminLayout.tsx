import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import {
  LayoutDashboard, ShoppingBag, Users, Gamepad2, Joystick,
  Gift, CreditCard, UserCheck, MessageCircle, Bell, Send,
  Image, Megaphone, BarChart3, Shield, ClipboardList, ShieldCheck,
  Settings, LogOut, Menu, X, ChevronRight, Zap, Bot, ArrowDownToLine, DollarSign, Coins, Trophy
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { useNotificationStore } from '@/stores/notificationStore'
import { fetchConversations } from '@/services/chat'
import { notifyNewMessage } from '@/hooks/useChatNotification'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const navSections = [
  {
    label: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true, permission: null },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingBag, permission: 'view_orders' },
      { href: '/admin/cashout', label: 'Cashout', icon: ArrowDownToLine, permission: 'view_cashout' },
      { href: '/admin/cashout-rules', label: 'Cashout Rules', icon: ShieldCheck, permission: 'manage_cashout' },
      { href: '/admin/customers', label: 'Customers', icon: Users, permission: 'view_customers' },
      { href: '/admin/chat', label: 'Live Chat', icon: MessageCircle, permission: 'view_chat' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/games', label: 'Games', icon: Gamepad2, permission: 'view_games' },
      { href: '/admin/customer-games', label: 'Player Accounts', icon: Joystick, permission: 'view_games' },
      { href: '/admin/point-purchases', label: 'Load Game Points', icon: Coins, permission: 'manage_games' },
      { href: '/admin/payment-methods', label: 'Payments', icon: CreditCard, permission: 'manage_orders' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/bonuses', label: 'Bonuses & Promos', icon: Gift, permission: null, adminOnly: true },
      { href: '/admin/free-plays', label: 'Free Plays', icon: Gift, permission: 'view_free_plays' },
      { href: '/admin/referrals', label: 'Referrals', icon: UserCheck, permission: null, adminOnly: true },
      { href: '/admin/testimonials', label: "Winner's Circle", icon: Trophy, permission: 'manage_testimonials' },
      { href: '/admin/banners', label: 'Banners', icon: Image, permission: null, adminOnly: true },
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone, permission: null, adminOnly: true },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/notifications', label: 'Notifications', icon: Bell, permission: 'send_notifications' },
      { href: '/admin/telegram', label: 'Telegram', icon: Bot, permission: null, adminOnly: true },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3, permission: 'view_reports' },
      { href: '/admin/accounting', label: 'Accounting', icon: DollarSign, permission: 'view_reports' },
      { href: '/admin/users', label: 'Admin Users', icon: Shield, permission: null, adminOnly: true },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList, permission: null, adminOnly: true },
      { href: '/admin/settings', label: 'Settings', icon: Settings, permission: null, adminOnly: true },
    ],
  },
]

function AdminNotificationDropdown() {
  const { unreadCount: chatUnread } = useChatStore()
  const { unreadCount: notifUnread, notifications } = useNotificationStore()
  const totalUnread = chatUnread + notifUnread

  const recentNotifs = notifications.slice(0, 3)

  return (
    <div className="relative group">
      <Link to="/admin/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-muted hover:bg-accent transition-colors">
        <Bell className="h-5 w-5 text-muted-foreground" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </Link>

      <div className="absolute right-0 top-full mt-2 w-72 glass-card py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-2xl z-50">
        <div className="px-4 py-2 border-b border-border">
          <h3 className="font-semibold text-white">Notifications</h3>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {totalUnread === 0 && recentNotifs.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
          )}
          
          {chatUnread > 0 && (
            <Link to="/admin/chat" className="flex items-start gap-3 p-3 hover:bg-white/5 border-b border-white/5 transition-colors">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Live Chat</p>
                <p className="text-xs text-muted-foreground">You have {chatUnread} unread message(s)</p>
              </div>
            </Link>
          )}

          {recentNotifs.map(n => (
            <Link key={n.id} to="/admin/notifications" className={`flex flex-col gap-1 p-3 hover:bg-white/5 border-b border-white/5 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}>
              <p className="text-sm font-medium text-white">{n.title}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
            </Link>
          ))}
        </div>
        <div className="p-2 border-t border-border mt-1">
          <Link to="/admin/notifications" className="block w-full text-center py-2 text-sm text-primary hover:bg-white/5 rounded-lg transition-colors">
            View All Notifications
          </Link>
        </div>
      </div>
    </div>
  )
}

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const { profile, signOut, hasPermission, isSupportAgent } = useAuthStore()
  const { unreadCount: chatUnread, setConversations } = useChatStore()
  const { unreadCount: notifUnread } = useNotificationStore()
  const location = useLocation()
  const navigate = useNavigate()

  // Keep track of previous conversations to detect new unread messages
  const prevConvsRef = useRef<Record<string, number>>({})
  const isFirstFetchRef = useRef(true)

  // Global polling for admin chats
  useEffect(() => {
    if (!profile?.id) return
    const poll = async () => {
      try {
        const convs = await fetchConversations(profile.id, 'admin')
        setConversations(convs) // updates the unread badge automatically
        
        // Detect if any conversation has a NEW unread message
        convs.forEach((conv: any) => {
          const prevUnread = prevConvsRef.current[conv.id] ?? conv.unread_count_agent
          if (!isFirstFetchRef.current && conv.unread_count_agent > prevUnread) {
            // It's a new message! Show notification
            const name = conv.guest_name || conv.customer?.full_name || 'Guest'
            notifyNewMessage(`New message from ${name}`, conv.last_message || 'New chat message')
          }
          prevConvsRef.current[conv.id] = conv.unread_count_agent
        })
        
        isFirstFetchRef.current = false
      } catch (err) {
        console.error(err)
      }
    }
    
    poll() // initial fetch
    const interval = setInterval(poll, 5000) // poll every 5s
    return () => clearInterval(interval)
  }, [profile?.id, setConversations])

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return location.pathname === href
    return location.pathname.startsWith(href)
  }

  const sidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center justify-center h-20 border-b border-game-border transition-all duration-300",
        !sidebarOpen && "px-2"
      )}>
        {sidebarOpen ? (
          <div className="flex flex-col items-center text-center">
            <Logo iconSize="lg" textClassName="text-xl block tracking-wide" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary mt-1">Admin Panel</span>
          </div>
        ) : (
          <Logo iconSize="md" textClassName="hidden" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-2">
        {navSections.map((section) => (
          <div key={section.label} className="mb-4">
            {sidebarOpen && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-2 mb-1">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              // Hide admin-only items from staff
              if ((item as any).adminOnly && isSupportAgent()) return null;

              // Hide Settlement History / Accounting from staff entirely
              if (item.href === '/admin/accounting' && isSupportAgent()) return null;
              
              // Hide nav items that require a permission the staff doesn't have
              if (item.permission && isSupportAgent() && !hasPermission(item.permission as any)) return null
              
              const active = isActive(item.href, (item as any).exact)
              const badge = item.label === 'Live Chat' ? chatUnread : item.label === 'Notifications' ? notifUnread : 0
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'sidebar-item mb-0.5',
                    active && 'active',
                    !sidebarOpen && 'justify-center px-2'
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                          {badge > 9 ? '9+' : badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 py-4 border-t border-game-border">
        <div className={cn('flex items-center gap-3 px-2 py-2 rounded-lg', sidebarOpen && 'bg-muted/30')}>
          <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{profile?.full_name?.charAt(0) || 'A'}</span>
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{profile?.full_name || 'Admin'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{profile?.role?.replace('_', ' ')}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={() => { signOut(); navigate('/login') }}
              className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-destructive/20 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'admin-sidebar hidden lg:flex flex-col transition-all duration-300 flex-shrink-0',
          sidebarOpen ? 'w-56' : 'w-16'
        )}
      >
        {sidebarContent()}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-56 admin-sidebar lg:hidden">
            {sidebarContent()}
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-16 px-6 border-b border-game-border bg-game-dark/80 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
            >
              <Menu className="h-4 w-4 text-muted-foreground" />
            </button>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">Admin</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground capitalize">
                {location.pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AdminNotificationDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
