import { useQuery } from '@tanstack/react-query'
import { fetchAllCustomerGames } from '@/services/games'
import { Joystick, Search, UserPlus, Clock } from 'lucide-react'
import { useState } from 'react'
import { formatRelativeTime } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function AdminCustomerGamesPage() {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'all' | 'requests'>('requests')

  const { data: games = [], isLoading: gamesLoading, refetch: refetchGames } = useQuery({
    queryKey: ['admin-customer-games'],
    queryFn: fetchAllCustomerGames,
  })

  const { data: requests = [], isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ['admin-game-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('game_id_requests')
        .select('*, game:games(name), profile:profiles!customer_id(full_name, email, phone)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
  })

  const handleApproveRequest = async (req: any) => {
    const username = window.prompt(Enter the generated Game ID (Username) for  on :)
    if (!username) return

    try {
      // Create the customer_game record
      const { error: cgError } = await supabase
        .from('customer_games')
        .insert({
          customer_id: req.customer_id,
          game_id: req.game_id,
          username,
          status: 'active'
        })
      if (cgError) throw cgError

      // Mark request as approved
      const { error: reqError } = await supabase
        .from('game_id_requests')
        .update({ status: 'approved' })
        .eq('id', req.id)
      if (reqError) throw reqError

      toast.success('Game ID assigned successfully!')
      refetchRequests()
      refetchGames()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve request')
    }
  }

  const handleRejectRequest = async (reqId: string) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return
    try {
      const { error } = await supabase
        .from('game_id_requests')
        .update({ status: 'rejected' })
        .eq('id', reqId)
      if (error) throw error
      toast.success('Request rejected')
      refetchRequests()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject request')
    }
  }

  const filteredGames = (games as any[]).filter((g: any) =>
    !search || g.username?.toLowerCase().includes(search.toLowerCase()) ||
    g.profile?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-gaming font-bold text-white">Player Accounts</h1>
      </div>

      <div className="flex bg-black/40 p-1 rounded-lg w-fit border border-border">
        <button
          onClick={() => setTab('requests')}
          className={lex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors  + (tab === 'requests' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white')}
        >
          <Clock className="h-4 w-4" />
          Pending Requests
          {requests.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[20px] text-center ml-1">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={lex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors  + (tab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-white')}
        >
          <Joystick className="h-4 w-4" />
          All Accounts
        </button>
      </div>

      {tab === 'requests' ? (
        <div className="space-y-2">
          {requestsLoading ? (
             <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
          ) : requests.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground">No pending game ID requests</div>
          ) : (
            requests.map((req: any) => (
              <div key={req.id} className="glass-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <UserPlus className="h-5 w-5 text-orange-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{req.profile?.full_name} <span className="font-normal text-muted-foreground ml-2">{req.profile?.phone || req.profile?.email}</span></p>
                    <p className="text-xs text-orange-400 mt-0.5">Requested: {req.game?.name} ? {formatRelativeTime(req.created_at)}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApproveRequest(req)} className="btn-primary py-1.5 px-3 text-xs">Assign ID</button>
                  <button onClick={() => handleRejectRequest(req.id)} className="btn-secondary py-1.5 px-3 text-xs text-red-400">Reject</button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search username or player..." className="game-input pl-10" />
          </div>
          {gamesLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 skeleton rounded-xl" />)}</div>
          ) : (
            <div className="space-y-2">
              {filteredGames.map((cg: any) => (
                <div key={cg.id} className="glass-card p-4 flex items-center gap-4">
                  <Joystick className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm">{cg.game?.name} ?" <span className="font-mono text-primary">{cg.username}</span></p>
                    <p className="text-xs text-muted-foreground">{cg.profile?.full_name} · {formatRelativeTime(cg.created_at)}</p>
                  </div>
                  <span className={	ext-xs px-2 py-0.5 rounded-full border  + (cg.status === 'active' ? 'bg-neon-green/20 text-neon-green border-neon-green/30' : 'bg-muted text-muted-foreground border-border')}>{cg.status}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
