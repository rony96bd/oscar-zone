import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, isAdmin, isSupportAgent } = useAuthStore()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to={redirectTo} replace />
  if (isAdmin() || isSupportAgent()) return <Navigate to="/admin" replace />

  const { profile } = useAuthStore.getState()
  if (profile && (profile.account_status === 'pending' || profile.account_status === 'suspended' || profile.account_status === 'restricted')) {
    // Only redirect if they are not already on the pending page
    if (window.location.pathname !== '/pending') {
      return <Navigate to="/pending" replace />
    }
  }

  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin, isSupportAgent } = useAuthStore()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin() && !isSupportAgent()) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
