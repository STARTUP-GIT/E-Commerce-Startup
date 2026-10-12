"use client";

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ShieldAlert, CheckCircle2, X } from 'lucide-react';

interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId?: string;
  shopId?: string;
  productId?: string;
  orderId?: string;
  targetName?: string;
}

export function ReportIssueModal({
  isOpen,
  onClose,
  sellerId,
  shopId,
  productId,
  orderId,
  targetName = 'Merchant / Product',
}: ReportIssueModalProps) {
  const [category, setCategory] = useState('COUNTERFEIT');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);

  const queryClient = useQueryClient();

  const submitReportMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim() || !description.trim()) {
        throw new Error('Please fill in the summary reason and detailed description.');
      }
      const res = await axiosInstance.post('/customer/api/reports', {
        category,
        reason: reason.trim(),
        description: description.trim(),
        sellerId: sellerId || undefined,
        shopId: shopId || undefined,
        productId: productId || undefined,
        orderId: orderId || undefined,
        attachmentUrls: evidenceUrl ? [evidenceUrl.trim()] : [],
      });
      return res.data;
    },
    onSuccess: (data) => {
      setSubmittedReport(data.report);
      queryClient.invalidateQueries({ queryKey: ['customer-reports'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to submit report.');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-lg w-full bg-[#0d0d14] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-white">
        {submittedReport ? (
          <div className="space-y-4 text-center py-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold">Customer Report Registered</h3>
            <p className="text-xs text-white/60 max-w-sm mx-auto">
              Your report has been logged and assigned case reference{' '}
              <span className="font-mono text-emerald-400 font-bold">{submittedReport.reportNumber}</span>.
              A platform compliance officer will investigate the timeline and evidence.
            </p>
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-left text-xs space-y-1">
              <div>Category: <span className="font-semibold text-white">{submittedReport.category}</span></div>
              <div>Timestamp: <span className="text-white/60">{new Date(submittedReport.createdAt).toLocaleString()}</span></div>
              <div>Status: <Badge variant="outline" className="text-[10px]">{submittedReport.status}</Badge></div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setSubmittedReport(null);
                onClose();
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-sm">Report Violation or Order Issue</h3>
              </div>
              <button onClick={onClose} className="text-white/40 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-white/50">
              Reporting against: <span className="text-white font-semibold">{targetName}</span>. All reports are timestamped and reviewed by our trust & safety team.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-white/80 block mb-1">Violation Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="COUNTERFEIT" className="bg-[#0d0d14]">Counterfeit or Replica Product</option>
                  <option value="NON_DELIVERY" className="bg-[#0d0d14]">Non-Delivery / Tracking Fraud</option>
                  <option value="DEFECTIVE" className="bg-[#0d0d14]">Defective / Severely Not as Described</option>
                  <option value="FRAUD" className="bg-[#0d0d14]">Payment / Financial Fraud</option>
                  <option value="HARASSMENT" className="bg-[#0d0d14]">Abusive Behavior / Harassment</option>
                  <option value="OTHER" className="bg-[#0d0d14]">Other Marketplace Violation</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/80 block mb-1">Summary Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Received counterfeit electronic item"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/80 block mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  placeholder="Explain what happened in detail with dates and factual evidence..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-white/80 block mb-1">Evidence Photo / Document URL (Optional)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <Button size="sm" variant="outline" onClick={onClose} className="border-white/10 text-xs text-white/70">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!reason.trim() || !description.trim() || submitReportMutation.isPending}
                onClick={() => submitReportMutation.mutate()}
                className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs"
              >
                {submitReportMutation.isPending ? 'Logging Case...' : 'Submit Incident Report'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
