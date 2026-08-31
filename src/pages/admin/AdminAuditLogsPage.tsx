import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function AdminAuditLogsPage() {
  const { isSupportAgent } = useAuthStore()

  if (isSupportAgent()) {
    return <Navigate to="/admin" replace />
  }

  return (<div className="space-y-4"><h1 className="text-2xl font-gaming font-bold text-white">Audit Logs</h1><div className="glass-card p-12 text-center"><p className="text-muted-foreground">Audit log viewer coming soon.</p></div></div>)
}
