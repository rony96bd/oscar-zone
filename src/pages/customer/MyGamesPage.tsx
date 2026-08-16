import { useQuery } from '@tanstack/react-query'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { fetchCustomerGames } from '@/services/games'
import { SavedGameCard } from '@/components/customer/GameCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Joystick, Plus } from 'lucide-react'

export default function MyGamesPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['customer-games', profile?.id],
    queryFn: () => fetchCustomerGames(profile!.id),
    enabled: !!profile?.id,
  })

  return (
    <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-gradient-white">My Games</h1>
          <p className="text-muted-foreground text-sm mt-1">Your saved game accounts</p>
        </div>
        <Link to="/contact" className="btn-ghost-neon text-sm px-4 py-2">
          <Plus className="h-4 w-4" /> Add Game
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : games.length === 0 ? (
        <EmptyState
          icon={<Joystick className="h-12 w-12" />}
          title="No games yet"
          description="Contact our support team to add your game accounts."
          action={<Link to="/contact" className="btn-neon px-6 py-3">Contact Support</Link>}
        />
      ) : (
        <div className="space-y-4">
          {games.map((cg: any) => (
            <SavedGameCard
              key={cg.id}
              gameName={cg.game?.name || 'Game'}
              gameSlug={cg.game?.slug || ''}
              username={cg.username}
              logoUrl={cg.game?.logo_url}
              onLoad={() => navigate('/load', { state: { customerGameId: cg.id, gameId: cg.game_id } })}
            />
          ))}
        </div>
      )}
    </div>
  )
}
