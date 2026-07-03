import { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShop } from '@/features/shop/hooks/useShop';
import { supabase } from '@/lib/supabase';
import axiosInstance from '@/lib/axios/axiosInstance';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { GuestRoute, ProtectedRoute } from '@/router/guards';
import { LoginPage } from '@/features/auth/ui/LoginPage';
import { RegisterPage } from '@/features/auth/ui/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/ui/ForgotPasswordPage';
import { ShopSetupPage } from '@/features/shop/ui/ShopSetupPage';
import { ShopSettingsPage } from '@/features/shop/ui/ShopSettingsPage';
import { DashboardPage } from '@/features/dashboard/ui/DashboardPage';
import { ProductListPage } from '@/features/products/ui/ProductListPage';
import { OrdersPage } from '@/features/orders/ui/OrdersPage';
import { OrderDetailPage } from '@/features/orders/ui/OrderDetailPage';
import { CustomOrdersPage } from '@/features/custom-orders/ui/CustomOrdersPage';
import { CustomOrderDetailPage } from '@/features/custom-orders/ui/CustomOrderDetailPage';
import { AnalyticsPage } from '@/features/analytics/ui/AnalyticsPage';
import { PayoutsPage } from '@/features/payouts/ui/PayoutsPage';
import { ReviewsPage } from '@/features/reviews/ui/ReviewsPage';
import { NotificationsPage } from '@/features/notifications/ui/NotificationsPage';
import { SettingsPage } from '@/features/settings/ui/SettingsPage';
import { ToastContainer } from '@/shared/components/ToastContainer';
import { ComingSoonDialog } from '@/components/ui/ComingSoonDialog';
import { PremiumDialogContainer } from '@/components/ui/PremiumDialogContainer';

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
  const { hasShop } = useShop();
  const queryClient = useQueryClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Supabase auth event:', event, 'session present:', Boolean(session));
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
            if (path === '/login' || path === '/register') {
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
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>


        <Route element={<ProtectedRoute />}>
          <Route path="/shop-setup" element={<NoShopRequiredRoute />} />

          <Route element={<ShopRequiredRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/custom-orders" element={<CustomOrdersPage />} />
            <Route path="/custom-orders/:id" element={<CustomOrderDetailPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/payouts" element={<PayoutsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/shop-settings" element={<ShopSettingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route
              path="*"
              element={<Navigate to={hasShop ? '/dashboard' : '/shop-setup'} replace />}
            />
          </Route>
        </Route>


        <Route
          path="*"
          element={<Navigate to={isAuthenticated ? (hasShop ? '/dashboard' : '/shop-setup') : '/login'} replace />}
        />
      </Routes>
    </>
  );
}

export default App;
