import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllFreePlayRequests, updateFreePlayRequestStatus } from '@/services/freePlays'
import { formatCurrency } from '@/lib/utils'
import { Calendar, CheckCircle, XCircle, Search, Gift } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { FreePlayRequest } from '@/types'
import { usePermission } from '@/hooks/usePermission'

export default function AdminFreePlaysPage() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const canManage = usePermission('manage_free_plays')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-free-plays'],
    queryFn: fetchAllFreePlayRequests
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: 'approved' | 'rejected' }) => updateFreePlayRequestStatus(id, status),
    onSuccess: (data) => {
      toast.success(`Request ${data.status} successfully`)
      queryClient.invalidateQueries({ queryKey: ['admin-free-plays'] })
    },
    onError: (err: any) => toast.error(err.message)
  })

  const filteredRequests = requests.filter(req => 
    req.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.game?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Free Play Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage customer free play requests.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search username or game..."
            className="game-input w-full pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 border-b border-border">
              <tr>
                <th className="p-4 font-medium text-muted-foreground">Customer</th>
                <th className="p-4 font-medium text-muted-foreground">Game</th>
                <th className="p-4 font-medium text-muted-foreground">Date</th>
                <th className="p-4 font-medium text-muted-foreground">Status</th>
                <th className="p-4 font-medium text-muted-foreground text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">Loading requests...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground flex flex-col items-center">
                    <Gift className="h-8 w-8 mb-2 opacity-20" />
                    No free play requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => (
                  <tr key={req.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="font-medium text-white">{req.profile?.full_name || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{req.profile?.username}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {req.game?.logo_url ? (
                          <img src={req.game.logo_url} alt={req.game.name} className="h-6 w-6 rounded-md object-cover" />
                        ) : (
                          <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center text-[10px] font-bold text-white">
                            {req.game?.name?.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-white">{req.game?.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(req.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs mt-0.5">{new Date(req.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${req.status === 'approved' ? 'bg-neon-green/10 text-neon-green border-neon-green/20' : req.status === 'rejected' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                        {req.status === 'approved' ? 'Approved' : req.status === 'rejected' ? 'Rejected' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'pending' && canManage && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              if (window.confirm('Have you assigned the free play in the game software?')) {
                                updateStatusMutation.mutate({ id: req.id, status: 'approved' })
                              }
                            }}
                            className="p-1.5 rounded-lg bg-neon-green/10 text-neon-green hover:bg-neon-green hover:text-black transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to reject this request?')) {
                                updateStatusMutation.mutate({ id: req.id, status: 'rejected' })
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
