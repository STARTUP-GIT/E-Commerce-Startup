import { useAnalytics } from '@/features/analytics/hooks/useAnalytics';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { ordersService } from '@/features/orders/services/ordersService';
import { productService } from '@/features/products/services/productService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  Plus,
  Store,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuth();
  const { metrics, chartData, isLoadingMetrics } = useAnalytics();
  const { orders, isLoading: isLoadingOrders } = useOrders();
  const navigate = useNavigate();

  const recentOrders = orders.slice(0, 5);

  const stats = [
    {
      name: "Today's Revenue",
      value: productService.formatPrice(metrics?.["today'sRevenue"] ?? 0),
      icon: DollarSign,
      desc: 'Settled earnings today',
      color: 'text-purple-400',
    },
    {
      name: "Today's Orders",
      value: `${metrics?.totalOrders ?? 0}`,
      icon: ShoppingBag,
      desc: 'Total orders placed today',
      color: 'text-indigo-400',
    },
    {
      name: 'Pending Custom Quotes',
      value: `${metrics?.pendingOrders ?? 0}`,
      icon: Clock,
      desc: 'Awaiting your quotation offer',
      color: 'text-yellow-400',
    },
    {
      name: 'Low Stock Alerts',
      value: `${metrics?.lowStockProducts ?? 0}`,
      icon: AlertTriangle,
      desc: 'Products below stock threshold',
      color: 'text-red-400',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-up">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white/95">
              Welcome back, {user?.firstName}
            </h1>
            <p className="text-xs text-white/45">Here is what is happening with your store today.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/products')} variant="outline" size="sm">
              Manage Products
            </Button>
            <Button onClick={() => navigate('/orders')} size="sm">
              Fulfill Orders
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        {isLoadingMetrics ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {stats.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className="border border-white/5 bg-white/[0.01]">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      {stat.name}
                    </CardTitle>
                    <Icon className={`h-4.5 w-4.5 ${stat.color}`} />
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <div className="text-xl font-extrabold text-white/90 tracking-tight">{stat.value}</div>
                    <p className="text-[10px] text-white/40 font-medium leading-none">{stat.desc}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Chart & Summary */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sales chart */}
          <Card className="lg:col-span-2 border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">Revenue Summary</CardTitle>
              <CardDescription>Daily settled store earnings this month</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-64 w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#07070a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '11px', color: '#fff' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col justify-center items-center text-center space-y-1.5">
                    <TrendingUp className="h-8 w-8 text-white/10" />
                    <span className="text-[11px] text-white/30 font-medium">No sales logs this month</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions & Overview */}
          <Card className="border border-white/5 flex flex-col justify-between">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">Quick Actions</CardTitle>
              <CardDescription>Task shortcuts for store management</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start text-[11px] h-10 border-white/5 hover:bg-white/[0.02]"
                onClick={() => navigate('/products')}
              >
                <Plus className="mr-2.5 h-4 w-4 text-purple-400" />
                <span>Add catalog item</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-[11px] h-10 border-white/5 hover:bg-white/[0.02]"
                onClick={() => navigate('/custom-orders')}
              >
                <Clock className="mr-2.5 h-4 w-4 text-indigo-400" />
                <span>Quote custom requests</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-[11px] h-10 border-white/5 hover:bg-white/[0.02]"
                onClick={() => navigate('/shop-settings')}
              >
                <Store className="mr-2.5 h-4 w-4 text-emerald-400" />
                <span>Link settlement bank</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent orders */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-white/90">Recent Incoming Orders</CardTitle>
              <CardDescription>Most recent customer orders placed on your shop</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/orders')} className="text-[11px]">
              <span>View All</span>
              <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingOrders ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : recentOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Placed At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((ord) => (
                    <TableRow key={ord.id} className="cursor-pointer" onClick={() => navigate(`/orders/${ord.id}`)}>
                      <TableCell className="font-bold text-white/90 text-xs">
                        {ord.order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ordersService.getStatusColor(ord.status)} className="text-[7.5px] py-0">
                          {ord.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-white/80">
                        {productService.formatPrice(ord.totalPrice)}
                      </TableCell>
                      <TableCell className="text-xs text-white/40">
                        {ordersService.formatDate(ord.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10 space-y-2.5">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <p className="text-[10px] text-white/35">No orders received yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
