import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Gamepad2, Star, HelpCircle, Users, Phone,
  LayoutDashboard, Joystick, ShoppingBag, DollarSign,
  Bell, MessageCircle, User, Settings, LogOut, Menu, X, Zap
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
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
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/earnings', label: 'Earnings', icon: DollarSign },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/chat', label: 'Support', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

const mobileNavLinks = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/my-games', label: 'Games', icon: Joystick },
  { href: '/load', label: 'Load', icon: Zap, primary: true },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/profile', label: 'Profile', icon: User },
]

export function CustomerLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { profile, isAuthenticated, signOut } = useAuthStore()
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

  const navLinks = isAuthenticated ? authNavLinks : publicNavLinks

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
          <Logo iconSize="md" textClassName="text-lg tracking-wide" />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {(isAuthenticated ? authNavLinks.slice(0, 4) : publicNavLinks).map((link) => {
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
                <NotificationBell />
                <Link
                  to="/load"
                  className="hidden sm:flex btn-neon text-xs px-4 py-2"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Load Game
                </Link>
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
                    <Link to="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
                      <User className="h-4 w-4" /> Profile
                    </Link>
                    <Link to="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
                      <Settings className="h-4 w-4" /> Settings
                    </Link>
                    <div className="my-1 border-t border-border" />
                    <button
                      onClick={() => { signOut(); navigate('/') }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" /> Sign Out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-ghost-neon text-sm px-4 py-2">
                  Sign In
                </Link>
                <Link to="/register" className="btn-neon text-sm px-4 py-2">
                  Get Started
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl bg-muted hover:bg-accent transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden glass-card mx-4 mb-4 rounded-xl overflow-hidden animate-slide-up">
            <nav className="py-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors',
                      isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                )
              })}
              {isAuthenticated && (
                <button
                  onClick={() => { signOut(); navigate('/') }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-16">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav - only when authenticated */}
      {isAuthenticated && (
        <nav className="mobile-nav lg:hidden">
          <div className="flex">
            {mobileNavLinks.map((link) => {
              const isActive = location.pathname === link.href
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn('mobile-nav-item', isActive && 'active')}
                >
                  {link.primary ? (
                    <div className="flex flex-col items-center -mt-4">
                      <div className="btn-neon w-14 h-14 rounded-full flex items-center justify-center p-0 shadow-neon-blue">
                        <link.icon className="h-6 w-6" />
                      </div>
                      <span className="mt-1">{link.label}</span>
                    </div>
                  ) : (
                    <>
                      <link.icon className="h-5 w-5" />
                      <span>{link.label}</span>
                    </>
                  )}
                </Link>
              )
            })}
          </div>
        </nav>
      )}

      {/* Footer */}
      {!isAuthenticated && (
        <footer className="border-t border-game-border bg-game-darker py-12 mt-auto">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="col-span-2 md:col-span-1">
                <div className="mb-4">
                  <Logo iconSize="md" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Premium game loading service for US players.
                  Fast, secure, and reliable.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Games</h4>
                <ul className="space-y-2">
                  {['Juwa', 'Orion Stars', 'Firekirin', 'Milkyway', 'Game Vault'].map(g => (
                    <li key={g}><Link to="/games" className="text-xs text-muted-foreground hover:text-primary transition-colors">{g}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Company</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'How It Works', href: '/how-it-works' },
                    { label: 'Promotions', href: '/promotions' },
                    { label: 'Referral Program', href: '/referral' },
                    { label: 'FAQ', href: '/faq' },
                  ].map(l => (
                    <li key={l.href}><Link to={l.href} className="text-xs text-muted-foreground hover:text-primary transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Support</h4>
                <ul className="space-y-2">
                  {[
                    { label: 'Contact Us', href: '/contact' },
                    { label: 'Live Chat', href: '/chat' },
                  ].map(l => (
                    <li key={l.href}><Link to={l.href} className="text-xs text-muted-foreground hover:text-primary transition-colors">{l.label}</Link></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-game-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved. US Players Only.
              </p>
              <p className="text-xs text-muted-foreground">
                Must be 18+ to participate. Play responsibly.
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}
