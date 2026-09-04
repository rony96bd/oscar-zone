import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchAuditLogs } from '@/services/audit'
import { formatDateTime } from '@/lib/utils'
import { Loader2, Search, Filter, RefreshCw, Eye, X, ChevronLeft, ChevronRight } from 'lucide-react'

export default function AdminAuditLogsPage() {
  const { isSupportAgent } = useAuthStore()

  const [page, setPage] = useState(1)
  const limit = 20
  const [filters, setFilters] = useState({
    action: '',
    targetType: '',
    startDate: '',
    endDate: ''
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', page, appliedFilters],
    queryFn: () => fetchAuditLogs(page, limit, appliedFilters),
  })

  // Prevent support agents from viewing this page
  if (isSupportAgent()) {
    return <Navigate to="/admin" replace />
  }

  const handleApplyFilters = () => {
    setPage(1)
    setAppliedFilters(filters)
  }

  const handleClearFilters = () => {
    const cleared = { action: '', targetType: '', startDate: '', endDate: '' }
    setFilters(cleared)
    setAppliedFilters(cleared)
    setPage(1)
  }

  const totalPages = Math.ceil((data?.total || 0) / limit)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-gaming font-bold text-white">Audit Logs</h1>
          <p className="text-muted-foreground text-sm">Monitor staff actions and system changes</p>
        </div>
        <button 
          onClick={() => refetch()} 
          disabled={isFetching}
          className="btn-ghost-neon px-4 py-2 text-sm flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-white">Filters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Action Type</label>
            <input
              type="text"
              placeholder="e.g. approve_cashout"
              value={filters.action}
              onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}
              className="game-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target Type</label>
            <input
              type="text"
              placeholder="e.g. order, game, setting"
              value={filters.targetType}
              onChange={e => setFilters(p => ({ ...p, targetType: e.target.value }))}
              className="game-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => setFilters(p => ({ ...p, startDate: e.target.value }))}
              className="game-input text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => setFilters(p => ({ ...p, endDate: e.target.value }))}
              className="game-input text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-border">
          <button onClick={handleClearFilters} className="btn-ghost-neon px-4 py-2 text-sm">Clear</button>
          <button onClick={handleApplyFilters} className="btn-neon px-6 py-2 text-sm">Apply Filters</button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-black/40 text-muted-foreground border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Timestamp</th>
                <th className="px-6 py-4 font-semibold">Admin (Staff)</th>
                <th className="px-6 py-4 font-semibold">Action</th>
                <th className="px-6 py-4 font-semibold">Target</th>
                <th className="px-6 py-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground mt-2">Loading audit logs...</p>
                  </td>
                </tr>
              ) : data?.logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No logs found matching your criteria.
                  </td>
                </tr>
              ) : (
                data?.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{log.admin?.full_name || log.admin?.username || 'System'}</div>
                      <div className="text-xs text-muted-foreground">{log.admin?.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.target_type ? (
                        <div>
                          <div className="text-white capitalize">{log.target_type.replace('_', ' ')}</div>
                          {log.target_id && <div className="text-xs text-muted-foreground font-mono truncate max-w-[150px]" title={log.target_id}>{log.target_id}</div>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-white inline-flex"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-white">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-medium text-white">{Math.min(page * limit, data?.total || 0)}</span> of{' '}
              <span className="font-medium text-white">{data?.total}</span> results
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-border bg-card hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-border bg-card hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Audit Log Details
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
                  <p className="text-sm text-white">{formatDateTime(selectedLog.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Admin</p>
                  <p className="text-sm text-white">{selectedLog.admin?.full_name || selectedLog.admin?.username || 'System'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Action</p>
                  <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
                    {selectedLog.action}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">IP Address</p>
                  <p className="text-sm text-white font-mono">{selectedLog.ip_address || 'N/A'}</p>
                </div>
              </div>

              {(selectedLog.target_type || selectedLog.target_id) && (
                <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                  <h3 className="text-sm font-semibold text-white mb-3">Target Entity</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Type</p>
                      <p className="text-sm text-white capitalize">{selectedLog.target_type?.replace('_', ' ') || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">ID</p>
                      <p className="text-sm text-white font-mono break-all">{selectedLog.target_id || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Additional Details</h3>
                  <pre className="bg-black/40 border border-white/5 rounded-xl p-4 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.previous_value && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">Previous Value</h3>
                  <pre className="bg-black/40 border border-destructive/20 rounded-xl p-4 text-xs font-mono text-destructive/80 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.previous_value, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2">New Value</h3>
                  <pre className="bg-black/40 border border-primary/20 rounded-xl p-4 text-xs font-mono text-primary/80 overflow-x-auto whitespace-pre-wrap">
                    {JSON.stringify(selectedLog.new_value, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-white/5 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn-ghost-neon px-6 py-2 text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
