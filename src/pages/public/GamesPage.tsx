import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchGames } from '@/services/games'
import { GameCard } from '@/components/customer/GameCard'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, Gamepad2 } from 'lucide-react'

export default function GamesPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['games', 'active'],
    queryFn: fetchGames,
  })

  const handleLoadGame = (game: any) => {
    if (isAuthenticated) {
      navigate('/load', { state: { gameId: game.id } })
    } else {
      navigate('/quick-load', { state: { gameId: game.id } })
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
            <Gamepad2 className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-3xl font-gaming font-bold text-gradient-white">Available Games</h1>
        </div>
        <p className="text-muted-foreground">
          Download your game, then load up instantly. Fast, secure, and bonus-eligible.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              onLoadGame={handleLoadGame}
              showDownload
            />
          ))}
        </div>
      )}
    </div>
  )
}
