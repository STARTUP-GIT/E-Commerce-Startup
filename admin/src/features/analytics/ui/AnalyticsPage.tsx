"use client";

import React from 'react';
import { useStatistics, useMonthlyRevenue, useRevenue } from '../hooks/useAnalytics';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, IndianRupee } from 'lucide-react';
import { formatPrice } from '@/shared/utils/format';

const CHART_COLORS = ['#ffffff', '#a1a1aa', '#71717a', '#3f3f46'];

export function AnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useStatistics();
  const { data: monthlyRevenue, isLoading: monthlyLoading } = useMonthlyRevenue();

  const chartData = monthlyRevenue?.data ?? monthlyRevenue ?? [];

  const statItems = [
    { label: 'Total Revenue', value: stats?.totalRevenue ? formatPrice(stats.totalRevenue) : '—', icon: IndianRupee, color: 'text-white/60' },
    { label: 'Total Orders', value: stats?.totalOrders ?? '—', icon: ShoppingBag, color: 'text-white/60' },
    { label: 'Total Customers', value: stats?.totalCustomers ?? '—', icon: Users, color: 'text-white/60' },
    { label: 'Growth Rate', value: stats?.growthRate ? `${stats.growthRate}%` : '—', icon: TrendingUp, color: 'text-white/60' },
  ];

  return (
    <div className="space-y-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white/95">Analytics</h1>
        <p className="text-xs text-white/45 mt-1">Deep insights into platform performance and trends</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          statItems.map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border border-white/5 glass-hover">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
                <Icon className={`h-4 w-4 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-extrabold text-white/90">{value}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Revenue Chart */}
      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Monthly Revenue Trend</CardTitle>
          <CardDescription>Revenue performance month over month</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-72">
            {monthlyLoading ? (
              <Skeleton className="h-full w-full" />
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="revenue" stroke="#ffffff" strokeWidth={2.5} fillOpacity={1} fill="url(#analyticsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center space-y-2">
                <TrendingUp className="h-8 w-8 text-white/10" />
                <p className="text-xs text-white/30">No monthly data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Volume Chart */}
      {chartData.length > 0 && (
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Order Volume</CardTitle>
            <CardDescription>Order counts by month</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#07070a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}
                    itemStyle={{ fontSize: '11px', color: '#fff' }}
                  />
                  <Bar dataKey="orders" fill="#71717a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
