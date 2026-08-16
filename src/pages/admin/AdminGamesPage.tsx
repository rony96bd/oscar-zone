import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllGames, createGame, updateGame } from '@/services/games'
import { Gamepad2, Plus, Edit, ExternalLink, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export default function AdminGamesPage() {
  const [editId, setEditId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', slug: '', download_url: '', description: '', minimum_amount: 10, maximum_amount: 1000, is_active: true })
  const qc = useQueryClient()

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['admin-games'],
    queryFn: fetchAllGames,
  })

  const createMutation = useMutation({
    mutationFn: createGame,
    onSuccess: () => { toast.success('Game created'); setShowAdd(false); qc.invalidateQueries({ queryKey: ['admin-games'] }) },
    onError: () => toast.error('Failed to create game'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateGame(id, data),
    onSuccess: () => { toast.success('Game updated'); setEditId(null); qc.invalidateQueries({ queryKey: ['admin-games'] }) },
    onError: () => toast.error('Failed to update game'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-gaming font-bold text-white">Games</h1>
        <button onClick={() => setShowAdd(true)} className="btn-neon text-sm px-4 py-2">
          <Plus className="h-4 w-4" /> Add Game
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(7)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {(games as any[]).map((game: any) => (
            <div key={game.id} className={cn('glass-card p-5', !game.is_active && 'opacity-60')}>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20 font-bold text-primary font-gaming flex-shrink-0">
                  {game.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-gaming font-bold text-white">{game.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', game.is_active ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-muted text-muted-foreground border-border')}>
                      {game.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">${game.minimum_amount} – ${game.maximum_amount} • {game.slug}</p>
                  {game.download_url && (
                    <a href={game.download_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 mt-0.5">
                      <ExternalLink className="h-3 w-3" /> Download Link
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateMutation.mutate({ id: game.id, data: { is_active: !game.is_active } })}
                    className="btn-ghost-neon px-3 py-1.5 text-xs"
                  >
                    {game.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button onClick={() => setEditId(game.id)} className="btn-ghost-neon px-3 py-1.5 text-xs">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
