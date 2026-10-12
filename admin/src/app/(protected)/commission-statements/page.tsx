"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Dialog, Drawer } from '@/shared/components/Dialog';
import { MonthPicker, formatMonthYearLabel } from '@/shared/components/MonthPicker';
import {
  FileSpreadsheet,
  Plus,
  Eye,
  CheckCircle,
  CreditCard,
  DollarSign,
  X,
  Search,
  ExternalLink,
  Download,
  AlertCircle
} from 'lucide-react';
import { SellerSearchSelect, type SellerOption } from '@/shared/components/SellerSearchSelect';

export default function CommissionStatementsPage() {
  const [page, setPage] = useState(1);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);

  // Preparation & Draft Form
  const [selectedSeller, setSelectedSeller] = useState<SellerOption | null>(null);
  const [periodMonth, setPeriodMonth] = useState('2026-10');
  const [statementTitle, setStatementTitle] = useState('Monthly Commission Settlement - October 2026');
  const [preparedData, setPreparedData] = useState<any | null>(null);

  // Record Payment Form
  const [paymentSellerId, setPaymentSellerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionReference, setTransactionReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-commission-statements', { page }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/commission-statements', { params: { page, limit: 20 } });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-commission-statement-detail', selectedStatementId],
    queryFn: async () => {
      if (!selectedStatementId) return null;
      const res = await axiosInstance.get(`/api/admin/commission-statements/${selectedStatementId}`);
      return res.data;
    },
    enabled: !!selectedStatementId,
  });

  // Check if a statement already exists for selectedSeller and periodMonth
  const existingStatement = React.useMemo(() => {
    if (!selectedSeller || !data?.statements) return null;
    return (data.statements as any[]).find(
      (s) => s.sellerId === selectedSeller.id && s.periodMonth === periodMonth
    );
  }, [selectedSeller, periodMonth, data]);

  const handlePeriodMonthChange = (newVal: string, displayLabel: string) => {
    setPeriodMonth(newVal);
    setStatementTitle(`Monthly Commission Settlement - ${displayLabel}`);
    setPreparedData(null); // Reset calculation when period changes
  };

  const prepareMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSeller) throw new Error('Please select a seller.');
      const res = await axiosInstance.get('/api/admin/commission-statements/prepare', {
        params: { sellerId: selectedSeller.id, periodMonth },
      });
      return res.data;
    },
    onSuccess: (data) => {
      setPreparedData(data);
      showToast('Aggregated order commissions calculated for period.', 'success');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to aggregate period data.', 'error'),
  });

  const createStatementMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSeller || !preparedData) throw new Error('Prepared data is required.');
      const res = await axiosInstance.post('/api/admin/commission-statements', {
        sellerId: selectedSeller.id,
        periodMonth,
        title: statementTitle,
        startDate: preparedData.startDate,
        endDate: preparedData.endDate,
        eligibleOrdersCount: preparedData.eligibleOrdersCount,
        eligibleOrderIds: preparedData.eligibleOrderIds,
        commissionableBase: preparedData.commissionableBase,
        applicableRate: preparedData.applicableRate,
        commissionAccrued: preparedData.commissionAccrued,
        adjustments: 0,
        paymentsReceived: preparedData.paymentsReceived,
        outstandingBalance: preparedData.outstandingBalance,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-statements'] });
      showToast('Monthly commission statement draft created.', 'success');
      setShowGenerateModal(false);
      setPreparedData(null);
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to create statement.', 'error'),
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.post(`/api/admin/commission-statements/${id}/publish`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-statements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-commission-statement-detail', selectedStatementId] });
      showToast('Commission statement published and delivered to seller.', 'success');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to publish statement.', 'error'),
  });

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!paymentSellerId || !paymentAmount) throw new Error('Seller and amount required.');
      const res = await axiosInstance.post('/api/admin/commission-statements/payments', {
        sellerId: paymentSellerId,
        statementId: selectedStatementId || undefined,
        amount: Number(paymentAmount),
        paymentMethod,
        transactionReference,
        notes: paymentNotes,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-statements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-commission-statement-detail', selectedStatementId] });
      showToast('Seller commission payment recorded successfully.', 'success');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setTransactionReference('');
      setPaymentNotes('');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to record payment.', 'error'),
  });

  const statements = data?.statements ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
            Monthly Seller Commission Statements
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Manual settlement reporting workflow. Accrues commission monthly and records confirmed seller remittances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowGenerateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 font-bold gap-2 text-white shadow-lg shadow-emerald-950/40"
          >
            <Plus className="h-4 w-4" />
            Prepare Monthly Statement
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card className="border border-slate-800 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-slate-800 bg-slate-900/80">
              <TableHead className="text-slate-400 text-xs font-semibold">Statement # &amp; Month</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Seller &amp; Shop</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Status</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Eligible Orders</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Accrued Commission</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold">Outstanding Due</TableHead>
              <TableHead className="text-slate-400 text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-b border-slate-800/50">
                  <TableCell colSpan={7}>
                    <Skeleton className="h-10 w-full bg-slate-800/40" />
                  </TableCell>
                </TableRow>
              ))
            ) : statements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500 text-xs">
                  No monthly statements prepared yet. Click "Prepare Monthly Statement" to generate one.
                </TableCell>
              </TableRow>
            ) : (
              statements.map((stmt: any) => (
                <TableRow key={stmt.id} className="border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors">
                  <TableCell>
                    <div className="font-mono text-xs text-white font-medium">{stmt.statementNumber}</div>
                    <div className="text-[11px] text-emerald-400 font-semibold">{formatMonthYearLabel(stmt.periodMonth)}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-white font-medium">{stmt.seller?.shop?.name || `${stmt.seller?.firstName} ${stmt.seller?.lastName}`}</div>
                    <div className="text-[11px] text-slate-400">{stmt.seller?.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={stmt.status === 'PUBLISHED' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}>
                      {stmt.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-slate-300">{stmt.eligibleOrdersCount} orders</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono font-medium text-white">INR {Number(stmt.commissionAccrued).toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-mono font-bold ${Number(stmt.outstandingBalance) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      INR {Number(stmt.outstandingBalance).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedStatementId(stmt.id)}
                      className="border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-xs gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Preparation Modal (Using Viewport-Centered Shared Dialog) */}
      <Dialog
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        maxWidth="max-w-xl"
        title="Prepare Monthly Statement"
        description="Aggregates all delivered orders for the selected calendar month."
        footer={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowGenerateModal(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!preparedData || !!existingStatement || createStatementMutation.isPending}
              onClick={() => createStatementMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs disabled:opacity-50"
            >
              {createStatementMutation.isPending ? 'Saving...' : 'Save Draft Statement'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Select Target Seller *</label>
            <SellerSearchSelect
              selected={selectedSeller}
              onSelect={(_id, seller) => {
                setSelectedSeller(seller);
                setPreparedData(null);
              }}
              onClear={() => {
                setSelectedSeller(null);
                setPreparedData(null);
              }}
            />
          </div>

          {/* Month Picker Control replacing manual text entry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <MonthPicker
                value={periodMonth}
                onChange={handlePeriodMonthChange}
                label="Reporting Month *"
                hint="Select reporting calendar month"
              />
            </div>
            <div>
              <Button
                size="sm"
                disabled={!selectedSeller || prepareMutation.isPending}
                onClick={() => prepareMutation.mutate()}
                className="w-full bg-slate-800 hover:bg-slate-700 text-xs font-semibold h-9"
              >
                {prepareMutation.isPending ? 'Calculating...' : 'Calculate Aggregates'}
              </Button>
            </div>
          </div>

          {/* Existing statement warning if already generated */}
          {existingStatement && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Statement already exists for this period</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Statement #{existingStatement.statementNumber} ({existingStatement.status}) has already been generated. View or finalize the existing statement from the table.
                </p>
              </div>
            </div>
          )}

          {preparedData && (
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3 animate-in fade-in-0 duration-200">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Aggregation Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Eligible Orders:</span>
                  <p className="font-semibold text-white">{preparedData.eligibleOrdersCount}</p>
                </div>
                <div>
                  <span className="text-slate-500">Commissionable Base:</span>
                  <p className="font-semibold text-white">INR {preparedData.commissionableBase.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Rate:</span>
                  <p className="font-semibold text-white">{preparedData.applicableRate}%</p>
                </div>
                <div>
                  <span className="text-slate-500">Commission Accrued:</span>
                  <p className="font-semibold text-emerald-400 font-mono">INR {preparedData.commissionAccrued.toFixed(2)}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/60">
                <label className="text-xs font-semibold text-slate-300 block mb-1">Statement Title *</label>
                <input
                  type="text"
                  value={statementTitle}
                  onChange={(e) => setStatementTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Statement Detail Drawer (Using Viewport-Aware Drawer) */}
      <Drawer
        isOpen={!!selectedStatementId}
        onClose={() => setSelectedStatementId(null)}
        maxWidth="max-w-lg"
        title="Commission Statement"
        subtitle={
          detailData?.statement && (
            <span className="font-mono text-xs text-emerald-400">
              {detailData.statement.statementNumber} • {formatMonthYearLabel(detailData.statement.periodMonth)}
            </span>
          )
        }
      >
        {isDetailLoading ? (
          <Skeleton className="h-48 w-full bg-slate-800/40" />
        ) : detailData?.statement ? (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Statement Status</span>
                <Badge className={detailData.statement.status === 'PUBLISHED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}>
                  {detailData.statement.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <span className="text-slate-500 block">Accrued Commission</span>
                  <span className="text-sm font-mono font-bold text-white">INR {Number(detailData.statement.commissionAccrued).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Outstanding Balance</span>
                  <span className="text-sm font-mono font-bold text-amber-400">INR {Number(detailData.statement.outstandingBalance).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Seller info */}
            <div className="space-y-1 p-3 rounded-lg bg-slate-950/40 border border-slate-800 text-xs">
              <span className="text-slate-500 block font-semibold uppercase text-[10px]">Recipient</span>
              <div className="text-white font-medium">{detailData.statement.seller?.shop?.name || `${detailData.statement.seller?.firstName} ${detailData.statement.seller?.lastName}`}</div>
              <div className="text-slate-400">{detailData.statement.seller?.email}</div>
            </div>

            {/* Actions */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              {detailData.statement.status === 'DRAFT' && (
                <Button
                  onClick={() => { if (selectedStatementId) publishMutation.mutate(selectedStatementId); }}
                  disabled={publishMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {publishMutation.isPending ? 'Publishing...' : 'Approve & Publish Statement'}
                </Button>
              )}

              <Button
                onClick={() => {
                  setPaymentSellerId(detailData.statement.sellerId);
                  setShowPaymentModal(true);
                }}
                variant="outline"
                className="w-full border-slate-700 hover:bg-slate-800 text-xs gap-1.5"
              >
                <CreditCard className="h-4 w-4" />
                Record Confirmed Remittance / Payment
              </Button>
            </div>

            {/* Payments Log */}
            <div className="space-y-2 border-t border-slate-800 pt-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Remittances Recorded ({detailData.statement.payments?.length ?? 0})
              </h4>
              <div className="space-y-1.5">
                {detailData.statement.payments?.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2">No payments recorded yet.</p>
                ) : (
                  detailData.statement.payments?.map((p: any) => (
                    <div key={p.id} className="p-2.5 rounded bg-slate-950/40 text-xs border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-emerald-400 font-bold">INR {Number(p.amount).toFixed(2)}</div>
                        <div className="text-[11px] text-slate-500">{p.paymentMethod} • Ref: {p.transactionReference || 'N/A'}</div>
                      </div>
                      <span className="text-[11px] text-slate-400">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* Record Payment Modal (Using Viewport-Centered Shared Dialog) */}
      <Dialog
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        maxWidth="max-w-md"
        title="Record Commission Payment"
        description="Records confirmed bank transfer or payment gateway remittance."
        footer={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!paymentAmount || Number(paymentAmount) <= 0 || recordPaymentMutation.isPending}
              onClick={() => recordPaymentMutation.mutate()}
              className="bg-emerald-600 hover:bg-emerald-500 font-bold text-white text-xs"
            >
              {recordPaymentMutation.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Amount Received (INR) *</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
              <option value="UPI">UPI</option>
              <option value="PAYMENT_GATEWAY">Payment Gateway</option>
              <option value="ADJUSTMENT">Reconciliation Adjustment</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Transaction Reference / UTR</label>
            <input
              type="text"
              placeholder="e.g. UTR1234567890"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Payment confirmation notes or remarks..."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white resize-none focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
