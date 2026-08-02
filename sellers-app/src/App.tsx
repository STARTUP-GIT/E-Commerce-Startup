import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShop } from '@/features/shop/hooks/useShop';
import { supabase } from '@/lib/supabase';
import axiosInstance from '@/lib/axios/axiosInstance';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { GuestRoute, ProtectedRoute } from '@/router/guards';
import { ToastContainer } from '@/shared/components/ToastContainer';
import { ComingSoonDialog } from '@/components/ui/ComingSoonDialog';
import { PremiumDialogContainer } from '@/components/ui/PremiumDialogContainer';

const LoginPage = lazy(() => import('@/features/auth/ui/LoginPage').then((m) => ({ default: m.LoginPage })));
const AuthCallbackPage = lazy(() => import('@/features/auth/ui/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const RegisterPage = lazy(() => import('@/features/auth/ui/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ui/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const ShopSetupPage = lazy(() => import('@/features/shop/ui/ShopSetupPage').then((m) => ({ default: m.ShopSetupPage })));
const ShopSettingsPage = lazy(() => import('@/features/shop/ui/ShopSettingsPage').then((m) => ({ default: m.ShopSettingsPage })));
const DashboardPage = lazy(() => import('@/features/dashboard/ui/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProductListPage = lazy(() => import('@/features/products/ui/ProductListPage').then((m) => ({ default: m.ProductListPage })));
const OrdersPage = lazy(() => import('@/features/orders/ui/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const OrderDetailPage = lazy(() => import('@/features/orders/ui/OrderDetailPage').then((m) => ({ default: m.OrderDetailPage })));
const CustomOrdersPage = lazy(() => import('@/features/custom-orders/ui/CustomOrdersPage').then((m) => ({ default: m.CustomOrdersPage })));
const CustomOrderDetailPage = lazy(() => import('@/features/custom-orders/ui/CustomOrderDetailPage').then((m) => ({ default: m.CustomOrderDetailPage })));
const AnalyticsPage = lazy(() => import('@/features/analytics/ui/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const PayoutsPage = lazy(() => import('@/features/payouts/ui/PayoutsPage').then((m) => ({ default: m.PayoutsPage })));
const ReviewsPage = lazy(() => import('@/features/reviews/ui/ReviewsPage').then((m) => ({ default: m.ReviewsPage })));
const NotificationsPage = lazy(() => import('@/features/notifications/ui/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const SettingsPage = lazy(() => import('@/features/settings/ui/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const SellerProfilePage = lazy(() => import('@/features/profile/ui/SellerProfilePage').then((m) => ({ default: m.SellerProfilePage })));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8">
      <span className="h-10 w-10 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
    </div>
  );
}

function ShopRequiredRoute() {
  const { hasShop, isLoadingShop } = useShop();

  if (isLoadingShop) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 space-y-4">
        <span className="h-10 w-10 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
        <p className="text-sm text-white/40 font-medium font-sans">Checking shop configurations...</p>
      </div>
    );
  }

  if (!hasShop) {
    return <Navigate to="/shop-setup" replace />;
  }

  return <Outlet />;
}


function NoShopRequiredRoute() {
  const { hasShop, isLoadingShop } = useShop();

  if (isLoadingShop) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 space-y-4">
        <span className="h-10 w-10 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
        <p className="text-sm text-white/40 font-medium font-sans">Verifying store profile...</p>
      </div>
    );
  }

  if (hasShop) {
    return <Navigate to="/dashboard" replace />;
  }

  return <ShopSetupPage />;
}

function App() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
        try {
          const profile = queryClient.getQueryData(['profile']);
          if (!profile) {
            const userMetadata = (session.user.user_metadata || {}) as Record<string, any>;
            const fullName =
              userMetadata.full_name ||
              userMetadata.name ||
              [userMetadata.given_name || '', userMetadata.family_name || ''].filter(Boolean).join(' ').trim();
            const firstName = userMetadata.given_name || userMetadata.first_name || fullName.split(' ')[0] || '';
            const lastName = userMetadata.family_name || userMetadata.last_name || fullName.split(' ').slice(1).join(' ') || '';

            const syncRes = await axiosInstance.post('/seller/api/auth/google', {
              accessToken: session.access_token,
              provider: 'google',
              providerId: session.user.id,
              email: session.user.email,
              name: fullName,
              firstName,
              lastName,
              avatarUrl: userMetadata.avatar_url || userMetadata.picture || '',
            });

            queryClient.setQueryData(['profile'], syncRes.data.user);
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            queryClient.invalidateQueries({ queryKey: ['shop'] });

            const path = window.location.pathname;
            if (path === '/login' || path === '/register' || path === '/auth/callback') {
              window.location.href = '/dashboard';
            }
          } else {
            const path = window.location.pathname;
            if (path === '/auth/callback') {
              window.location.href = '/dashboard';
            }
          }
        } catch (err: any) {
          console.error('Session synchronization error:', err);
          await supabase.auth.signOut();
          queryClient.setQueryData(['profile'], null);
          queryClient.clear();

          useConfirmStore.getState().showAlert({
            title: 'Portal Restriction',
            message: err?.message || 'Verification failed. Please try another account.',
            confirmText: 'Acknowledge',
          });

          if (window.location.pathname === '/auth/callback') {
            window.location.href = '/login';
          }
        }
      } else if (event === 'SIGNED_OUT') {
        try {
          await axiosInstance.post('/seller/api/auth/logout');
        } catch (err) {
          console.error('Backend signout error:', err);
        }
        queryClient.setQueryData(['profile'], null);
        queryClient.clear();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return (
    <>
      <ToastContainer />
      <ComingSoonDialog />
      <PremiumDialogContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />


          <Route element={<ProtectedRoute />}>
            <Route path="/shop-setup" element={<NoShopRequiredRoute />} />
            <Route path="/profile" element={<SellerProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            <Route element={<ShopRequiredRoute />}>
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/custom-orders" element={<CustomOrdersPage />} />
            <Route path="/custom-orders/:id" element={<CustomOrderDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/payouts" element={<PayoutsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/shop" element={<ShopSettingsPage />} />
            <Route
              path="*"
              element={<Navigate to="/dashboard" replace />}
            />
          </Route>
        </Route>


        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
        />
      </Routes>
      </Suspense>
    </>
  );
}

export default App;
