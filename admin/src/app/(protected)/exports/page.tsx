"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Download, FileText, FileSpreadsheet, Filter } from 'lucide-react';
import { useUIStore } from '@/lib/store/uiStore';

const EXPORT_TYPES = [
  { id: 'orders', label: 'Orders Report', description: 'Export all customer orders, item details, shops, and financial breakdown.' },
  { id: 'payments', label: 'Payments & Transactions', description: 'Export gateway transactions, payment methods, fees, and status logs.' },
  { id: 'customers', label: 'Customers List', description: 'Export customer directory, account status, email contacts, and join dates.' },
  { id: 'sellers', label: 'Sellers Directory', description: 'Export verified sellers, shop details, performance standing, and status.' },
  { id: 'products', label: 'Products Catalog', description: 'Export product catalog, pricing, inventory stock, status, and seller info.' },
  { id: 'returns', label: 'Returns & Refunds', description: 'Export customer return requests, refund totals, reasons, and status.' },
  { id: 'reviews', label: 'Reviews & Ratings', description: 'Export product reviews, star ratings, moderation status, and timestamps.' },
];

export default function ExportsPage() {
  const [selectedType, setSelectedType] = useState('orders');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [limit, setLimit] = useState(1000);
  const { showToast } = useUIStore();

  const handleDownload = (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (status) params.append('status', status);
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      if (limit) params.append('limit', String(limit));

      const downloadUrl = `/api/admin/exports/${selectedType}?${params.toString()}`;
      window.open(downloadUrl, '_blank');
      showToast(`Generating ${format.toUpperCase()} export for ${selectedType}...`, 'info');
    } catch (e: any) {
      showToast(e.message || 'Export failed', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
          <Download className="h-6 w-6 text-white/70" />
          Reports & Exports Engine
        </h1>
        <p className="text-xs text-white/45 mt-1">
          Generate server-side CSV & PDF exports for revenue, orders, customers, sellers, products, and financials.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Selection */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-xs font-bold text-white/40 uppercase tracking-wider block mb-1">Select Dataset</span>
          {EXPORT_TYPES.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedType(item.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedType === item.id
                  ? 'bg-white/10 border-white/20 text-white shadow-lg'
                  : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10 hover:text-white'
              }`}
            >
              <h3 className="text-sm font-bold text-white/90">{item.label}</h3>
              <p className="text-xs text-white/45 mt-1">{item.description}</p>
            </div>
          ))}
        </div>

        {/* Configuration Pane */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-bold text-white/90 flex items-center gap-2">
                <Filter className="h-4 w-4 text-white/60" />
                Export Filters ({EXPORT_TYPES.find(t => t.id === selectedType)?.label})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/60 block mb-1.5">From Date</label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/60 block mb-1.5">To Date</label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-white/60 block mb-1.5">Specific Status Filter (Optional)</label>
                  <Input
                    placeholder="e.g. COMPLETED, PAID, ACTIVE..."
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-white/60 block mb-1.5">Max Records Limit</label>
                  <Input
                    type="number"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    min={10}
                    max={5000}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={() => handleDownload('csv')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-2 py-3"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download CSV Dataset
                </Button>

                <Button
                  onClick={() => handleDownload('pdf')}
                  variant="outline"
                  className="flex-1 border-white/20 hover:bg-white/10 text-white font-bold gap-2 py-3"
                >
                  <FileText className="h-4 w-4" />
                  Generate Formatted PDF Report
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/5 bg-white/[0.01] p-4">
            <h4 className="text-xs font-bold text-white/70 mb-1">Server-side Streaming Export Notice</h4>
            <p className="text-xs text-white/40">
              Exports respect all active date and status filters and stream rows securely from PostgreSQL. Large datasets up to 5,000 rows are compiled directly by server workers without browser memory limit crashes.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
