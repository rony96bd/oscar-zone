import { useQuery } from '@tanstack/react-query'
import { ArrowDownToLine, ArrowUpFromLine, Flame } from 'lucide-react'
import { getLiveActivities } from '@/services/engagement'
import { formatRelativeTime, formatCurrency } from '@/lib/utils'
import type { LiveActivity } from '@/types'

export function LiveActivityTicker() {
  const { data: activities = [] } = useQuery({
    queryKey: ['live-activities'],
    queryFn: getLiveActivities,
    refetchInterval: 30000, // Refetch every 30s
  })

  if (!activities || activities.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes ticker-marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker-marquee 120s linear infinite;
        }
        .animate-ticker:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="w-full bg-black/60 border-y border-white/5 py-2 overflow-hidden relative flex items-center">
        <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-[#0d1117] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-[#0d1117] to-transparent z-10 pointer-events-none" />
        
        <div className="flex w-max animate-ticker whitespace-nowrap">
          {/* Duplicate the array to make the marquee seamless */}
        {[...activities, ...activities].map((activity, index) => (
          <div key={`${activity.created_at}-${index}`} className="flex items-center mx-4 md:mx-8">
            {activity.activity_type === 'load' ? (
              <span className="flex items-center gap-2 text-xs md:text-sm font-medium text-white/80">
                <ArrowDownToLine className="h-3.5 w-3.5 md:h-4 md:w-4 text-neon-green" />
                <span><span className="text-white">{activity.masked_name}</span> loaded <span className="text-neon-green">{formatCurrency(activity.amount)}</span> on {activity.game_name}</span>
                <span className="text-white/40 text-[10px] md:text-xs">({formatRelativeTime(activity.created_at)})</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-xs md:text-sm font-medium text-white/80">
                <ArrowUpFromLine className="h-3.5 w-3.5 md:h-4 md:w-4 text-neon-gold" />
                <span><span className="text-white">{activity.masked_name}</span> cashed out <span className="text-neon-gold font-bold">{formatCurrency(activity.amount)}</span> {activity.amount >= 500 && <Flame className="inline h-3.5 w-3.5 text-orange-500 mb-1" />}</span>
                <span className="text-white/40 text-[10px] md:text-xs">({formatRelativeTime(activity.created_at)})</span>
              </span>
            )}
            <span className="mx-4 md:mx-8 text-white/20">•</span>
          </div>
        ))}
        </div>
      </div>
    </>
  )
}
