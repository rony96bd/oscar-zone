import { useQuery } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine, Flame } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getLiveActivities } from '@/services/engagement'
import { formatRelativeTime, formatCurrency } from '@/lib/utils'
import type { LiveActivity } from '@/types'

export function LiveActivityTicker() {
  const { data: activities = [] } = useQuery({
    queryKey: ['live-activities'],
    queryFn: getLiveActivities,
    refetchInterval: 30000,
  })

  if (!activities || activities.length === 0) return null

  const loads = activities.filter(a => a.activity_type === 'load')
  const cashouts = activities.filter(a => a.activity_type !== 'load')

  return (
    <>
      <style>{`
        @keyframes ticker-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker-marquee 90s linear infinite;
        }
        .animate-ticker-reverse {
          animation: ticker-marquee 90s linear infinite reverse;
        }
        .animate-ticker:hover, .animate-ticker-reverse:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      <div className="w-full flex flex-col">
        {/* Game Loads Ticker */}
        {loads.length > 0 && (
          <div className="w-full bg-black/60 border-t border-white/5 py-2 overflow-hidden relative flex items-center">
            <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-[#0d1117] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-[#0d1117] to-transparent z-10 pointer-events-none" />

            <div className="flex w-max animate-ticker whitespace-nowrap">
              {[...loads, ...loads].map((activity, index) => (
                <div key={`load-${activity.created_at}-${index}`} className="flex items-center mx-4 md:mx-8">
                  <span className="flex items-center gap-2 text-xs md:text-sm font-medium text-white/80">
                    <ArrowDownToLine className="h-3.5 w-3.5 md:h-4 md:w-4 text-neon-green" />
                    <span><span className="text-white">{activity.masked_name}</span> loaded <span className="text-neon-green">{formatCurrency(activity.amount)}</span> on {activity.game_name}</span>
                    <span className="text-white/40 text-[10px] md:text-xs">({formatRelativeTime(activity.created_at)})</span>
                  </span>
                  <span className="mx-4 md:mx-8 text-white/20">•</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cashouts Ticker */}
        {cashouts.length > 0 && (
          <div className="w-full bg-black/40 border-y border-white/5 py-2 overflow-hidden relative flex items-center">
            <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-[#0d1117] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-[#0d1117] to-transparent z-10 pointer-events-none" />

            <div className="flex w-max animate-ticker whitespace-nowrap" style={{ animationDirection: 'reverse' }}>
              {[...cashouts, ...cashouts].map((activity, index) => (
                <div key={`cashout-${activity.created_at}-${index}`} className="flex items-center mx-4 md:mx-8">
                  <Link to="/winners-circle" className="flex items-center gap-2 text-xs md:text-sm font-medium text-white/80 hover:text-white transition-colors">
                    <ArrowUpFromLine className="h-3.5 w-3.5 md:h-4 md:w-4 text-neon-gold" />
                    <span><span className="text-white">{activity.masked_name}</span> cashed out <span className="text-neon-gold font-bold">{formatCurrency(activity.amount)}</span> {activity.amount >= 500 && <Flame className="inline h-3.5 w-3.5 text-orange-500 mb-1" />}</span>
                    <span className="text-white/40 text-[10px] md:text-xs">({formatRelativeTime(activity.created_at)})</span>
                  </Link>
                  <span className="mx-4 md:mx-8 text-white/20">•</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
