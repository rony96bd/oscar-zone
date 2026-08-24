import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { fetchCustomerGames } from '@/services/games'
import { checkFreePlayEligibility, requestFreePlay } from '@/services/freePlays'
import { Gift, AlertCircle, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'

export default function FreePlayPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [selectedGameId, setSelectedGameId] = useState('')
  const [isRequesting, setIsRequesting] = useState(false)

  const { data: customerGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['customer-games', profile?.id],
    queryFn: () => fetchCustomerGames(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: eligibility, isLoading: eligibilityLoading } = useQuery({
    queryKey: ['free-play-eligibility', profile?.id],
    queryFn: () => checkFreePlayEligibility(profile!.id),
    enabled: !!profile?.id,
  })

  const handleRequest = async () => {
    if (!profile || !selectedGameId) return
    setIsRequesting(true)
    try {
      await requestFreePlay(profile.id, selectedGameId)
      toast.success('Free Play requested! An admin will review it shortly.')
      setSelectedGameId('')
      queryClient.invalidateQueries({ queryKey: ['free-play-eligibility'] })
    } catch (err: any) {
      toast.error(err.message || 'Failed to request Free Play.')
    } finally {
      setIsRequesting(false)
    }
  }

  if (gamesLoading || eligibilityLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-white/5 rounded-xl border border-border"></div>
        <div className="h-64 bg-white/5 rounded-xl border border-border"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border-neon-gold/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Gift className="w-32 h-32 text-neon-gold" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl font-gaming font-bold text-white mb-2 flex items-center gap-2">
            <Gift className="h-6 w-6 text-neon-gold" />
            Free Play Rewards
          </h1>
          <p className="text-muted-foreground max-w-xl">
            For every  you deposit, you earn one Free Play request. Request your Free Play below and our admins will add credits directly to your game account!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Eligibility Status */}
        <div className="glass-card p-6 border-border flex flex-col items-center text-center justify-center min-h-[250px]">
          {eligibility?.eligible ? (
            <>
              <div className="h-16 w-16 rounded-full bg-neon-green/10 text-neon-green flex items-center justify-center mb-4">
                <Gift className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">You are eligible!</h2>
              <p className="text-muted-foreground mb-4">
                You have <span className="text-neon-green font-bold text-lg">{eligibility.remainingCount}</span> free play request(s) available.
              </p>
            </>
          ) : (
            <>
              <div className="h-16 w-16 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Not eligible yet</h2>
              <p className="text-muted-foreground">
                You do not have any available Free Play requests. Please deposit at least  to unlock your next Free Play.
              </p>
              <Link to="/load" className="btn-neon px-6 py-2 mt-6">
                Deposit Now
              </Link>
            </>
          )}
        </div>

        {/* Request Form */}
        <div className={`glass-card p-6 border-border ${!eligibility?.eligible ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
          <h2 className="text-lg font-bold text-white mb-4">Request Free Play</h2>
          
          {customerGames.length === 0 ? (
            <div className="text-center p-6 bg-black/40 rounded-xl border border-white/5">
              <p className="text-sm text-muted-foreground mb-4">You do not have any active game IDs to request Free Play for.</p>
              <Link to="/my-games" className="text-primary hover:underline text-sm font-medium">Request a Game ID first</Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">Select Game Account</label>
                <div className="grid grid-cols-1 gap-3">
                  {customerGames.map(cg => (
                    <button
                      key={cg.id}
                      onClick={() => setSelectedGameId(cg.game_id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        selectedGameId === cg.game_id 
                          ? 'bg-primary/10 border-primary shadow-[0_0_15px_rgba(0,212,255,0.2)]' 
                          : 'bg-black/40 border-white/5 hover:border-white/20'
                      }`}
                    >
                      {cg.game?.logo_url ? (
                        <img src={cg.game.logo_url} alt={cg.game.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white text-xs">
                          {cg.game?.name?.substring(0,2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-sm text-white">{cg.game?.name}</div>
                        <div className="text-xs font-mono text-muted-foreground">{cg.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleRequest}
                disabled={!selectedGameId || isRequesting || !eligibility?.eligible}
                className="w-full btn-neon py-3 flex items-center justify-center gap-2"
              >
                {isRequesting ? 'Requesting...' : (
                  <>
                    <Zap className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
