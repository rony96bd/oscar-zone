import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { PageLoader } from '@/components/shared/LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  redirectTo?: string
}

export function ProtectedRoute({ children, redirectTo = '/login' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to={redirectTo} replace />

  return <>{children}</>
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuthStore()

  if (isLoading) return <PageLoader />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin()) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
