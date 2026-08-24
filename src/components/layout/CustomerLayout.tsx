import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Gamepad2, Star, HelpCircle, Users, Phone,
  LayoutDashboard, Joystick, ShoppingBag, DollarSign,
  Bell, MessageCircle, User, Settings, LogOut, Menu, X, Zap, Shield, ArrowDownToLine, Gift
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { Logo } from '@/components/ui/Logo'
import { APP_NAME } from '@/lib/constants'
import { cn } from '@/lib/utils'

const publicNavLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/games', label: 'Games', icon: Gamepad2 },
  { href: '/promotions', label: 'Promotions', icon: Star },
  { href: '/how-it-works', label: 'How It Works', icon: HelpCircle },
  { href: '/referral', label: 'Refer & Earn', icon: Users },
  { href: '/contact', label: 'Support', icon: Phone },
]

const authNavLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/my-games', label: 'My Games', icon: Joystick },
  { href: '/load', label: 'Load Game', icon: Zap },
  { href: '/cashout', label: 'Cashout', icon: ArrowDownToLine },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/free-play', label: 'Free Play', icon: Gift },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/chat', label: 'Support', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

const mobileNavLinks = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/my-games', label: 'Games', icon: Joystick },
  { href: '/load', label: 'Load', icon: Zap, primary: true },
  { href: '/cashout', label: 'Cashout', icon: ArrowDownToLine },
  { href: '/profile', label: 'Profile', icon: User },
]

// Identify paths that belong to the customer dashboard context
const isDashboardPath = (path: string) => {
  return [
    '/dashboard', '/my-games', '/load', '/cashout', '/orders', 
    '/earnings', '/notifications', '/chat', '/profile', '/settings'
  ].some(p => path === p || path.startsWith(p + '/'))
}

export function CustomerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { profile, isAuthenticated, isAdmin, signOut } = useAuthStore()
  const { allowRegistration } = useSettingsStore()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const handleLogout = async () => {
    await signOut()
    navigate('/')
  }

  const isDashboardView = isDashboardPath(location.pathname)

  // Show public links on public pages, show auth links only when in dashboard context and not admin
  const showAuthLinks = isAuthenticated && isDashboardView && !isAdmin()
  const navLinks = showAuthLinks ? authNavLinks : publicNavLinks

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-game-dark/95 backdrop-blur-xl border-b border-game-border'
            : 'bg-transparent'
        )}
      >
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <Link to="/">
            <Logo iconSize="md" textClassName="text-lg tracking-wide" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {(showAuthLinks ? authNavLinks.slice(0, 5) : publicNavLinks).map((link) => {
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {!isAdmin() && <NotificationBell />}
                {isAdmin() && !isDashboardView && (
                   <Link to="/admin" className="hidden sm:flex btn-neon text-xs px-4 py-2 bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500/30">
                     <Shield className="h-3.5 w-3.5" />
                     Admin Panel
                   </Link>
                )}
                {!isAdmin() && !isDashboardView && (
                   <Link to="/dashboard" className="hidden sm:flex btn-neon text-xs px-4 py-2">
                     <LayoutDashboard className="h-3.5 w-3.5" />
                     Dashboard
                   </Link>
                )}
                <div className="relative group">
                  <button className="flex items-center gap-2 rounded-xl p-2 hover:bg-white/5 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {profile?.full_name?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span className="hidden sm:block text-sm font-medium text-foreground">
                      {profile?.full_name?.split(' ')[0] || 'User'}
                    </span>
                  </button>
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-2 w-48 glass-card py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 shadow-2xl">
                    {!isAdmin() && (
                      <>
                        {authNavLinks.slice(5).map(link => (
                          <Link key={link.href} to={link.href} className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
                            <link.icon className="h-4 w-4" /> {link.label}
                          </Link>
                        ))}
                      </>
                    )}
                    {isAdmin() ? (
                      <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
                        <Shield className="h-4 w-4" /> Admin Panel
                      </Link>
                    ) : (
                      <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-neon px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm">
                  Sign In
                </Link>
                {allowRegistration && (
                  <Link to="/register" className="hidden sm:flex btn-neon px-4 py-2 text-sm">
                    Sign Up
                  </Link>
                )}
              </div>
            )}
            
            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden p-2 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300',
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-64 glass-card border-l border-white/10 p-6 flex flex-col transition-transform duration-300',
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-8">
            <span className="font-gaming font-bold text-lg text-white">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-muted-foreground hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                  )}
                >
                  <link.icon className="h-5 w-5" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
          
          {!isAuthenticated && (
            <div className="mt-auto space-y-3 pt-6 border-t border-white/10">
              <Link to="/login" className="btn-neon w-full justify-center">Log In</Link>
              {allowRegistration && (
                <Link to="/register" className="btn-neon w-full justify-center">Sign Up</Link>
              )}
            </div>
          )}
          {isAuthenticated && (
             <div className="mt-auto pt-6 border-t border-white/10">
               {!isAdmin() && !isDashboardView && (
                 <Link to="/dashboard" className="btn-neon w-full justify-center mb-3">
                   <LayoutDashboard className="h-4 w-4 mr-2" /> Dashboard
                 </Link>
               )}
               {isAdmin() && !isDashboardView && (
                 <Link to="/admin" className="btn-neon w-full justify-center mb-3 bg-purple-500/20 text-purple-400 border-purple-500/50">
                   <Shield className="h-4 w-4 mr-2" /> Admin Panel
                 </Link>
               )}
               <button onClick={handleLogout} className="btn-ghost text-destructive hover:bg-destructive/10 w-full justify-center">
                 <LogOut className="h-4 w-4 mr-2" /> Sign Out
               </button>
             </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 pt-16 relative z-10">
        <Outlet />
      </main>
      
      {/* Bottom Navigation App Bar (Mobile Only) - Only for authenticated customers on dashboard views */}
      {showAuthLinks && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-game-darker/95 backdrop-blur-xl border-t border-game-border pb-safe">
          <div className="flex items-center justify-around h-16 px-2">
            {mobileNavLinks.map((link) => {
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors',
                    link.primary ? '-mt-6 relative' : ''
                  )}
                >
                  {link.primary ? (
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.5)] border-4 border-game-darker">
                      <link.icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                  ) : (
                    <>
                      <link.icon className={cn(
                        "h-5 w-5",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )} />
                      <span className={cn(
                        "text-[10px] font-medium",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}>
                        {link.label}
                      </span>
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
