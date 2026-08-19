import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import {
  LayoutDashboard, ShoppingBag, Users, Gamepad2, Joystick,
  Gift, CreditCard, UserCheck, MessageCircle, Bell, Send,
  Image, Megaphone, BarChart3, Shield, ClipboardList,
  Settings, LogOut, Menu, X, ChevronRight, Zap, Bot
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
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
      { href: '/admin/customers', label: 'Customers', icon: Users },
      { href: '/admin/chat', label: 'Live Chat', icon: MessageCircle },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { href: '/admin/games', label: 'Games', icon: Gamepad2 },
      { href: '/admin/customer-games', label: 'Player Accounts', icon: Joystick },
      { href: '/admin/payment-methods', label: 'Payments', icon: CreditCard },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/bonuses', label: 'Bonuses & Promos', icon: Gift },
      { href: '/admin/referrals', label: 'Referrals', icon: UserCheck },
      { href: '/admin/banners', label: 'Banners', icon: Image },
      { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/admin/notifications', label: 'Notifications', icon: Bell },
      { href: '/admin/telegram', label: 'Telegram', icon: Bot },
      { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { href: '/admin/users', label: 'Admin Users', icon: Shield },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ClipboardList },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)
  const { profile, signOut } = useAuthStore()
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

  const SidebarContent = () => (
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
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-56 admin-sidebar lg:hidden">
            <SidebarContent />
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
            <Link
              to="/admin/orders"
              className="btn-neon text-xs px-3 py-2"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              New Orders
              {chatUnread > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                  {chatUnread}
                </span>
              )}
            </Link>
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
