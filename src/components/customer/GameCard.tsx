import { ExternalLink, Gamepad2, Zap, Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Game } from '@/types'
import { cn } from '@/lib/utils'

// Game color themes
const GAME_THEMES: Record<string, { gradient: string; glow: string; accent: string }> = {
  juwa: {
    gradient: 'from-blue-900/50 to-blue-600/20',
    glow: 'rgba(59,130,246,0.4)',
    accent: '#3b82f6',
  },
  'orion-stars': {
    gradient: 'from-purple-900/50 to-purple-600/20',
    glow: 'rgba(168,85,247,0.4)',
    accent: '#a855f7',
  },
  firekirin: {
    gradient: 'from-orange-900/50 to-red-600/20',
    glow: 'rgba(249,115,22,0.4)',
    accent: '#f97316',
  },
  milkyway: {
    gradient: 'from-cyan-900/50 to-cyan-600/20',
    glow: 'rgba(6,182,212,0.4)',
    accent: '#06b6d4',
  },
  'game-vault': {
    gradient: 'from-yellow-900/50 to-amber-600/20',
    glow: 'rgba(245,158,11,0.4)',
    accent: '#f59e0b',
  },
  'game-room': {
    gradient: 'from-green-900/50 to-emerald-600/20',
    glow: 'rgba(16,185,129,0.4)',
    accent: '#10b981',
  },
  'cash-frenzy': {
    gradient: 'from-pink-900/50 to-rose-600/20',
    glow: 'rgba(244,63,94,0.4)',
    accent: '#f43f5e',
  },
}

interface GameCardProps {
  game: Game
  onLoadGame?: (game: Game) => void
  compact?: boolean
  showDownload?: boolean
}

export function GameCard({ game, onLoadGame, compact = false, showDownload = true }: GameCardProps) {
  const theme = GAME_THEMES[game.slug] || {
    gradient: 'from-primary/20 to-primary/5',
    glow: 'rgba(0,212,255,0.4)',
    accent: '#00d4ff',
  }

  const gameInitials = game.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        'game-card group flex flex-col',
        compact ? 'p-4' : 'p-5'
      )}
      style={{ '--game-glow': theme.glow } as React.CSSProperties}
    >
      {/* Card background gradient */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-40 pointer-events-none transition-opacity group-hover:opacity-60',
          theme.gradient
        )}
      />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {game.logo_url ? (
            <img
              src={game.logo_url}
              alt={game.name}
              className={cn(
                'rounded-xl object-cover',
                compact ? 'h-10 w-10' : 'h-14 w-14'
              )}
            />
          ) : (
            <div
              className={cn(
                'rounded-xl flex items-center justify-center font-bold font-gaming text-white',
                compact ? 'h-10 w-10 text-sm' : 'h-14 w-14 text-lg'
              )}
              style={{ background: `linear-gradient(135deg, ${theme.accent}40, ${theme.accent}20)`, border: `1px solid ${theme.accent}40` }}
            >
              {gameInitials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              'font-bold font-gaming text-white truncate',
              compact ? 'text-base' : 'text-lg'
            )}>
              {game.name}
            </h3>
            {!compact && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Load ${game.minimum_amount} – ${game.maximum_amount}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {!compact && game.description && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2">
            {game.description}
          </p>
        )}

        {/* Actions */}
        <div className={cn('flex gap-2', compact ? 'mt-2' : 'mt-auto pt-2')}>
          {onLoadGame && (
            <button
              onClick={() => onLoadGame(game)}
              className="btn-neon flex-1 text-xs py-2.5"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}80)`,
                boxShadow: `0 0 16px ${theme.glow}, 0 4px 12px rgba(0,0,0,0.3)`,
                borderColor: `${theme.accent}60`,
              }}
            >
              <Zap className="h-3.5 w-3.5" />
              LOAD GAME
            </button>
          )}

          {showDownload && game.download_url && (
            <a
              href={game.download_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost-neon px-3 py-2.5 text-xs"
              style={{ borderColor: `${theme.accent}30`, color: theme.accent }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {!compact && 'Download'}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

// Compact saved game card for My Games page
interface SavedGameCardProps {
  gameName: string
  gameSlug: string
  username: string
  onLoad: () => void
  logoUrl?: string | null
  downloadUrl?: string | null
  onRequestFreePlay?: () => void
  freePlayEligible?: boolean
}

export function SavedGameCard({ gameName, gameSlug, username, onLoad, logoUrl, downloadUrl, onRequestFreePlay, freePlayEligible }: SavedGameCardProps) {
  const theme = GAME_THEMES[gameSlug] || {
    gradient: 'from-primary/20 to-primary/5',
    glow: 'rgba(0,212,255,0.4)',
    accent: '#00d4ff',
  }
  const initials = gameName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="game-card p-4 flex flex-col gap-3">
      <div
        className="absolute inset-0 bg-gradient-to-br opacity-30 pointer-events-none"
        style={{ backgroundImage: `linear-gradient(135deg, ${theme.accent}20, transparent)` }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={gameName} className="h-12 w-12 rounded-xl object-cover shrink-0" />
          ) : (
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${theme.accent}40, ${theme.accent}20)`, border: `1px solid ${theme.accent}40` }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="font-semibold text-white text-sm truncate">{gameName}</p>
            <p className="text-xs font-mono mt-0.5 truncate" style={{ color: theme.accent }}>
              {username}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onRequestFreePlay && (
            <button
              onClick={onRequestFreePlay}
              disabled={!freePlayEligible}
              className={`flex-shrink-0 flex items-center justify-center px-3 h-9 rounded-lg border text-xs font-medium transition-colors ${freePlayEligible ? 'bg-white/5 border-white/10 text-muted-foreground hover:text-white hover:bg-white/10' : 'bg-transparent border-transparent text-muted-foreground/30 cursor-not-allowed'}`}
              title={freePlayEligible ? 'Request Free Play' : 'Deposit at least $10 to unlock Free Play'}
            >
              Free Play
            </button>
          )}
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
              title={`Download ${gameName}`}
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={onLoad}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 h-9 rounded-lg text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}80)`,
              color: '#080c14',
              boxShadow: `0 0 12px ${theme.glow}`,
            }}
          >
            <Zap className="h-3.5 w-3.5" />
            LOAD
          </button>
        </div>
      </div>
    </div>
  )
}
