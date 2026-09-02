import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllGames, createGame, updateGame } from '@/services/games'
import { supabase } from '@/lib/supabase'
import { Gamepad2, Plus, X, Save, Loader2, ExternalLink, ToggleLeft, ToggleRight, Edit2, Upload, Image } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Game } from '@/types'
import { usePermission } from '@/hooks/usePermission'
import { Link as LinkIcon } from 'lucide-react'

const EMPTY_GAME: Partial<Game> = {
  name: '',
  slug: '',
  download_url: '',
  play_now_url: '',
  description: '',
  minimum_amount: 10,
  maximum_amount: 1000,
  is_active: true,
}

async function uploadGameIcon(file: File, gameId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `${gameId}.${ext}`
  const { error } = await supabase.storage
    .from('game-icons')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) throw error
  const { data } = supabase.storage.from('game-icons').getPublicUrl(path)
  // Add timestamp to bust cache
  return `${data.publicUrl}?t=${Date.now()}`
}

function IconUploader({ gameId, currentUrl, onUploaded }: { gameId: string; currentUrl?: string | null; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Icon must be under 2MB'); return }
    setUploading(true)
    try {
      const url = await uploadGameIcon(file, gameId)
      onUploaded(url)
      toast.success('Icon uploaded!')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="h-16 w-16 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0">
        {currentUrl ? (
          <img src={currentUrl} alt="icon" className="w-full h-full object-cover" />
        ) : (
          <Image className="h-6 w-6 text-muted-foreground" />
        )}
      </div>
      <div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-ghost-neon px-3 py-1.5 text-xs flex items-center gap-1.5"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading...' : 'Upload Icon'}
        </button>
        <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG or WEBP — max 2MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  )
}

function GameForm({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: Partial<Game>
  onSave: (data: Partial<Game>) => void
  onCancel: () => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<Partial<Game>>(initial)
  const set = (field: keyof Game, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <div className="space-y-5">
      {/* Icon upload — only for existing games with an ID */}
      {initial.id && (
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Game Icon (100×100)</label>
          <IconUploader
            gameId={initial.id}
            currentUrl={form.logo_url}
            onUploaded={(url) => set('logo_url', url)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Game Name *</label>
          <div className="relative">
            <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="game-input pl-9" placeholder="e.g. Orion Stars" value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Slug *</label>
          <div className="relative">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="game-input pl-9" placeholder="e.g. orion-stars" value={form.slug || ''} onChange={e => set('slug', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Download Link (Optional)</label>
          <div className="relative">
            <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="game-input pl-9" placeholder="https://..." value={form.download_url || ''} onChange={e => set('download_url', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Play Now Link (Optional)</label>
          <div className="relative">
            <Gamepad2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="game-input pl-9" placeholder="https://..." value={form.play_now_url || ''} onChange={e => set('play_now_url', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Description</label>
          <input className="game-input" placeholder="Short description..." value={form.description || ''} onChange={e => set('description', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Min Amount ($)</label>
          <input type="number" className="game-input" value={form.minimum_amount ?? 10} onChange={e => set('minimum_amount', Number(e.target.value))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Max Amount ($)</label>
          <input type="number" className="game-input" value={form.maximum_amount ?? 1000} onChange={e => set('maximum_amount', Number(e.target.value))} />
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-border">
        <button
          type="button"
          onClick={() => onSave(form)}
          disabled={isSaving || !form.name || !form.slug}
          className="btn-neon px-6 py-2 text-sm flex-1"
        >
          {isSaving
            ? <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            : <><Save className="h-4 w-4" /> Save Changes</>
          }
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost-neon px-6 py-2 text-sm">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </div>
  )
}

export default function AdminGamesPage() {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingNew, setAddingNew] = useState(false)
  const canManage = usePermission('manage_games')

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['admin-games'],
    queryFn: fetchAllGames,
  })

  const createMutation = useMutation({
    mutationFn: createGame,
    onSuccess: () => { toast.success('Game created'); setAddingNew(false); qc.invalidateQueries({ queryKey: ['admin-games'] }) },
    onError: () => toast.error('Failed to create game'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Game> }) => updateGame(id, data),
    onSuccess: () => { toast.success('Game updated'); setEditingId(null); qc.invalidateQueries({ queryKey: ['admin-games'] }) },
    onError: () => toast.error('Failed to update game'),
  })

  const toggleActive = (g: Game) =>
    updateMutation.mutate({ id: g.id, data: { is_active: !g.is_active } })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Games</h1>
          <p className="text-sm text-muted-foreground">Manage game platforms and loading limits</p>
        </div>
        {canManage && (
          <button onClick={() => { setAddingNew(true); setEditingId(null) }} className="btn-neon text-sm px-4 py-2">
            <Plus className="h-4 w-4" /> Add Game
          </button>
        )}
      </div>

      {addingNew && (
        <div className="glass-card p-6 border-2 border-primary/30">
          <h3 className="font-bold text-white mb-5 flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" /> New Game
          </h3>
          <GameForm
            initial={EMPTY_GAME}
            onSave={(data) => createMutation.mutate(data as Game)}
            onCancel={() => setAddingNew(false)}
            isSaving={createMutation.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[...Array(7)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {(games as Game[]).map((game) => (
            <div key={game.id} className={cn('glass-card overflow-hidden transition-all', !game.is_active && 'opacity-60')}>
              <div className="p-5 flex items-center gap-4">
                {/* Icon preview */}
                <div className="h-14 w-14 rounded-xl overflow-hidden bg-primary/20 flex items-center justify-center font-bold text-primary font-gaming flex-shrink-0">
                  {game.logo_url ? (
                    <img src={game.logo_url} alt={game.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{game.name.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-gaming font-bold text-white">{game.name}</p>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', game.is_active ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-muted text-muted-foreground border-border')}>
                      {game.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">${game.minimum_amount} – ${game.maximum_amount} • {game.slug}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {game.download_url && (
                      <a href={game.download_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 w-fit">
                        <ExternalLink className="h-3 w-3" /> Download
                      </a>
                    )}
                    {game.play_now_url && (
                      <a href={game.play_now_url} target="_blank" rel="noopener noreferrer" className="text-xs text-neon-green hover:text-neon-green/80 flex items-center gap-1 w-fit">
                        <Gamepad2 className="h-3 w-3" /> Play Now
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setEditingId(editingId === game.id ? null : game.id); setAddingNew(false) }}
                    className={cn(
                      'h-9 w-9 flex items-center justify-center rounded-lg border transition-all',
                      editingId === game.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-white/10'
                    )}
                  >
                    {editingId === game.id ? <X className="h-4 w-4" /> : <Edit2 className="h-4 w-4" />}
                  </button>
                  <button onClick={() => toggleActive(game)} className="transition-all">
                    {game.is_active
                      ? <ToggleRight className="h-8 w-8 text-neon-green" />
                      : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                    }
                  </button>
                </div>
              </div>

              {editingId === game.id && (
                <div className="border-t border-border p-6 bg-card/50">
                  <GameForm
                    initial={game}
                    onSave={(data) => updateMutation.mutate({ id: game.id, data })}
                    onCancel={() => setEditingId(null)}
                    isSaving={updateMutation.isPending}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
