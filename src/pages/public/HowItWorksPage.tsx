import { Zap, Download, CreditCard, CheckCircle, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01', icon: Download, title: 'Download Your Game',
      desc: 'Visit our Games page and click the Download button for your preferred game. Install it on your iOS or Android device.',
      color: 'text-blue-400',
    },
    {
      num: '02', icon: Zap, title: 'Select & Enter Username',
      desc: 'Choose your game and enter your in-game username. Registered users can save usernames for faster future loads.',
      color: 'text-primary',
    },
    {
      num: '03', icon: CreditCard, title: 'Choose Payment & Pay',
      desc: 'Select Chime, PayPal, or Cash App. Send the exact amount and take a screenshot of your payment confirmation.',
      color: 'text-neon-gold',
    },
    {
      num: '04', icon: CheckCircle, title: 'Upload Screenshot',
      desc: 'Upload your payment screenshot as proof. This is required for us to process your load.',
      color: 'text-neon-green',
    },
    {
      num: '05', icon: MessageCircle, title: 'We Load Your Account',
      desc: 'Our team verifies your payment and loads your game account — typically within 15–30 minutes during business hours.',
      color: 'text-purple-400',
    },
  ]

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-gaming font-bold text-gradient-white mb-3">How It Works</h1>
          <p className="text-muted-foreground">Loading your game account is simple and takes just a few minutes</p>
        </div>

        <div className="space-y-4">
          {steps.map(({ num, icon: Icon, title, desc, color }) => (
            <div key={num} className="game-card p-6 flex gap-6">
              <div className="flex-shrink-0">
                <div className={`text-4xl font-gaming font-bold opacity-30 ${color}`}>{num}</div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`h-5 w-5 ${color}`} />
                  <h3 className="font-gaming font-bold text-white">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link to="/load" className="btn-neon px-8 py-4 text-base">
            <Zap className="h-5 w-5" /> Start Loading Now
          </Link>
        </div>
      </div>
    </div>
  )
}
