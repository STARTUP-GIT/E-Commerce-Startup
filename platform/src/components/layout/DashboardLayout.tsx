"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Store,
  Users,
  Layout,
  LogOut,
  Menu,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
import { useConfirmStore } from '@/lib/store/confirmStore';

import { useSettings } from '@/hooks/useSettings';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Branding',
    path: '/branding',
    icon: Sparkles,
    description: 'Name, logo, & favicon',
  },
  {
    name: 'Customer Dashboard',
    path: '/customer-dashboard',
    icon: Users,
    description: 'Customer feature switches',
  },
  {
    name: 'Seller Dashboard',
    path: '/seller-dashboard',
    icon: Store,
    description: 'Seller feature switches',
  },
  {
    name: 'UI Builder',
    path: '/ui-builder',
    icon: Layout,
    description: 'Drag & drop layout builder',
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const { settings } = useSettings();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const pathname = usePathname();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const brandName = settings?.branding?.name || settings?.branding?.marketplaceName || 'Platform';

  React.useEffect(() => {
    if (typeof window !== 'undefined' && brandName) {
      document.title = `${brandName} | Platform Control Plane`;
    }
  }, [brandName]);

  const handleLogout = () => {
    showConfirm({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out of the Platform control plane?',
      confirmText: 'Sign Out',
      onConfirm: async () => {
        await logout();
      },
    });
  };

  const activePageName = () => {
    const matched = NAV_ITEMS.find((item) => pathname.startsWith(item.path));
    return matched ? matched.name : 'Platform Management';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 space-y-4">
        <span className="h-10 w-10 rounded-full border-4 border-white/10 border-t-white animate-spin" />
        <p className="text-sm text-white/40 font-medium font-sans">Connecting to platform modules...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground flex noise-bg overflow-hidden">
      {/* Background Monochrome Orbs */}
      <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-white/[0.01] blur-[130px] pointer-events-none" />

      {/* Sidebar Backdrop Overlay for Mobile */}
      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden cursor-pointer"
        />
      )}

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
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <div>
              <span className="font-black text-white text-xs tracking-tight block">PLATFORM</span>
              <span className="text-[8px] text-white/45 block font-bold -mt-1 uppercase tracking-wider">Control Plane</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            <div className="px-3 pb-2 text-[9px] font-black text-white/30 uppercase tracking-widest">
              Core Modules
            </div>
            <div className="space-y-1.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                        : 'text-white/60 hover:text-white/95 hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <span className="block leading-tight">{item.name}</span>
                      <span className="text-[9px] text-white/40 font-normal block leading-tight mt-0.5">{item.description}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10 shrink-0">
                {user?.firstName?.[0] || 'P'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white/90 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[9px] text-white/40 truncate font-medium">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <Badge variant="default" className="px-2 py-0.5 text-[9px]">
                {user?.role?.name || 'MEMBER'}
              </Badge>
              {user?.isOwner && <Badge variant="success" className="px-2 py-0.5 text-[9px]">OWNER</Badge>}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#07070a]/60 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-black text-white/90 tracking-tight">{activePageName()}</h1>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
