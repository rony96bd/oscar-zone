import { ExternalLink, Gamepad2, Zap, Download } from 'lucide-react'
import type { Game } from '@/types'
import { cn } from '@/lib/utils'

export const GAME_COLORS: Record<string, { from: string; to: string; border: string; glow: string; accent: string }> = {
  'orion-stars':     { from: '#1a0040', to: '#0d001f', border: '#7c3aed', glow: '#7c3aed80', accent: '#a78bfa' },
  'fire-kirin':      { from: '#3d0000', to: '#1a0000', border: '#dc2626', glow: '#dc262680', accent: '#f87171' },
  'juwa':            { from: '#001a3d', to: '#000d1a', border: '#2563eb', glow: '#2563eb80', accent: '#60a5fa' },
  'ultra-panda':     { from: '#003d1a', to: '#001a0d', border: '#16a34a', glow: '#16a34a80', accent: '#4ade80' },
  'vblink':          { from: '#3d1a00', to: '#1a0d00', border: '#ea580c', glow: '#ea580c80', accent: '#fb923c' },
  'milky-way':       { from: '#1a003d', to: '#0d001a', border: '#9333ea', glow: '#9333ea80', accent: '#c084fc' },
  'game-vault':      { from: '#003d3d', to: '#001a1a', border: '#0891b2', glow: '#0891b280', accent: '#22d3ee' },
}

export function getTheme(slug: string) {
  return GAME_COLORS[slug] || {
    from: '#001a2e', to: '#000d1a', border: '#00d4ff', glow: '#00d4ff80', accent: '#00d4ff'
  }
}

interface GameCardProps {
  game: Game
  onLoadGame?: (game: Game) => void
  showDownload?: boolean
  selected?: boolean
  onClick?: () => void
}

export function GameCard({ game, onLoadGame, showDownload = true, selected, onClick }: GameCardProps) {
  const theme = getTheme(game.slug)

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative group rounded-2xl overflow-hidden transition-all duration-300",
        onClick ? "cursor-pointer hover:-translate-y-1 hover:shadow-2xl" : "",
        selected ? "ring-2 ring-offset-2 ring-offset-background" : ""
      )}
      style={{
        background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
        border: `1px solid ${selected ? theme.border : theme.border + '40'}`,
        boxShadow: selected ? `0 0 24px ${theme.glow}` : `0 4px 24px ${theme.glow}20`,
        ...(selected ? { '--tw-ring-color': theme.border } as any : {})
      }}
    >
      {/* Glow on hover */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300 pointer-events-none",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        style={{ background: `radial-gradient(ellipse at top, ${theme.glow}20, transparent 70%)` }}
      />

      <div className="p-5 flex flex-col items-center gap-4">
        {/* 100x100 Icon */}
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
        <div className="text-center w-full">
          <h3 className="font-gaming font-bold text-white text-base leading-tight truncate">{game.name}</h3>
          {game.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{game.description}</p>
          )}
        </div>

        {/* Actions */}
        {(onLoadGame || showDownload) && (
          <div className="w-full flex flex-col gap-2 mt-auto pt-2">
            {onLoadGame && (
              <button
                onClick={(e) => { e.stopPropagation(); onLoadGame(game) }}
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
            )}
            {showDownload && (game.download_url || game.play_now_url) && (
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
        )}
      </div>
    </div>
  )
}

interface SavedGameCardProps {
  gameName: string
  gameSlug: string
  username: string
  gamePassword?: string
  onLoad: () => void
  logoUrl?: string | null
  downloadUrl?: string | null
  playNowUrl?: string | null
}

export function SavedGameCard({ gameName, gameSlug, username, gamePassword, onLoad, logoUrl, downloadUrl, playNowUrl }: SavedGameCardProps) {
  const theme = getTheme(gameSlug)
  const initials = gameName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="relative group rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl flex flex-col h-full"
      style={{
        background: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
        border: `1px solid ${theme.border}40`,
        boxShadow: `0 4px 24px ${theme.glow}20`,
      }}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top, ${theme.glow}20, transparent 70%)` }}
      />

      <div className="p-5 flex flex-col items-center gap-4 flex-1">
        <div
          className="relative h-20 w-20 rounded-2xl overflow-hidden flex-shrink-0"
          style={{
            border: `2px solid ${theme.border}60`,
            boxShadow: `0 0 20px ${theme.glow}40`,
          }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt={gameName} className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-2xl font-bold font-gaming"
              style={{
                background: `linear-gradient(135deg, ${theme.border}40, ${theme.border}10)`,
                color: theme.accent,
              }}
            >
              {initials}
            </div>
          )}
        </div>

        <div className="text-center w-full">
          <h3 className="font-gaming font-bold text-white text-base leading-tight truncate">{gameName}</h3>
          <div className="mt-2 inline-flex flex-col gap-1 items-center bg-black/20 rounded-lg p-2 px-3 border border-white/5 w-full">
            <p className="text-xs font-mono break-all w-full truncate">
              <span className="text-muted-foreground mr-1">ID:</span>
              <span style={{ color: theme.accent }}>{username}</span>
            </p>
            {gamePassword && (
              <p className="text-xs font-mono break-all w-full truncate">
                <span className="text-muted-foreground mr-1">Pass:</span>
                <span className="text-white font-bold">{gamePassword}</span>
              </p>
            )}
          </div>
        </div>

        <div className="w-full flex flex-col gap-2 mt-auto pt-2">
          <button
            onClick={onLoad}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: `linear-gradient(135deg, ${theme.border}, ${theme.border}80)`,
              color: '#fff',
              boxShadow: `0 0 16px ${theme.glow}`,
            }}
          >
            <Zap className="h-4 w-4" />
            LOAD
          </button>
          
          {(downloadUrl || playNowUrl) && (
            <div className="flex gap-2">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs border transition-all hover:bg-white/5 whitespace-nowrap ${playNowUrl ? 'w-9 flex-shrink-0' : 'flex-1'}`}
                  style={{ borderColor: `${theme.border}30`, color: theme.accent }}
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5 flex-shrink-0" />
                  {!playNowUrl && 'Download'}
                </a>
              )}
              {playNowUrl && (
                <a
                  href={playNowUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs border transition-all hover:bg-white/5 whitespace-nowrap"
                  style={{ borderColor: `${theme.border}30`, color: theme.accent }}
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
