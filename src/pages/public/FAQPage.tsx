import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  { q: 'How fast are loads processed?', a: 'Most loads are processed within 15-30 minutes during business hours (9 AM – 10 PM ET). Overnight orders may take until the next morning.' },
  { q: 'What payment methods do you accept?', a: 'We accept Chime, PayPal (Friends & Family only), and Cash App. We do NOT accept Goods & Services payments as they are non-refundable to us.' },
  { q: 'Do I need an account to load my game?', a: 'No! You can use our Quick Load feature without creating an account. However, creating an account lets you save your game usernames, earn bonuses, track orders, and participate in our referral program.' },
  { q: 'What is the minimum load amount?', a: 'The minimum load amount is $10. Maximum is $1,000 per order. Contact us for larger loads.' },
  { q: 'How do bonuses work?', a: 'All registered users receive a regular bonus (default 10%) on every load. Additional promotional bonuses may apply depending on active offers. The bonus calculation is shown before you submit your order.' },
  { q: 'What is the referral program?', a: 'You earn commission on every load made by people you refer. Level 1 (1-10 referrals): 2%. Level 2 (11-20): 5%. Level 3 (21+): 10% recurring commission.' },
  { q: 'What if my order is rejected?', a: 'Orders are rejected when payment cannot be verified. Common reasons: wrong amount, screenshot unclear, PayPal Goods & Services used. Contact support and we will help resolve the issue.' },
  { q: 'Is this service legal in the US?', a: 'We load sweepstakes game credits which are legal in most US states. Players must be 18+. Some state restrictions may apply. Please check your local laws.' },
  { q: 'How do I contact support?', a: 'You can reach us via live chat on our website, or through our Contact page. We respond within 1 hour during business hours.' },
]

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-gaming font-bold text-gradient-white mb-2">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">Everything you need to know about our service</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="game-card overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <span className="font-medium text-foreground text-sm">{faq.q}</span>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open === i && 'rotate-180')} />
              </button>
              {open === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
