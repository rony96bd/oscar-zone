import { Mail, Phone, MessageCircle, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/constants'

export default function ContactPage() {
  const { isAuthenticated } = useAuthStore()
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-gaming font-bold text-gradient-white mb-2">Contact & Support</h1>
          <p className="text-muted-foreground">We're here to help you load and play</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="game-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 mb-4">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-gaming font-bold text-white mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground mb-4">Chat with our support team in real time. Available during business hours.</p>
            <Link to={isAuthenticated ? '/chat' : '/login'} className="btn-neon w-full py-2.5 text-sm">
              Start Chat
            </Link>
          </div>

          <div className="game-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-green/20 border border-neon-green/30 mb-4">
              <Mail className="h-5 w-5 text-neon-green" />
            </div>
            <h3 className="font-gaming font-bold text-white mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-4">Send us an email. We respond within 1 hour during business hours.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-neon-green w-full py-2.5 text-sm flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" /> {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="game-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-gold/20 border border-neon-gold/30 mb-4">
              <Phone className="h-5 w-5 text-neon-gold" />
            </div>
            <h3 className="font-gaming font-bold text-white mb-2">Phone / SMS</h3>
            <p className="text-sm text-muted-foreground mb-4">Call or text us during business hours.</p>
            <a href={`tel:${SUPPORT_PHONE}`} className="btn-neon-gold w-full py-2.5 text-sm flex items-center justify-center gap-2" style={{color: '#080c14'}}>
              <Phone className="h-4 w-4" /> {SUPPORT_PHONE}
            </a>
          </div>

          <div className="game-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 mb-4">
              <Clock className="h-5 w-5 text-purple-400" />
            </div>
            <h3 className="font-gaming font-bold text-white mb-2">Business Hours</h3>
            <div className="space-y-2">
              {[
                { day: 'Monday – Friday', hours: '9:00 AM – 10:00 PM ET' },
                { day: 'Saturday', hours: '10:00 AM – 10:00 PM ET' },
                { day: 'Sunday', hours: '12:00 PM – 8:00 PM ET' },
              ].map(({ day, hours }) => (
                <div key={day} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{day}</span>
                  <span className="text-foreground">{hours}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
