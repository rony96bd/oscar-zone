import { useQuery } from '@tanstack/react-query'
import { fetchAllCustomerGames } from '@/services/games'
import { Joystick, Search } from 'lucide-react'
import { useState } from 'react'
import { formatRelativeTime } from '@/lib/utils'

export default function AdminCustomerGamesPage() {
  const [search, setSearch] = useState('')
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['admin-customer-games'],
    queryFn: fetchAllCustomerGames,
  })
  const filtered = (games as any[]).filter((g: any) =>
    !search || g.username?.toLowerCase().includes(search.toLowerCase()) ||
    g.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-gaming font-bold text-white">Player Accounts</h1>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or player..." className="game-input pl-10" />
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cg: any) => (
            <div key={cg.id} className="glass-card p-4 flex items-center gap-4">
              <Joystick className="h-5 w-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">{cg.game?.name} — <span className="font-mono text-primary">{cg.username}</span></p>
                <p className="text-xs text-muted-foreground">{cg.profile?.full_name} • {formatRelativeTime(cg.created_at)}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${cg.status === 'active' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-muted text-muted-foreground border-border'}`}>{cg.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
