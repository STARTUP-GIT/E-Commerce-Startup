"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useUIStore } from '@/lib/store/uiStore';
import type { LucideIcon } from 'lucide-react';
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
  ChevronDown,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCircle,
  UserCog,
  Grid,
  Palette,
  FileText,
  LifeBuoy,
  RotateCcw,
  BadgeCheck,
  Gavel,
  Wallet,
  KeyRound,
  MonitorSmartphone,
  Download,
  Scale,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import { Badge } from '@/shared/components/Badge';
import { useConfirmStore } from '@/lib/store/confirmStore';

import { useBranding } from '@/lib/hooks/useBranding';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useConversationUnreadCounts } from '@/features/conversations/hooks/useConversationUnreadCounts';
import { useAdminSidebarBadges } from '@/features/layout/hooks/useAdminSidebarBadges';
import { AdminNotificationDropdown } from './AdminNotificationDropdown';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { branding } = useBranding();
  const { can } = usePermissions();
  const { admin, logout, isLoading } = useAuth();
  const unreadCounts = useConversationUnreadCounts();
  const { badges } = useAdminSidebarBadges();
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

  const getBadgeForPath = (path: string): { count: number; colorClass: string; id: string } | null => {
    switch (path) {
      case '/customer-conversations': {
        const count = Math.max(unreadCounts.customerUnread || 0, badges.customerConversations || 0);
        return count > 0
          ? { count, colorClass: 'bg-indigo-500 ring-indigo-400/30 text-white font-black', id: 'customer-unread-badge' }
          : null;
      }
      case '/seller-conversations': {
        const count = Math.max(unreadCounts.sellerUnread || 0, badges.sellerConversations || 0);
        return count > 0
          ? { count, colorClass: 'bg-purple-500 ring-purple-400/30 text-white font-black', id: 'seller-unread-badge' }
          : null;
      }
      case '/shops':
        return badges.shops > 0
          ? { count: badges.shops, colorClass: 'bg-amber-500 ring-amber-400/30 text-black font-black', id: 'shops-badge' }
          : null;
      case '/seller-verifications':
        return badges.sellerVerifications > 0
          ? { count: badges.sellerVerifications, colorClass: 'bg-amber-500 ring-amber-400/30 text-black font-black', id: 'verifications-badge' }
          : null;
      case '/agreement-tracking':
        return badges.sellerAgreements > 0
          ? { count: badges.sellerAgreements, colorClass: 'bg-blue-500 ring-blue-400/30 text-white font-black', id: 'agreements-badge' }
          : null;
      case '/appeals':
        return badges.appeals > 0
          ? { count: badges.appeals, colorClass: 'bg-rose-500 ring-rose-400/30 text-white font-black', id: 'appeals-badge' }
          : null;
      case '/cases':
        return badges.customerReports > 0
          ? { count: badges.customerReports, colorClass: 'bg-rose-500 ring-rose-400/30 text-white font-black', id: 'cases-badge' }
          : null;
      case '/reports':
        return badges.productReports > 0
          ? { count: badges.productReports, colorClass: 'bg-rose-500 ring-rose-400/30 text-white font-black', id: 'reports-badge' }
          : null;
      case '/support-tickets':
        return badges.supportTickets > 0
          ? { count: badges.supportTickets, colorClass: 'bg-orange-500 ring-orange-400/30 text-white font-black', id: 'tickets-badge' }
          : null;
      case '/orders':
        return badges.orders > 0
          ? { count: badges.orders, colorClass: 'bg-emerald-500 ring-emerald-400/30 text-white font-black', id: 'orders-badge' }
          : null;
      case '/returns':
        return badges.returns > 0
          ? { count: badges.returns, colorClass: 'bg-amber-500 ring-amber-400/30 text-black font-black', id: 'returns-badge' }
          : null;
      case '/packing-fee-requests':
        return badges.packingFeeRequests > 0
          ? { count: badges.packingFeeRequests, colorClass: 'bg-cyan-500 ring-cyan-400/30 text-black font-black', id: 'packing-badge' }
          : null;
      case '/seller-payouts':
        return badges.sellerPayouts > 0
          ? { count: badges.sellerPayouts, colorClass: 'bg-teal-500 ring-teal-400/30 text-white font-black', id: 'payouts-badge' }
          : null;
      case '/location-requests':
        return (badges.locationRequests || 0) > 0
          ? { count: badges.locationRequests, colorClass: 'bg-emerald-500 ring-emerald-400/30 text-white font-black', id: 'location-requests-badge' }
          : null;
      case '/admin-management':
        return (badges.adminAccessRequests || 0) > 0
          ? { count: badges.adminAccessRequests, colorClass: 'bg-amber-500 ring-amber-400/30 text-black font-black', id: 'admin-access-badge' }
          : null;
      default:
        return null;
    }
  };

  interface NavItem {
    name: string;
    path: string;
    icon: LucideIcon;
    group: 'Dashboard' | 'Marketplace' | 'Operations' | 'Locations' | 'Communication' | 'Configuration' | 'System';
    permission?: string;
  }

  const navItems: NavItem[] = [
    // 1. Dashboard
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, group: 'Dashboard', permission: 'dashboard.view' },
    { name: 'Analytics', path: '/analytics', icon: TrendingUp, group: 'Dashboard', permission: 'analytics.view' },

    // 2. Marketplace
    { name: 'Customers', path: '/customers', icon: UserCheck, group: 'Marketplace', permission: 'customers.view' },
    { name: 'Sessions & Devices', path: '/sessions', icon: MonitorSmartphone, group: 'Marketplace', permission: 'sessions.view' },
    { name: 'Sellers', path: '/sellers', icon: Users, group: 'Marketplace', permission: 'sellers.view' },
    { name: 'Shops', path: '/shops', icon: Store, group: 'Marketplace', permission: 'sellers.view' },
    { name: 'Seller Verifications', path: '/seller-verifications', icon: BadgeCheck, group: 'Marketplace', permission: 'sellers.view' },
    { name: 'Seller Enforcement', path: '/seller-strikes', icon: Gavel, group: 'Marketplace', permission: 'enforcement.view' },
    { name: 'Appeals', path: '/appeals', icon: Scale, group: 'Marketplace', permission: 'appeals.view' },
    { name: 'Seller Payouts', path: '/seller-payouts', icon: Wallet, group: 'Marketplace', permission: 'payments.view' },
    { name: 'Products', path: '/products', icon: Box, group: 'Marketplace', permission: 'moderation.view' },
    { name: 'Categories', path: '/categories', icon: Grid, group: 'Marketplace', permission: 'catalog.view' },

    // 3. Operations
    { name: 'Orders', path: '/orders', icon: ShoppingBag, group: 'Operations', permission: 'orders.view' },
    { name: 'Returns', path: '/returns', icon: RotateCcw, group: 'Operations', permission: 'orders.view' },
    { name: 'Packing Fee Requests', path: '/packing-fee-requests', icon: CreditCard, group: 'Operations', permission: 'orders.view' },
    { name: 'Delivery Fleet & Operations', path: '/delivery', icon: Truck, group: 'Operations', permission: 'delivery.view' },

    // 4. Locations
    { name: 'States', path: '/states', icon: MapPin, group: 'Locations', permission: 'catalog.view' },
    { name: 'Districts / Cities', path: '/karnataka/districts', icon: MapPin, group: 'Locations', permission: 'catalog.view' },
    { name: 'Location Requests', path: '/location-requests', icon: MessageSquare, group: 'Locations', permission: 'catalog.view' },

    // 5. Communication
    { name: 'Support Tickets', path: '/support-tickets', icon: LifeBuoy, group: 'Communication', permission: 'support.view' },
    { name: 'Customer Conversations', path: '/customer-conversations', icon: MessageSquare, group: 'Communication', permission: 'support.view' },
    { name: 'Seller Conversations', path: '/seller-conversations', icon: MessageSquare, group: 'Communication', permission: 'support.view' },

    // 6. Configuration
    { name: 'Community Guidelines', path: '/community-guidelines', icon: ShieldAlert, group: 'Configuration', permission: 'guidelines.view' },
    { name: 'Issue New Policy', path: '/issue-policy', icon: Bell, group: 'Configuration', permission: 'policies.view' },
    { name: 'Seller Agreement Tracking', path: '/agreement-tracking', icon: FileCheck, group: 'Configuration', permission: 'guidelines.view' },
    { name: 'Commission Statements', path: '/commission-statements', icon: FileText, group: 'Configuration', permission: 'commission.view' },
    { name: 'Customer Branding', path: '/customer-branding', icon: Palette, group: 'Configuration', permission: 'branding.view' },
    { name: 'Seller Branding', path: '/seller-branding', icon: Store, group: 'Configuration', permission: 'branding.view' },
    { name: 'Delivery Branding', path: '/delivery-branding', icon: Truck, group: 'Configuration', permission: 'branding.view' },
    { name: 'Payment Methods', path: '/payment-methods', icon: CreditCard, group: 'Configuration', permission: 'settings.view' },
    { name: 'Delivery Methods', path: '/delivery-methods', icon: Truck, group: 'Configuration', permission: 'settings.view' },
    { name: 'Content Management', path: '/content', icon: FileText, group: 'Configuration', permission: 'content.view' },
    { name: 'Settings', path: '/settings', icon: Settings, group: 'Configuration', permission: 'settings.view' },

    // 7. System
    { name: 'Customer Reports', path: '/cases', icon: AlertTriangle, group: 'System', permission: 'reports.view' },
    { name: 'Product Reports', path: '/reports', icon: ShieldCheck, group: 'System', permission: 'reports.view' },
    { name: 'Postmortems', path: '/postmortems', icon: FileSpreadsheet, group: 'System', permission: 'postmortems.view' },
    { name: 'Audit Logs', path: '/audit-logs', icon: FileSpreadsheet, group: 'System', permission: 'audit_logs.view' },
    { name: 'Moderation Queue', path: '/moderation', icon: ShieldCheck, group: 'System', permission: 'moderation.view' },
    { name: 'Admin Management', path: '/admin-management', icon: UserCog, group: 'System', permission: 'admin.users.manage' },
    { name: 'Roles & Permissions', path: '/roles', icon: KeyRound, group: 'System', permission: 'admin.roles.manage' },
    { name: 'Payments & Transactions', path: '/payments', icon: CreditCard, group: 'System', permission: 'payments.view' },
    { name: 'Notifications', path: '/notifications', icon: Bell, group: 'System', permission: 'notifications.view' },
    { name: 'Coupons', path: '/coupons', icon: Tag, group: 'System', permission: 'coupons.view' },
    { name: 'Exports', path: '/exports', icon: Download, group: 'System', permission: 'reports.export' },
    { name: 'My Profile', path: '/profile', icon: UserCircle, group: 'System' },
  ];

  const [searchQuery, setSearchQuery] = React.useState('');
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('atlasbasket_admin_nav_collapsed');
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return {};
  });

  const toggleGroup = (group: string) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [group]: !prev[group] };
      try {
        localStorage.setItem('atlasbasket_admin_nav_collapsed', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const visibleNavItems = navItems.filter((item) => !item.permission || can(item.permission));
  const navGroups: Array<NavItem['group']> = [
    'Dashboard',
    'Marketplace',
    'Operations',
    'Locations',
    'Communication',
    'Configuration',
    'System'
  ];

  const filteredNavItems = searchQuery.trim()
    ? visibleNavItems.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.group.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : visibleNavItems;

  const activePageName = () => {
    const matched =
      visibleNavItems.find((item) => pathname.startsWith(item.path)) ||
      navItems.find((item) => pathname.startsWith(item.path));
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
    <div className="relative h-screen h-[100dvh] w-full bg-background text-foreground flex noise-bg overflow-hidden">
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
        className={`fixed inset-y-0 left-0 z-40 w-64 h-screen h-[100dvh] border-r border-white/5 bg-[#07070a]/90 backdrop-blur-md transition-transform duration-300 md:translate-x-0 md:static shrink-0 flex flex-col overflow-hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full min-h-0 overflow-hidden">
          {/* Brand Logo */}
          <div className="h-16 flex items-center px-6 border-b border-white/5 gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white overflow-hidden shrink-0">
              {branding?.logo && branding.logo !== '/images/logo.png' ? (
                <img src={branding.logo} alt={branding.name} className="h-full w-full object-cover" />
              ) : (
                <ShieldAlert className="h-4 w-4 text-black" />
              )}
            </div>
            <div>
              <span className="font-black text-white text-xs tracking-tight block uppercase">{branding?.name || 'Marketplace'}</span>
              <span className="text-[8px] text-white/45 block font-bold -mt-1 uppercase tracking-wider">Enterprise Admin</span>
            </div>
          </div>

          {/* Search Box */}
          <div className="px-4 pt-3 pb-1 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/25 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-white/40 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Nav links */}
          <nav
            tabIndex={0}
            aria-label="Admin Navigation"
            className="flex-1 min-h-0 px-4 py-2 overflow-y-auto overflow-x-hidden space-y-3 custom-scrollbar overscroll-y-contain focus:outline-none"
          >
            {navGroups.map((group) => {
              const groupItems = filteredNavItems.filter((item) => item.group === group);
              if (groupItems.length === 0) return null;

              // Check if any item in this group is currently active
              const hasActiveChild = groupItems.some((item) => pathname.startsWith(item.path));
              // When searching, force all matching groups to expand
              const isCollapsed = searchQuery.trim() ? false : (collapsedGroups[group] ?? (!hasActiveChild && group !== 'Dashboard'));

              // Compute total badge count in this group
              const totalGroupBadges = groupItems.reduce((acc, item) => {
                const badge = getBadgeForPath(item.path);
                return acc + (badge?.count || 0);
              }, 0);

              return (
                <div key={group} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-1.5">
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full px-2 py-1.5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.12em] text-white/40 hover:text-white/80 transition-colors cursor-pointer rounded-lg hover:bg-white/[0.02]"
                  >
                    <span className="flex items-center gap-1.5">
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3 text-white/40" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-white/40" />
                      )}
                      <span>{group}</span>
                    </span>
                    {totalGroupBadges > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[9px] font-bold shadow-sm ring-1 ring-purple-400/30">
                        {totalGroupBadges > 99 ? '99+' : totalGroupBadges}
                      </span>
                    )}
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-0.5 mt-1">
                      {groupItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.path);
                        const badgeInfo = getBadgeForPath(item.path);
                        return (
                          <Link
                            key={item.path}
                            href={item.path}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-white/10 text-white border border-white/15 shadow-sm'
                                : 'text-white/60 hover:text-white/95 hover:bg-white/[0.03] border border-transparent'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate flex-1 text-[11px]">{item.name}</span>
                            {badgeInfo && (
                              <span
                                id={badgeInfo.id}
                                className={`ml-auto inline-flex items-center justify-center min-w-4 h-4 px-1 text-[9px] rounded-full shadow-sm ring-1 animate-fade-in ${badgeInfo.colorClass}`}
                              >
                                {badgeInfo.count > 99 ? '99+' : badgeInfo.count}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User info & Logout */}
          <div className="p-4 border-t border-white/5 bg-white/[0.01] shrink-0 mt-auto">
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
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 bg-[#07070a]/60 backdrop-blur-md flex items-center justify-between px-6 z-30 shrink-0 sticky top-0">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/[0.05] transition-all md:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-white/40 font-semibold">
              <span>{branding?.name || 'Marketplace'}</span>
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

            {/* Notification Dropdown */}
            <AdminNotificationDropdown />
          </div>
        </header>

        {/* Content Body */}
        <main
          tabIndex={0}
          className="flex-1 min-h-0 p-6 overflow-y-auto overflow-x-hidden bg-transparent relative z-10 custom-scrollbar overscroll-y-contain focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
