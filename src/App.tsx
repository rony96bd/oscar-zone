import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import React, { lazy, Suspense } from 'react'

import { CustomerLayout } from '@/components/layout/CustomerLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute, AdminRoute } from '@/components/layout/ProtectedRoute'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeNotifications } from '@/hooks/useRealtime'
import { useThemeStore } from '@/stores/themeStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useEffect } from 'react'
import { LiveChatWidget } from '@/components/ui/LiveChatWidget'
import { ScrollToTop } from '@/components/shared/ScrollToTop'
import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

// Public Pages
const HomePage = lazy(() => import('@/pages/public/HomePage'))
const GamesPage = lazy(() => import('@/pages/public/GamesPage'))
const PromotionsPage = lazy(() => import('@/pages/public/PromotionsPage'))
const HowItWorksPage = lazy(() => import('@/pages/public/HowItWorksPage'))
const ReferralInfoPage = lazy(() => import('@/pages/public/ReferralInfoPage'))
const FAQPage = lazy(() => import('@/pages/public/FAQPage'))
const ContactPage = lazy(() => import('@/pages/public/ContactPage'))

// Auth Pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// Customer Pages
const DashboardPage = lazy(() => import('@/pages/customer/DashboardPage'))
const MyGamesPage = lazy(() => import('@/pages/customer/MyGamesPage'))
const LoadGamePage = lazy(() => import('@/pages/customer/LoadGamePage'))
const OrdersPage = lazy(() => import('@/pages/customer/OrdersPage'))
const OrderDetailPage = lazy(() => import('@/pages/customer/OrderDetailPage'))
const EarningsPage = lazy(() => import('@/pages/customer/EarningsPage'))
const CashoutPage = lazy(() => import('@/pages/customer/CashoutPage'))
const NotificationsPage = lazy(() => import('@/pages/customer/NotificationsPage'))
const ChatPage = lazy(() => import('@/pages/customer/ChatPage'))
const ProfilePage = lazy(() => import('@/pages/customer/ProfilePage'))
const SettingsPage = lazy(() => import('@/pages/customer/SettingsPage'))

// Admin Pages
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminOrdersPage = lazy(() => import('@/pages/admin/AdminOrdersPage'))
const AdminCashoutPage = lazy(() => import('@/pages/admin/AdminCashoutPage'))
const AdminOrderDetailPage = lazy(() => import('@/pages/admin/AdminOrderDetailPage'))
const AdminCustomersPage = lazy(() => import('@/pages/admin/AdminCustomersPage'))
const AdminCustomerDetailPage = lazy(() => import('@/pages/admin/AdminCustomerDetailPage'))
const AdminGamesPage = lazy(() => import('@/pages/admin/AdminGamesPage'))
const AdminCustomerGamesPage = lazy(() => import('@/pages/admin/AdminCustomerGamesPage'))
const AdminBonusesPage = lazy(() => import('@/pages/admin/AdminBonusesPage'))
const AdminPaymentMethodsPage = lazy(() => import('@/pages/admin/AdminPaymentMethodsPage'))
const AdminReferralsPage = lazy(() => import('@/pages/admin/AdminReferralsPage'))
const AdminChatPage = lazy(() => import('@/pages/admin/AdminChatPage'))
const AdminNotificationsPage = lazy(() => import('@/pages/admin/AdminNotificationsPage'))
const AdminTelegramPage = lazy(() => import('@/pages/admin/AdminTelegramPage'))
const AdminBannersPage = lazy(() => import('@/pages/admin/AdminBannersPage'))
const AdminAnnouncementsPage = lazy(() => import('@/pages/admin/AdminAnnouncementsPage'))
const AdminReportsPage = lazy(() => import('@/pages/admin/AdminReportsPage'))
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminAuditLogsPage = lazy(() => import('@/pages/admin/AdminAuditLogsPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'))
const AdminAccountingPage = lazy(() => import('@/pages/admin/AdminAccountingPage'))
const AdminPointPurchasesPage = lazy(() => import('@/pages/admin/AdminPointPurchasesPage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: 1,
    },
  },
})

class GlobalErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', wordBreak: 'break-all' }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error?.message}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  useAuth() // Initialize auth
  useRealtimeNotifications() // Subscribe to realtime notifications
  const { fetchTheme } = useThemeStore()
  const { fetchSettings } = useSettingsStore()

  useEffect(() => {
    fetchTheme()
    fetchSettings()
  }, [fetchTheme, fetchSettings])

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Customer Website */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/referral" element={<ReferralInfoPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/load" element={<LoadGamePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Customer Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
          <Route path="/my-games" element={
            <ProtectedRoute><MyGamesPage /></ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute><OrdersPage /></ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute><OrderDetailPage /></ProtectedRoute>
          } />
          <Route path="/earnings" element={
            <ProtectedRoute><EarningsPage /></ProtectedRoute>
          } />
          <Route path="/cashout" element={
            <ProtectedRoute><CashoutPage /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><NotificationsPage /></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute><ChatPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
        </Route>

        {/* Admin Panel */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderDetailPage />} />
          <Route path="cashout" element={<AdminCashoutPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="customers/:id" element={<AdminCustomerDetailPage />} />
          <Route path="games" element={<AdminGamesPage />} />
          <Route path="customer-games" element={<AdminCustomerGamesPage />} />
          <Route path="bonuses" element={<AdminBonusesPage />} />
          <Route path="payment-methods" element={<AdminPaymentMethodsPage />} />
          <Route path="referrals" element={<AdminReferralsPage />} />
          <Route path="chat" element={<AdminChatPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="telegram" element={<AdminTelegramPage />} />
          <Route path="banners" element={<AdminBannersPage />} />
          <Route path="announcements" element={<AdminAnnouncementsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="audit-logs" element={<AdminAuditLogsPage />} />
          <Route path="accounting" element={<AdminAccountingPage />} />
          <Route path="point-purchases" element={<AdminPointPurchasesPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ScrollToTop />
          <AppContent />
          <LiveChatWidget />
          <Toaster
            theme="dark"
            position="top-right"
            richColors
            closeButton
          />
        </BrowserRouter>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  )
}
