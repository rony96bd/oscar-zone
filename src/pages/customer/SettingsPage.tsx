import { useAuthStore } from '@/stores/authStore'
import { useNavigate, Link } from 'react-router-dom'
import { LogOut, Shield, Bell } from 'lucide-react'

export default function SettingsPage() {
  const { signOut } = useAuthStore()
  const navigate = useNavigate()
  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-gaming font-bold text-gradient-white mb-6">Settings</h1>
        <div className="space-y-3">
          <Link to="/profile" className="game-card p-4 flex items-center gap-3 hover:border-primary/40 transition-all">
            <Shield className="h-5 w-5 text-primary" />
            <div><p className="font-medium text-white">Profile Settings</p><p className="text-xs text-muted-foreground">Update your name and phone</p></div>
          </Link>
          <Link to="/notifications" className="game-card p-4 flex items-center gap-3 hover:border-primary/40 transition-all">
            <Bell className="h-5 w-5 text-neon-gold" />
            <div><p className="font-medium text-white">Notifications</p><p className="text-xs text-muted-foreground">View your notifications</p></div>
          </Link>
          <button onClick={() => { signOut(); navigate('/') }}
            className="game-card w-full p-4 flex items-center gap-3 border-destructive/30 hover:bg-destructive/10 transition-all text-left"
          >
            <LogOut className="h-5 w-5 text-destructive" />
            <div><p className="font-medium text-destructive">Sign Out</p><p className="text-xs text-muted-foreground">Sign out of your account</p></div>
          </button>
        </div>
      </div>
    </div>
  )
}
