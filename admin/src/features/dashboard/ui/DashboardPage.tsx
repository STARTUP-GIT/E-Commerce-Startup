"use client";

import React from 'react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useDashboard, useMonthlyRevenue, useRecentActivities } from '@/features/analytics/hooks/useAnalytics';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, IndianRupee, ShoppingBag, Users, Store, MapPin,
  AlertTriangle, Package, Clock, ArrowUpRight, Activity, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatPrice } from '@/shared/utils/format';

function StatCard({
  label, value, desc, icon: Icon, iconColor, href, index
}: {
  label: string; value: string | number; desc: string;
  icon: React.ElementType; iconColor: string; href?: string; index: number;
}) {
  const content = (
    <Card className={`border border-white/5 bg-white/[0.01] glass-hover card-stagger`}
      style={{ animationDelay: `${index * 70}ms` }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
          {label}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-xl font-extrabold text-white/90 tracking-tight">{value}</div>
        <p className="text-[10px] text-white/40 font-medium leading-none">{desc}</p>
      </CardContent>
    </Card>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

export function DashboardPage() {
  const { admin } = useAuth();
  const { data: dashboard, isLoading: isDashboardLoading } = useDashboard();
  const { data: monthlyRevenue, isLoading: isMonthlyLoading } = useMonthlyRevenue();
  const { data: activities, isLoading: isActivitiesLoading } = useRecentActivities();

  const stats = [
    {
      label: "Total Revenue",
      value: dashboard?.totalRevenue ? formatPrice(dashboard.totalRevenue) : '₹0.00',
      desc: 'Lifetime platform order value',
      icon: IndianRupee,
      iconColor: 'text-white/40',
      href: '/orders',
    },
    {
      label: "Commission Earned",
      value: dashboard?.platformRevenue ? formatPrice(dashboard.platformRevenue) : '₹0.00',
      desc: 'Lifetime platform commission',
      icon: IndianRupee,
      iconColor: 'text-white/40',
      href: '/orders',
    },
    {
      label: "Total Shops",
      value: dashboard?.totalShops ?? 0,
      desc: 'Total registered storefronts',
      icon: Store,
      iconColor: 'text-white/40',
      href: '/shops',
    },
    {
      label: "Pending Shop Approvals",
      value: dashboard?.pendingShopApprovals ?? 0,
      desc: 'Shops awaiting admin review',
      icon: Clock,
      iconColor: 'text-white/40',
      href: '/shops',
    },
    {
      label: "Active Shops",
      value: dashboard?.activeShops ?? 0,
      desc: 'Approved live storefronts',
      icon: CheckCircle2,
      iconColor: 'text-white/40',
      href: '/shops',
    },
    {
      label: "Inactive Shops",
      value: dashboard?.inactiveShops ?? 0,
      desc: 'Suspended or disabled shops',
      icon: AlertTriangle,
      iconColor: 'text-white/40',
      href: '/shops',
    },
    {
      label: "Total Orders",
      value: dashboard?.ordersCount?.total ?? 0,
      desc: 'All orders on the platform',
      icon: ShoppingBag,
      iconColor: 'text-white/40',
      href: '/orders',
    },
    {
      label: "Total Customers",
      value: dashboard?.totalCustomers ?? 0,
      desc: 'Registered customers',
      icon: Users,
      iconColor: 'text-white/40',
      href: '/customers',
    },
    {
      label: "Total Sellers",
      value: typeof dashboard?.sellersCount === 'object' ? (dashboard?.sellersCount?.total ?? 0) : (dashboard?.sellersCount ?? 0),
      desc: 'Registered seller accounts',
      icon: Users,
      iconColor: 'text-white/40',
      href: '/sellers',
    },
  ];

  // Prepare chart data from monthly revenue
  const chartData = monthlyRevenue?.monthlyRevenue ?? monthlyRevenue?.data ?? (Array.isArray(monthlyRevenue) ? monthlyRevenue : []);

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">
            Welcome back, {admin?.firstName}
          </h1>
          <p className="text-xs text-white/45">
            Aura Marketplace · Enterprise Administration Control Panel
          </p>
        </div>
        <div className="flex gap-2 text-[10px] text-white/40 font-medium items-center bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2">
          <Activity className="h-3.5 w-3.5 text-white/60" />
          <span>All systems operational</span>
        </div>
      </div>

      {/* Stats Grid */}
      {isDashboardLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <StatCard key={stat.label} {...stat} index={i} />
          ))}
        </div>
      )}

      {/* Chart & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Monthly Revenue</CardTitle>
            <CardDescription>Platform revenue over the past months</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64 w-full">
              {isMonthlyLoading ? (
                <Skeleton className="h-full w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ffffff" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#07070a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}
                      itemStyle={{ fontSize: '11px', color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#ffffff" strokeWidth={2} fillOpacity={1} fill="url(#adminRevGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-center space-y-1.5">
                  <TrendingUp className="h-8 w-8 text-white/10" />
                  <span className="text-[11px] text-white/30 font-medium">No revenue data available yet</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Quick Actions</CardTitle>
            <CardDescription>Common administrative workflows</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {[
              { label: 'Review Pending Sellers', href: '/sellers', color: 'text-white/60' },
              { label: 'Manage Packing Requests', href: '/shops', color: 'text-white/60' },
              { label: 'Review Open Reports', href: '/reports', color: 'text-white/60' },
              { label: 'Process Refunds', href: '/payments', color: 'text-white/60' },
              { label: 'Broadcast Notification', href: '/notifications', color: 'text-white/60' },
              { label: 'Update Platform Settings', href: '/settings', color: 'text-white/60' },
            ].map(({ label, href, color }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between w-full h-10 px-3 rounded-xl border border-white/5 hover:bg-white/[0.04] hover:border-white/10 text-[11px] font-semibold text-white/70 hover:text-white/95 transition-all group"
              >
                <span>{label}</span>
                <ArrowUpRight className={`h-3.5 w-3.5 ${color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xs font-bold text-white/90">Recent Activity</CardTitle>
            <CardDescription>Latest system events across the platform</CardDescription>
          </div>
          <Link href="/audit-logs" className="text-[10px] font-semibold text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors">
            View All <ArrowUpRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {isActivitiesLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (activities?.activities ?? activities ?? []).length > 0 ? (
            <div className="divide-y divide-white/5">
              {(activities?.activities ?? activities ?? []).slice(0, 8).map((activity: any, i: number) => (
                <div key={i} className="flex items-start gap-3 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="h-7 w-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Activity className="h-3.5 w-3.5 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white/80 line-clamp-1">
                      {activity.description ?? activity.action ?? activity.type ?? 'System event'}
                    </p>
                    <p className="text-[10px] text-white/35 mt-0.5">
                      {activity.createdAt ? new Date(activity.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  {activity.entityType && (
                    <Badge variant="outline" className="text-[8px] shrink-0">
                      {activity.entityType}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-2.5">
              <Activity className="h-8 w-8 text-white/10 mx-auto" />
              <p className="text-[10px] text-white/35">No recent activity to show</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
