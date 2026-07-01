import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useShop } from '@/features/shop/hooks/useShop';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Store,
  LayoutDashboard,
  Box,
  ShoppingBag,
  Wrench,
  BarChart3,
  CreditCard,
  Star,
  Settings,
  LogOut,
  Bell,
  Menu,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';

import { useConfirmStore } from '@/lib/store/confirmStore';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { shop, approval } = useShop();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const handleLogout = () => {
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of your seller portal?',
      confirmText: 'Sign Out',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Box },
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Custom Requests', path: '/custom-orders', icon: Wrench },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Payouts', path: '/payouts', icon: CreditCard },
    { name: 'Reviews', path: '/reviews', icon: Star },
    { name: 'Shop & Bank', path: '/shop-settings', icon: Store },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const shopStatusLabel = () => {
    if (!shop) return 'No Shop Setup';
    if (!approval) return 'Checking Status';
    return approval.status;
  };

  const shopStatusVariant = () => {
    if (!shop) return 'destructive';
    if (!approval) return 'outline';
    switch (approval.status) {
      case 'APPROVED':
        return 'success';
      case 'PENDING_APPROVAL':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      case 'DRAFT':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex noise-bg">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/5 bg-[#07070a]/90 backdrop-blur-md transition-transform duration-300 md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Logo */}
          <div className="h-16 flex items-center px-6 border-b border-white/5 gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shrink-0">
              <ShoppingBag className="h-4 w-4 text-black" />
            </div>
            <div>
              <span className="font-black text-white text-xs tracking-tight block">Aura</span>
              <span className="text-[8px] text-white/40 block font-bold -mt-1 uppercase tracking-wider">Seller Portal</span>
            </div>
          </div>

          {/* Shop Selector / Indicator */}
          {shop && (
            <div className="p-4 mx-4 my-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {shop.logoUrl ? (
                    <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-5 w-5 text-white/30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white/95 line-clamp-1">{shop.name}</h4>
                  <div className="mt-0.5">
                    <Badge variant={shopStatusVariant()} className="text-[8px] py-0 px-1.5 font-bold">
                      {shopStatusLabel()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nav links */}
          <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isAllowed = 
                approval?.status === 'APPROVED' || 
                item.path === '/dashboard' || 
                item.path === '/shop-settings' || 
                item.path === '/settings' || 
                item.path === '/notifications';

              if (!isAllowed) return null;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-purple-600/10 text-purple-400 border border-purple-500/15 shadow-sm'
                        : 'text-white/60 hover:text-white/95 hover:bg-white/[0.03] border border-transparent'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-900/60 to-indigo-900/60 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10">
                {user?.firstName?.[0] || 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-white/90 line-clamp-1">
                  {user?.firstName} {user?.lastName}
                </span>
                <span className="block text-[10px] text-white/40 truncate">{user?.email}</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full h-9 rounded-xl glass text-xs font-bold text-white/70 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-[#07070a]/60 backdrop-blur-md flex items-center justify-between px-6 z-30 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05] transition-all md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-semibold">
              <span>Aura</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white/80 capitalize">
                {location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick stats indicator */}
            {shop && !shop.isActive && (
              <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full border border-yellow-500/20 bg-yellow-500/10 text-[10px] font-bold text-yellow-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Shop Inactive - Complete Approval</span>
              </div>
            )}

            {/* Notification trigger */}
            <button
              onClick={() => navigate('/notifications')}
              className="relative p-2 rounded-xl glass hover:border-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            </button>
          </div>
        </header>

        {/* Warning Banners */}
        {shop && approval && approval.status !== 'APPROVED' && (
          <div className="px-6 pt-6 animate-fade-in">
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              approval.status === 'REJECTED'
                ? 'border-red-500/20 bg-red-500/5'
                : approval.status === 'SUSPENDED'
                ? 'border-red-500/20 bg-red-500/5'
                : 'border-yellow-500/20 bg-yellow-500/5'
            }`}>
              <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                approval.status === 'REJECTED' || approval.status === 'SUSPENDED'
                  ? 'text-red-400'
                  : 'text-yellow-400'
              }`} />
              <div>
                <h5 className={`text-xs font-bold ${
                  approval.status === 'REJECTED' || approval.status === 'SUSPENDED'
                    ? 'text-red-400'
                    : 'text-yellow-400'
                }`}>
                  {approval.status === 'DRAFT' && 'Shop Setup & Verification Required'}
                  {approval.status === 'PENDING_APPROVAL' && 'Shop Under Review'}
                  {approval.status === 'REJECTED' && 'Shop Approval Rejected'}
                  {approval.status === 'SUSPENDED' && 'Shop Suspended'}
                </h5>
                <p className="text-[11px] text-white/60 leading-relaxed mt-1">
                  {approval.status === 'DRAFT' && 'Your shop is currently in DRAFT status. To list products publicly and receive payouts, you must submit your shop details and GST verification under Shop & Bank.'}
                  {approval.status === 'PENDING_APPROVAL' && 'Your shop is under review by our Admin team. You cannot receive customer orders or appear in public listings until approved.'}
                  {approval.status === 'REJECTED' && `Your shop was rejected by our Admin team. Rejection Reason: "${approval.rejectionReason}". Please edit your shop details under Shop & Bank and submit again.`}
                  {approval.status === 'SUSPENDED' && 'Your shop has been suspended by our Admin team. Please appeal this issue or contact support.'}
                </p>
                {approval.status === 'DRAFT' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2.5 text-[10px] h-7 font-bold"
                    onClick={() => navigate('/shop-settings')}
                  >
                    Apply for Verification
                  </Button>
                )}
                {approval.status === 'REJECTED' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2.5 text-[10px] h-7 font-bold border border-red-500/25 text-red-300 bg-red-500/10 hover:bg-red-500/20"
                    onClick={() => navigate('/shop-settings')}
                  >
                    Edit Shop Details
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
