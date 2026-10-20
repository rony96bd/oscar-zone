import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDownToLine, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Image as ImageIcon, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'
import { fetchAllCashoutRequests, updateCashoutStatus, updateCashoutRequest, deleteCashoutRequest } from '@/services/cashout'
import { sendNotificationToUser } from '@/services/notifications'
import { getScreenshotUrl } from '@/services/payments'
import { formatCurrency, formatRelativeTime, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { usePermission } from '@/hooks/usePermission'
import { useAuthStore } from '@/stores/authStore'
import { CreateCashoutModal } from '@/components/admin/CreateCashoutModal'

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export default function AdminCashoutPage() {
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [noteMap, setNoteMap] = useState<Record<string, string>>({})
  const canManage = usePermission('manage_cashout')
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({})
  const qc = useQueryClient()
  const { profile } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    amount: '',
    game_name: '',
    game_username: '',
    payment_method_name: '',
    payment_detail: '',
    status: 'pending' as 'pending' | 'approved' | 'rejected',
    admin_note: '',
  })

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)

  const [previewQrUrl, setPreviewQrUrl] = useState<string | null>(null)

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-cashout-requests', filter],
    queryFn: () => fetchAllCashoutRequests(filter),
  })

  // Preload QR URLs
  useEffect(() => {
    requests.forEach(async (req: any) => {
      if (req.qr_code_path && !qrUrls[req.id]) {
        const url = await getScreenshotUrl(req.qr_code_path)
        if (url) {
          setQrUrls(prev => ({ ...prev, [req.id]: url }))
        }
      }
    })
  }, [requests, qrUrls])

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, userId, requestNumber }: { id: string; status: 'approved' | 'rejected'; userId: string; requestNumber: string }) => {
      const note = noteMap[id]
      await updateCashoutStatus(id, status, note, profile?.id)
      const title = status === 'approved' ? 'Cashout Approved' : 'Cashout Rejected'
      const message = status === 'approved'
        ? `Your cashout request ${requestNumber} has been approved. Payment will be processed shortly.`
        : `Your cashout request ${requestNumber} has been rejected.${note ? ` Reason: ${note}` : ''}`
      await sendNotificationToUser(userId, title, message, 'support')
    },
    onSuccess: (_, { status }) => {
      toast.success(`Request ${status === 'approved' ? 'approved' : 'rejected'}`)
      qc.invalidateQueries({ queryKey: ['admin-cashout-requests'] })
      setExpandedId(null)
    },
    onError: (err: any) => toast.error(err.message || 'Action failed'),
  })

  const editMutation = useMutation({
    mutationFn: () => updateCashoutRequest(editTarget.id, {
      amount: editForm.amount !== '' ? Number(editForm.amount) : undefined,
      game_name: editForm.game_name.trim() || undefined,
      game_username: editForm.game_username.trim() || undefined,
      payment_method_name: editForm.payment_method_name.trim() || undefined,
      payment_detail: editForm.payment_detail.trim() || undefined,
      status: editForm.status,
      admin_note: editForm.admin_note || undefined,
    }),
    onSuccess: () => {
      toast.success('Cashout request updated successfully')
      setEditTarget(null)
      qc.invalidateQueries({ queryKey: ['admin-cashout-requests'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update cashout request'),
  })

  const deleteMutation = useMutation({
    mutationFn: (targetId: string) => deleteCashoutRequest(targetId),
    onSuccess: (_, deletedId) => {
      toast.success('Cashout request deleted successfully')
      setDeleteTarget(null)
      qc.setQueriesData({ queryKey: ['admin-cashout-requests'] }, (old: any) => {
        if (!Array.isArray(old)) return old
        return old.filter((item: any) => item.id !== deletedId)
      })
      qc.invalidateQueries({ queryKey: ['admin-cashout-requests'] })
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete cashout request'),
  })

  const getStatusClass = (status: string) => {
    if (status === 'approved') return 'bg-neon-green/20 text-neon-green border-neon-green/30'
    if (status === 'rejected') return 'bg-destructive/20 text-destructive border-destructive/30'
    return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
  }

  const filterTabs: { key: FilterStatus; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'all', label: 'All' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white flex items-center gap-2">
            <ArrowDownToLine className="h-6 w-6" /> Cashout Requests
          </h1>
          <p className="text-sm text-muted-foreground">Review and process customer cashout requests</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-neon-gold px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Manual Entry
          </button>
        )}
      </div>

      <CreateCashoutModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} />

      <div className="flex gap-2 flex-wrap">
        {filterTabs.map((tab) => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium border transition-all',
              filter === tab.key ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="glass-card">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center">
            <ArrowDownToLine className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No {filter !== 'all' ? filter : ''} cashout requests</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(requests as any[]).map((req) => (
              <div key={req.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-sm font-mono text-primary font-semibold">{req.request_number}</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 w-fit', getStatusClass(req.status))}>
                        {req.status === 'approved' && <CheckCircle className="h-3 w-3" />}
                        {req.status === 'rejected' && <XCircle className="h-3 w-3" />}
                        {req.status === 'pending' && <Clock className="h-3 w-3" />}
                        {req.status}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(req.created_at)}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Customer</p>
                        <p className="text-white font-medium truncate">{req.profile?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">@{req.profile?.username}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Game</p>
                        <p className="text-white font-medium">{req.game_name}</p>
                        <p className="text-xs text-muted-foreground">{req.game_username}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Amount</p>
                        <p className="text-white font-bold text-base">{formatCurrency(req.amount)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Method</p>
                        <p className="text-white font-medium">{req.payment_method_name}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Send To</p>
                        <p className="text-white font-medium font-mono text-xs break-all">{req.payment_detail}</p>
                      </div>
                    </div>
                    {req.admin_note && (
                      <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
                        <span className="font-medium">Note:</span> {req.admin_note}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap items-center">
                    {req.qr_code_path && qrUrls[req.id] && (
                      <button onClick={() => setPreviewQrUrl(qrUrls[req.id])}
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-400 border border-blue-400/30 px-3 py-1.5 rounded-lg hover:bg-blue-400/10 transition-colors">
                        <ImageIcon className="h-3 w-3" /> View QR
                      </button>
                    )}
                    {canManage && (
                      <>
                        <button
                          onClick={() => {
                            setEditForm({
                              amount: String(req.amount ?? ''),
                              game_name: req.game_name || '',
                              game_username: req.game_username || '',
                              payment_method_name: req.payment_method_name || '',
                              payment_detail: req.payment_detail || '',
                              status: req.status || 'pending',
                              admin_note: req.admin_note || '',
                            })
                            setEditTarget(req)
                          }}
                          className="flex-shrink-0 flex items-center gap-1 text-xs text-primary border border-primary/30 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                          title="Edit Cashout"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(req)}
                          className="flex-shrink-0 flex items-center gap-1 text-xs text-destructive border border-destructive/30 px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                          title="Delete Cashout"
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </>
                    )}
                    {req.status === 'pending' && canManage && (
                      <button onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
                        Action {expandedId === req.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {expandedId === req.id && req.status === 'pending' && canManage && (
                  <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1.5">Admin Note (optional, shown to customer)</label>
                      <input type="text" value={noteMap[req.id] || ''}
                        onChange={(e) => setNoteMap({ ...noteMap, [req.id]: e.target.value })}
                        placeholder="Add a note..." className="game-input w-full text-sm" />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => statusMutation.mutate({ id: req.id, status: 'approved', userId: req.user_id, requestNumber: req.request_number })}
                        disabled={statusMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-neon-green/20 border border-neon-green/40 text-neon-green text-sm font-medium hover:bg-neon-green/30 transition-colors">
                        <CheckCircle className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => statusMutation.mutate({ id: req.id, status: 'rejected', userId: req.user_id, requestNumber: req.request_number })}
                        disabled={statusMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/30 transition-colors">
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Cashout Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditTarget(null)}>
          <div className="glass-card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Edit Cashout Request</h2>
                <p className="text-xs text-muted-foreground font-mono">{editTarget.request_number}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Amount ($)</label>
                <input
                  type="number"
                  step="any"
                  value={editForm.amount}
                  onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
                  className="game-input w-full"
                  placeholder="0.00"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Game Name</label>
                  <input
                    type="text"
                    value={editForm.game_name}
                    onChange={e => setEditForm(f => ({ ...f, game_name: e.target.value }))}
                    className="game-input w-full"
                    placeholder="e.g. Orion Stars"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Game Username</label>
                  <input
                    type="text"
                    value={editForm.game_username}
                    onChange={e => setEditForm(f => ({ ...f, game_username: e.target.value }))}
                    className="game-input w-full"
                    placeholder="In-game username"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Payment Method</label>
                <input
                  type="text"
                  value={editForm.payment_method_name}
                  onChange={e => setEditForm(f => ({ ...f, payment_method_name: e.target.value }))}
                  className="game-input w-full"
                  placeholder="e.g. CashApp, Zelle"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Send To (Payment Detail)</label>
                <input
                  type="text"
                  value={editForm.payment_detail}
                  onChange={e => setEditForm(f => ({ ...f, payment_detail: e.target.value }))}
                  className="game-input w-full font-mono"
                  placeholder="Account / Cashtag / Number"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <select
                  value={editForm.status}
                  onChange={e => setEditForm(f => ({ ...f, status: e.target.value as any }))}
                  className="game-input w-full"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Admin Note</label>
                <textarea
                  value={editForm.admin_note}
                  onChange={e => setEditForm(f => ({ ...f, admin_note: e.target.value }))}
                  className="game-input w-full h-16 resize-none"
                  placeholder="Optional admin note..."
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="flex-1 btn-ghost-neon py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => editMutation.mutate()}
                disabled={editMutation.isPending}
                className="flex-1 btn-neon py-2 text-sm flex items-center justify-center gap-2"
              >
                {editMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Cashout Confirm Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="glass-card w-full max-w-sm p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white">Delete Cashout Request?</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete cashout request <span className="text-white font-mono font-semibold">{deleteTarget.request_number}</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 btn-ghost-neon py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-destructive text-white hover:bg-destructive/80 transition-colors flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Preview Modal */}
      {previewQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setPreviewQrUrl(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreviewQrUrl(null)} className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors">
              <XCircle className="h-8 w-8" />
            </button>
            <img src={previewQrUrl} alt="QR Code" className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/20 shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
