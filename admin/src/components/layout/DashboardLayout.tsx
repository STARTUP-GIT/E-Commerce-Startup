"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/lib/store/uiStore';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Store,
  Box,
  ShoppingBag,
  CreditCard,
  Truck,
  MapPin,
  AlertTriangle,
  Bell,
  Tag,
  Settings,
  FileSpreadsheet,
  TrendingUp,
  LogOut,
  Menu,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
import { useConfirmStore } from '@/lib/store/confirmStore';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, logout, isLoading } = useAuth();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const pathname = usePathname();
  const router = useRouter();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const handleLogout = () => {
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of the Admin panel?',
      confirmText: 'Sign Out',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp },
    { name: 'Sellers', path: '/sellers', icon: Users },
    { name: 'Customers', path: '/customers', icon: UserCheck },
    { name: 'Shops', path: '/shops', icon: Store },
    { name: 'Products', path: '/products', icon: Box },
    { name: 'Orders', path: '/orders', icon: ShoppingBag },
    { name: 'Payments', path: '/payments', icon: CreditCard },
    { name: 'Delivery', path: '/delivery', icon: Truck },
    { name: 'Districts (Cities)', path: '/karnataka/districts', icon: MapPin },
    { name: 'States', path: '/states', icon: MapPin },
    { name: 'Reports', path: '/reports', icon: AlertTriangle },
    { name: 'Notifications', path: '/notifications', icon: Bell },
    { name: 'Coupons', path: '/coupons', icon: Tag },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Audit Logs', path: '/audit-logs', icon: FileSpreadsheet },
  ];

  const activePageName = () => {
    const matched = navItems.find((item) => pathname.startsWith(item.path));
    return matched ? matched.name : 'System';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 space-y-4">
        <span className="h-10 w-10 rounded-full border-4 border-white/10 border-t-white animate-spin" />
        <p className="text-sm text-white/40 font-medium font-sans">Connecting to system modules...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground flex noise-bg overflow-hidden">
      {/* Background Monochrome Orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-white/[0.01] blur-[130px] pointer-events-none" />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-white/5 bg-[#07070a]/90 backdrop-blur-md transition-transform duration-300 md:translate-x-0 md:static ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Logo */}
          <div className="h-16 flex items-center px-6 border-b border-white/5 gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shrink-0">
              <ShieldAlert className="h-4 w-4 text-black" />
            </div>
            <div>
              <span className="font-black text-white text-xs tracking-tight block">AURA</span>
              <span className="text-[8px] text-white/45 block font-bold -mt-1 uppercase tracking-wider">Enterprise Admin</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-4 py-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                      : 'text-white/60 hover:text-white/95 hover:bg-white/[0.03] border border-transparent'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10">
                {admin?.firstName?.[0] || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-white/90 line-clamp-1">
                  {admin?.firstName} {admin?.lastName}
                </span>
                <span className="block text-[9px] text-white/40 truncate">
                  {admin?.isSuperAdmin ? 'Super Admin' : 'Administrator'}
                </span>
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
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
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
                {activePageName()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick superadmin badge */}
            {admin?.isSuperAdmin && (
              <Badge variant="outline" className="text-[8px] py-0.5 px-2">
                Super Admin Access
              </Badge>
            )}

            {/* Notification trigger */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl glass hover:border-white/20 text-white/70 hover:text-white transition-all cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
            </Link>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 overflow-y-auto bg-transparent relative z-10">{children}</main>
      </div>
    </div>
  );
}
