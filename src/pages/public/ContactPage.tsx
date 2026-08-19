import { Mail, MessageCircle, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { SUPPORT_EMAIL, SUPPORT_TELEGRAM, SUPPORT_FACEBOOK } from '@/lib/constants'

export default function ContactPage() {
  const { isAuthenticated } = useAuthStore()
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-gaming font-bold text-gradient-white mb-2">Contact & Support</h1>
          <p className="text-muted-foreground">We're here to help you 24/7</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="game-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 mb-4">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-gaming font-bold text-white mb-2">Live Chat</h3>
            <p className="text-sm text-muted-foreground mb-4">Chat with our support team in real time. We are available 24/7.</p>
            <Link to={isAuthenticated ? '/chat' : '/login'} className="btn-neon w-full py-2.5 text-sm flex items-center justify-center">
              Start Chat
            </Link>
          </div>

          <div className="game-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neon-green/20 border border-neon-green/30 mb-4">
              <Mail className="h-5 w-5 text-neon-green" />
            </div>
            <h3 className="font-gaming font-bold text-white mb-2">Email Support</h3>
            <p className="text-sm text-muted-foreground mb-4">Send us an email anytime. We typically respond within minutes.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="btn-neon-green w-full py-2.5 text-sm flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" /> Email Us
            </a>
          </div>

          <div className="game-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30 mb-4">
              <Send className="h-5 w-5 text-blue-400" />
            </div>
            <h3 className="font-gaming font-bold text-white mb-2">Telegram</h3>
            <p className="text-sm text-muted-foreground mb-4">Join our Telegram channel or message our support team 24/7.</p>
            <a href={SUPPORT_TELEGRAM} target="_blank" rel="noreferrer" className="w-full py-2.5 px-4 rounded-xl border border-blue-500 bg-blue-500/20 text-blue-400 font-bold hover:bg-blue-500/30 transition-all flex items-center justify-center gap-2 text-sm">
              <Send className="h-4 w-4" /> Message on Telegram
            </a>
          </div>

          <div className="game-card p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-600/30 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-blue-500"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </div>
            <h3 className="font-gaming font-bold text-white mb-2">Facebook Page</h3>
            <p className="text-sm text-muted-foreground mb-4">Follow our page for the latest updates and message us on Messenger.</p>
            <a href={SUPPORT_FACEBOOK} target="_blank" rel="noreferrer" className="w-full py-2.5 px-4 rounded-xl border border-blue-600 bg-blue-600/20 text-blue-500 font-bold hover:bg-blue-600/30 transition-all flex items-center justify-center gap-2 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              Visit Facebook Page
            </a>
          </div>

        </div>
      </div>
    </div>
  )
}
