import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, CheckCircle, XCircle, Trophy, Loader2 } from 'lucide-react'
import { fetchAllTestimonials, updateTestimonialStatus } from '@/services/engagement'
import { formatRelativeTime, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import type { Testimonial } from '@/types'

export default function AdminTestimonialsPage() {
  const qc = useQueryClient()
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ['admin-testimonials'],
    queryFn: fetchAllTestimonials,
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, reward_claimed }: { id: string, status: 'approved' | 'rejected' | 'pending', reward_claimed?: boolean }) => {
      return updateTestimonialStatus(id, status, reward_claimed)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-testimonials'] })
      qc.invalidateQueries({ queryKey: ['winners-circle'] })
      toast.success('Testimonial updated')
      setUpdatingId(null)
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update')
      setUpdatingId(null)
    }
  })

  const handleUpdate = (id: string, status: 'approved' | 'rejected' | 'pending', reward_claimed?: boolean) => {
    setUpdatingId(id)
    updateMutation.mutate({ id, status, reward_claimed })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-neon-gold" />
            Winner's Circle (Testimonials)
          </h1>
          <p className="text-sm text-muted-foreground">Manage and approve cashout shares to display on the public page.</p>
        </div>
      </div>

      <div className="bg-game-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-border text-muted-foreground">
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Game & Amount</th>
                <th className="p-4 font-medium">Message</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Reward Claimed?</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td>
                </tr>
              ) : testimonials.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No testimonials yet.</td>
                </tr>
              ) : testimonials.map(t => (
                <tr key={t.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <p className="font-semibold text-white">{t.profiles?.full_name || t.profiles?.username || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(t.created_at)}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-white">{t.game_name}</p>
                    <p className="text-neon-gold font-bold">{formatCurrency(t.amount)}</p>
                  </td>
                  <td className="p-4 max-w-[300px]">
                    {t.message ? (
                      <p className="text-white/80 italic text-xs leading-relaxed">"{t.message}"</p>
                    ) : (
                      <p className="text-muted-foreground text-xs">No message provided</p>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      t.status === 'approved' ? 'bg-neon-green/10 text-neon-green border border-neon-green/20' :
                      t.status === 'rejected' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                      'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleUpdate(t.id, t.status, !t.reward_claimed)}
                      disabled={updatingId === t.id}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        t.reward_claimed 
                          ? 'bg-neon-gold/20 border-neon-gold/40 text-neon-gold'
                          : 'bg-white/5 border-border text-muted-foreground hover:bg-white/10'
                      }`}
                    >
                      {t.reward_claimed ? 'Claimed' : 'Unclaimed'}
                    </button>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {t.status !== 'approved' && (
                        <button
                          onClick={() => handleUpdate(t.id, 'approved', t.reward_claimed)}
                          disabled={updatingId === t.id}
                          className="p-1.5 rounded-lg bg-neon-green/10 text-neon-green hover:bg-neon-green/20 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {t.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdate(t.id, 'rejected', t.reward_claimed)}
                          disabled={updatingId === t.id}
                          className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
