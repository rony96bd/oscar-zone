import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { fetchCustomerGames, fetchGames } from '@/services/games'
import { SavedGameCard } from '@/components/customer/GameCard'
import { Plus, Joystick } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function MyGamesPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedGameId, setSelectedGameId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: customerGames = [], isLoading: gamesLoading } = useQuery({
    queryKey: ['customer-games', profile?.id],
    queryFn: () => fetchCustomerGames(profile!.id),
    enabled: !!profile?.id,
  })

  const { data: allGames = [] } = useQuery({
    queryKey: ['games'],
    queryFn: fetchGames,
  })

  const handleRequestID = async () => {
    if (!selectedGameId || !profile) return
    setIsSubmitting(true)
    try {
      const selectedGame = allGames.find((g: any) => g.id === selectedGameId)
      // Check if already requested
      const { data: existing } = await supabase
        .from('game_id_requests')
        .select('id')
        .eq('customer_id', profile.id)
        .eq('game_id', selectedGameId)
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) {
        throw new Error('You already have a pending request for this game.')
      }

      // Check if already has active ID
      const hasActive = customerGames.some((cg: any) => cg.game_id === selectedGameId && cg.status === 'active')
      if (hasActive) {
        throw new Error('You already have an active ID for this game.')
      }

      const { error } = await supabase
        .from('game_id_requests')
        .insert({ customer_id: profile.id, game_id: selectedGameId })

      if (error) throw error

      // Notify via Telegram
      supabase.functions.invoke('send-telegram-notification', {
        body: {
          event_type: 'game_id_request',
          customer_name: profile.full_name,
          username: profile.username,
          game_name: selectedGame?.name
        }
      }).catch(console.error)

      toast.success('Game ID request sent! We will assign it shortly.')
      setShowRequestModal(false)
      setSelectedGameId('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send request')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-gradient-white">My Games</h1>
          <p className="text-muted-foreground text-sm mt-1">Your saved game accounts</p>
        </div>
        <button onClick={() => setShowRequestModal(true)} className="btn-primary text-sm px-4 py-2 flex items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Request Game ID
        </button>
      </div>

      {gamesLoading ? (
        <div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : customerGames.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center">
          <Joystick className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-white mb-2">No games yet</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">Request a Game ID to get started playing your favorite games.</p>
          <button onClick={() => setShowRequestModal(true)} className="btn-neon px-6 py-3">Request Game ID</button>
        </div>
      ) : (
        <div className="space-y-4">
          {customerGames.map(cg => (
            <SavedGameCard 
              key={cg.id} 
              gameName={cg.game?.name || 'Unknown Game'}
              gameSlug={cg.game?.slug || ''}
              username={cg.username}
              logoUrl={cg.game?.logo_url}
              downloadUrl={cg.game?.download_url}
              onLoad={() => navigate(`/load?game=${cg.game_id}&username=${cg.username}`)}
            />
          ))}
        </div>
      )}

      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card w-full max-w-md p-6 relative">
            <h2 className="text-xl font-gaming font-bold text-white mb-4">Request Game ID</h2>
            <p className="text-sm text-muted-foreground mb-6">Select a game below. Our team will create a new player account for you and assign it to your profile.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase mb-1">Select Game</label>
                <select 
                  className="game-input"
                  value={selectedGameId}
                  onChange={e => setSelectedGameId(e.target.value)}
                >
                  <option value="">-- Choose a game --</option>
                  {(allGames as any[]).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowRequestModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestID}
                  disabled={!selectedGameId || isSubmitting}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
