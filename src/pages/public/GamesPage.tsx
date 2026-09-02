import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { fetchGames } from '@/services/games'
import { useAuthStore } from '@/stores/authStore'
import { Loader2, Gamepad2, Zap, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Game } from '@/types'

const GAME_COLORS: Record<string, { from: string; to: string; border: string; glow: string; accent: string }> = {
  'orion-stars':     { from: '#1a0040', to: '#0d001f', border: '#7c3aed', glow: '#7c3aed80', accent: '#a78bfa' },
  'fire-kirin':      { from: '#3d0000', to: '#1a0000', border: '#dc2626', glow: '#dc262680', accent: '#f87171' },
  'juwa':            { from: '#001a3d', to: '#000d1a', border: '#2563eb', glow: '#2563eb80', accent: '#60a5fa' },
  'ultra-panda':     { from: '#003d1a', to: '#001a0d', border: '#16a34a', glow: '#16a34a80', accent: '#4ade80' },
  'vblink':          { from: '#3d1a00', to: '#1a0d00', border: '#ea580c', glow: '#ea580c80', accent: '#fb923c' },
  'milky-way':       { from: '#1a003d', to: '#0d001a', border: '#9333ea', glow: '#9333ea80', accent: '#c084fc' },
  'game-vault':      { from: '#003d3d', to: '#001a1a', border: '#0891b2', glow: '#0891b280', accent: '#22d3ee' },
}

function getTheme(slug: string) {
  return GAME_COLORS[slug] || {
    from: '#001a2e', to: '#000d1a', border: '#00d4ff', glow: '#00d4ff80', accent: '#00d4ff'
  }
}

function GameIconCard({ game, onLoadGame }: { game: Game; onLoadGame: (game: Game) => void }) {
  const theme = getTheme(game.slug)

  return (
    <div
      className="relative group rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
      style={{
        background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
        border: `1px solid ${theme.border}40`,
        boxShadow: `0 4px 24px ${theme.glow}20`,
      }}
    >
      {/* Glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top, ${theme.glow}20, transparent 70%)` }}
      />

      <div className="p-5 flex flex-col items-center gap-4">
        {/* 100×100 Icon */}
        <div
          className="relative h-24 w-24 rounded-2xl overflow-hidden flex-shrink-0"
          style={{
            border: `2px solid ${theme.border}60`,
            boxShadow: `0 0 20px ${theme.glow}40`,
          }}
        >
          {game.logo_url ? (
            <img
              src={game.logo_url}
              alt={game.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-3xl font-bold font-gaming"
              style={{
                background: `linear-gradient(135deg, ${theme.border}40, ${theme.border}10)`,
                color: theme.accent,
              }}
            >
              {game.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Name */}
        <div className="text-center">
          <h3 className="font-gaming font-bold text-white text-base leading-tight">{game.name}</h3>
          {game.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{game.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => onLoadGame(game)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.border}, ${theme.border}80)`,
              color: '#fff',
              boxShadow: `0 0 16px ${theme.glow}`,
            }}
          >
            <Zap className="h-4 w-4" />
            LOAD GAME
          </button>
          {(game.download_url || game.play_now_url) && (
            <div className="flex gap-2">
              {game.download_url && (
                <a
                  href={game.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs border transition-all hover:bg-white/5 whitespace-nowrap ${game.play_now_url ? 'w-9 flex-shrink-0' : 'flex-1'}`}
                  style={{ borderColor: `${theme.border}30`, color: theme.accent }}
                  onClick={e => e.stopPropagation()}
                  title="Download"
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  {!game.play_now_url && 'Download'}
                </a>
              )}
              {game.play_now_url && (
                <a
                  href={game.play_now_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs border transition-all hover:bg-white/5 whitespace-nowrap"
                  style={{ borderColor: `${theme.border}30`, color: theme.accent }}
                  onClick={e => e.stopPropagation()}
                >
                  <Gamepad2 className="h-3.5 w-3.5 flex-shrink-0" />
                  Play Now
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GamesPage() {
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['games', 'active'],
    queryFn: fetchGames,
  })

  const handleLoadGame = (game: Game) => {
    navigate(`/load?game=${game.id}`)
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {games.map((game) => (
            <GameIconCard
              key={game.id}
              game={game}
              onLoadGame={handleLoadGame}
            />
          ))}
        </div>
      )}
    </div>
  )
}
