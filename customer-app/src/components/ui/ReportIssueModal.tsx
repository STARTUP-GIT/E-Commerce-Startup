"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { storageService } from '@/features/storage/services/storage.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle2,
  X,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  Check,
  ChevronDown,
  Package,
  Store,
  ShoppingBag,
} from 'lucide-react';

export interface ReportIssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId?: string;
  shopId?: string;
  productId?: string;
  orderId?: string;
  targetName?: string;
  initialCategory?: string;
  targetType?: 'ORDER' | 'PRODUCT' | 'SELLER' | 'SHOP' | 'OTHER';
}

interface EvidenceFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  cloudinaryUrl?: string;
  cloudinaryKey?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  progress: number;
}

export function ReportIssueModal({
  isOpen,
  onClose,
  sellerId,
  shopId,
  productId,
  orderId: initialOrderId,
  targetName,
  initialCategory,
  targetType: initialTargetType,
}: ReportIssueModalProps) {
  // Determine starting target type
  const defaultTargetType = initialTargetType || (initialOrderId ? 'ORDER' : (productId ? 'PRODUCT' : (sellerId || shopId ? 'SELLER' : 'ORDER')));
  const [selectedTargetType, setSelectedTargetType] = useState<'ORDER' | 'PRODUCT' | 'SELLER' | 'OTHER'>(
    defaultTargetType === 'SHOP' ? 'SELLER' : (defaultTargetType as any)
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string>(initialOrderId || '');
  const [orderSearch, setOrderSearch] = useState('');
  const [isOrderDropdownOpen, setIsOrderDropdownOpen] = useState(false);

  const [category, setCategory] = useState(initialCategory || 'COUNTERFEIT');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<any | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const orderDropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      if (initialOrderId) {
        setSelectedOrderId(initialOrderId);
        setSelectedTargetType('ORDER');
      } else if (productId) {
        setSelectedTargetType('PRODUCT');
      } else if (sellerId || shopId) {
        setSelectedTargetType('SELLER');
      }
      if (initialCategory) {
        setCategory(initialCategory);
      }
      setUploadError(null);
    }
  }, [isOpen, initialOrderId, productId, sellerId, shopId, initialCategory]);

  // Click outside to close order dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (orderDropdownRef.current && !orderDropdownRef.current.contains(e.target as Node)) {
        setIsOrderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch authorized orders belonging to this customer
  const { data: orders = [], isLoading: isOrdersLoading, isError: isOrdersError } = useQuery({
    queryKey: ['customer-orders-report-modal'],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/orders');
      return res.data?.orders || [];
    },
    enabled: isOpen,
    staleTime: 30 * 1000,
  });

  const selectedOrder = orders.find((o: any) => o.id === selectedOrderId || o.orderNumber === selectedOrderId);

  // Filter orders by search
  const filteredOrders = orders.filter((o: any) => {
    const q = orderSearch.toLowerCase();
    const matchesNum = (o.orderNumber || '').toLowerCase().includes(q);
    const matchesStatus = (o.status || '').toLowerCase().includes(q);
    const matchesItem = o.sellerOrders?.some((so: any) =>
      so.items?.some((it: any) => (it.productName || '').toLowerCase().includes(q))
    );
    return matchesNum || matchesStatus || matchesItem;
  });

  // Handle local file selection
  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
      'application/pdf',
    ];
    const maxFiles = 5;
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB

    const newFiles: EvidenceFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (evidenceFiles.length + newFiles.length >= maxFiles) {
        setUploadError(`Maximum ${maxFiles} evidence attachments allowed.`);
        break;
      }

      if (!allowedMimes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
        setUploadError(`Unsupported file format "${file.name}". Please upload JPG, PNG, WEBP, or PDF.`);
        continue;
      }

      if (file.size > maxSizeBytes) {
        setUploadError(`"${file.name}" exceeds 10MB maximum limit.`);
        continue;
      }

      const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : '';

      const evidenceItem: EvidenceFile = {
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        status: 'pending',
        progress: 0,
      };

      newFiles.push(evidenceItem);
    }

    if (newFiles.length > 0) {
      setEvidenceFiles((prev) => [...prev, ...newFiles]);
      // Immediately upload each new file to Cloudinary
      newFiles.forEach((f) => uploadSingleEvidence(f));
    }
  };

  // Upload single file through storageService
  const uploadSingleEvidence = async (item: EvidenceFile) => {
    setEvidenceFiles((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, status: 'uploading', progress: 20, errorMessage: undefined } : f))
    );

    try {
      const uploadRes = await storageService.uploadEvidenceFile(item.file, 'reports', (progressEvent) => {
        if (progressEvent && progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setEvidenceFiles((prev) =>
            prev.map((f) => (f.id === item.id ? { ...f, progress: Math.min(percent, 95) } : f))
          );
        }
      });

      setEvidenceFiles((prev) =>
        prev.map((f) =>
          f.id === item.id
            ? {
                ...f,
                status: 'success',
                progress: 100,
                cloudinaryUrl: uploadRes.url,
                cloudinaryKey: uploadRes.key,
              }
            : f
        )
      );
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Upload failed';
      setEvidenceFiles((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: 'error', errorMessage: msg, progress: 0 } : f))
      );
    }
  };

  const removeFile = (id: string) => {
    setEvidenceFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const submitReportMutation = useMutation({
    mutationFn: async () => {
      if (!reason.trim() || !description.trim()) {
        throw new Error('Please fill in the summary reason and detailed description.');
      }

      if (selectedTargetType === 'ORDER' && !selectedOrderId) {
        throw new Error('Please select the order related to this incident report.');
      }

      // Check if any files are currently uploading
      const stillUploading = evidenceFiles.some((f) => f.status === 'uploading');
      if (stillUploading) {
        throw new Error('Please wait for evidence file uploads to complete.');
      }

      // Gather uploaded Cloudinary URLs
      const uploadedUrls = evidenceFiles
        .filter((f) => f.status === 'success' && f.cloudinaryUrl)
        .map((f) => f.cloudinaryUrl as string);

      const payload: any = {
        category,
        reason: reason.trim(),
        description: description.trim(),
        targetType: selectedTargetType,
        attachments: uploadedUrls,
        attachmentUrls: uploadedUrls,
      };

      if (selectedTargetType === 'ORDER') {
        payload.orderId = selectedOrderId;
        payload.targetId = selectedOrderId;
      } else if (selectedTargetType === 'PRODUCT') {
        payload.productId = productId || undefined;
        payload.targetId = productId || targetName || 'Product Report';
      } else if (selectedTargetType === 'SELLER') {
        payload.sellerId = sellerId || undefined;
        payload.shopId = shopId || undefined;
        payload.targetId = sellerId || shopId || targetName || 'Merchant Report';
      } else {
        payload.targetId = targetName || 'General Marketplace Report';
      }

      const res = await axiosInstance.post('/customer/api/reports', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setSubmittedReport(data.report);
      queryClient.invalidateQueries({ queryKey: ['customer-reports'] });
    },
    onError: (err: any) => {
      setUploadError(err.response?.data?.message || err.message || 'Failed to submit incident report.');
    },
  });

  const isUploadingAny = evidenceFiles.some((f) => f.status === 'uploading');
  const hasFailedUploads = evidenceFiles.some((f) => f.status === 'error');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-xl w-full max-h-[calc(100dvh-3rem)] bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Report Violation or Order Issue</h3>
              <p className="text-[11px] text-white/50">
                Official investigation intake for counterfeit, fraud, or delivery disputes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {submittedReport ? (
            <div className="space-y-4 text-center py-6">
              <div className="h-14 w-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white">Incident Report Filed Successfully</h3>
                <p className="text-xs text-white/60 max-w-sm mx-auto mt-1">
                  Your case reference is{' '}
                  <span className="font-mono text-emerald-400 font-bold px-1 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
                    {submittedReport.reportNumber}
                  </span>
                  . A compliance officer has been notified.
                </p>
              </div>

              <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl text-left text-xs space-y-1.5 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-white/50">Category:</span>
                  <span className="font-semibold text-white">{submittedReport.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Target:</span>
                  <span className="font-mono text-white/80">{submittedReport.targetType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Evidence Attached:</span>
                  <span className="font-semibold text-white">{submittedReport.attachments?.length || 0} file(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Current Status:</span>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                    {submittedReport.status}
                  </Badge>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  setSubmittedReport(null);
                  onClose();
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-6"
              >
                Close & Return
              </Button>
            </div>
          ) : (
            <>
              {uploadError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                  <span>{uploadError}</span>
                  <button onClick={() => setUploadError(null)} className="text-rose-400 hover:text-white">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Target Type Selector */}
              <div>
                <label className="text-[11px] font-semibold text-white/80 block mb-1.5">
                  Report Target *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTargetType('ORDER')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      selectedTargetType === 'ORDER'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>My Order</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTargetType('PRODUCT')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      selectedTargetType === 'PRODUCT'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.04]'
                    }`}
                  >
                    <ShoppingBag className="h-3.5 w-3.5" />
                    <span>Product</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTargetType('SELLER')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                      selectedTargetType === 'SELLER'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                        : 'border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>Merchant</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Target Selection: Orders */}
              {selectedTargetType === 'ORDER' && (
                <div className="relative" ref={orderDropdownRef}>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">
                    Select Your Order *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsOrderDropdownOpen(!isOrderDropdownOpen)}
                    className="w-full h-11 px-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-white flex items-center justify-between hover:bg-white/[0.05] transition-colors text-left"
                  >
                    {selectedOrder ? (
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono font-bold text-amber-300">
                          #{selectedOrder.orderNumber}
                        </span>
                        <span className="text-white/40">·</span>
                        <span className="text-white/70">
                          {new Date(selectedOrder.placedAt || selectedOrder.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-white/40">·</span>
                        <span className="text-white/90 font-medium">
                          ${Number(selectedOrder.grandTotal || 0).toFixed(2)}
                        </span>
                        <Badge variant="outline" className="text-[9px] ml-1 uppercase">
                          {selectedOrder.status}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-white/40">
                        {isOrdersLoading ? 'Loading your orders...' : 'Choose an order from your history...'}
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${isOrderDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isOrderDropdownOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl border border-white/10 bg-[#12121c] p-2 shadow-2xl backdrop-blur-xl max-h-56 flex flex-col space-y-1">
                      <div className="relative mb-1">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                        <input
                          type="text"
                          placeholder="Search by order # or product..."
                          value={orderSearch}
                          onChange={(e) => setOrderSearch(e.target.value)}
                          className="w-full h-8 pl-8 pr-2 rounded-lg bg-white/[0.04] border border-white/5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="overflow-y-auto space-y-1 flex-1 pr-1">
                        {isOrdersLoading ? (
                          <div className="p-4 text-center text-xs text-white/40">Loading orders...</div>
                        ) : isOrdersError ? (
                          <div className="p-4 text-center text-xs text-rose-400">Failed to load orders.</div>
                        ) : filteredOrders.length === 0 ? (
                          <div className="p-4 text-center text-xs text-white/40">No eligible orders found.</div>
                        ) : (
                          filteredOrders.map((ord: any) => {
                            const isCurrent = ord.id === selectedOrderId || ord.orderNumber === selectedOrderId;
                            return (
                              <button
                                key={ord.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOrderId(ord.id);
                                  setIsOrderDropdownOpen(false);
                                }}
                                className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors ${
                                  isCurrent ? 'bg-amber-500/20 text-white' : 'hover:bg-white/[0.04] text-white/80'
                                }`}
                              >
                                <div>
                                  <div className="font-mono font-bold text-amber-300">#{ord.orderNumber}</div>
                                  <div className="text-[10px] text-white/40">
                                    {new Date(ord.placedAt || ord.createdAt).toLocaleDateString()} · ${Number(ord.grandTotal || 0).toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-[9px]">
                                    {ord.status}
                                  </Badge>
                                  {isCurrent && <Check className="h-3.5 w-3.5 text-amber-400" />}
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Product Target Display */}
              {selectedTargetType === 'PRODUCT' && (
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Target Product</span>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />
                    <span>{targetName || (productId ? `Product #${productId}` : 'General Product Violation')}</span>
                  </div>
                </div>
              )}

              {/* Seller / Shop Target Display */}
              {selectedTargetType === 'SELLER' && (
                <div className="p-3 bg-white/[0.02] border border-white/10 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Target Merchant</span>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Store className="h-3.5 w-3.5 text-amber-400" />
                    <span>{targetName || (sellerId ? `Merchant #${sellerId}` : 'General Merchant Policy Violation')}</span>
                  </div>
                </div>
              )}

              {/* Violation Category */}
              <div>
                <label className="text-[11px] font-semibold text-white/80 block mb-1">Violation Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="COUNTERFEIT" className="bg-[#0d0d14]">Counterfeit / Replica Product</option>
                  <option value="NON_DELIVERY" className="bg-[#0d0d14]">Non-Delivery / Tracking Fraud</option>
                  <option value="DEFECTIVE" className="bg-[#0d0d14]">Defective / Severely Not as Described</option>
                  <option value="FRAUD" className="bg-[#0d0d14]">Suspected Financial / Payment Fraud</option>
                  <option value="MISLEADING" className="bg-[#0d0d14]">Misleading Listing / Fake Claims</option>
                  <option value="HARASSMENT" className="bg-[#0d0d14]">Harassment / Abusive Interaction</option>
                  <option value="OTHER" className="bg-[#0d0d14]">Other Marketplace Violation</option>
                </select>
              </div>

              {/* Summary Reason */}
              <div>
                <label className="text-[11px] font-semibold text-white/80 block mb-1">Summary Reason *</label>
                <input
                  type="text"
                  placeholder="e.g. Received counterfeit electronic item differing from listing photos"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 px-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Detailed Description */}
              <div>
                <label className="text-[11px] font-semibold text-white/80 block mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  placeholder="Describe facts, dates, tracking discrepancies, or merchant responses in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Evidence File Uploader with Cloudinary Storage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-white/80 flex items-center gap-1.5">
                    <UploadCloud className="h-3.5 w-3.5 text-amber-400" />
                    <span>Evidence Attachments ({evidenceFiles.length}/5)</span>
                  </label>
                  <span className="text-[10px] text-white/40">JPG, PNG, WEBP, PDF up to 10MB</span>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFilesSelected(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 sm:p-5 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/jpg,application/pdf"
                    className="hidden"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                  <div className="flex flex-col items-center gap-1.5 text-xs text-white/60">
                    <UploadCloud className="h-6 w-6 text-white/30" />
                    <span>
                      Drag &amp; drop files here, or <strong className="text-amber-400">browse local files</strong>
                    </span>
                    <span className="text-[10px] text-white/40">
                      Upload parcel photos, unboxing videos/screenshots, receipts, or shipping receipts.
                    </span>
                  </div>
                </div>

                {/* Previews & Attachment List */}
                {evidenceFiles.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {evidenceFiles.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {item.previewUrl ? (
                            <img
                              src={item.previewUrl}
                              alt="preview"
                              className="h-10 w-10 rounded-lg object-cover border border-white/10 shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-white/40">
                              <FileText className="h-5 w-5" />
                            </div>
                          )}
                          <div className="truncate">
                            <p className="font-medium text-white truncate max-w-[200px] sm:max-w-xs">{item.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-white/40">
                              <span>{(item.size / (1024 * 1024)).toFixed(2)} MB</span>
                              <span>·</span>
                              {item.status === 'uploading' && (
                                <span className="text-amber-400 flex items-center gap-1">
                                  <Loader2 className="h-2.5 w-2.5 animate-spin" /> Uploading to secure storage...
                                </span>
                              )}
                              {item.status === 'success' && (
                                <span className="text-emerald-400 flex items-center gap-1">
                                  <Check className="h-2.5 w-2.5" /> Ready (Cloudinary Secure)
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="text-rose-400">{item.errorMessage || 'Upload failed'}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.status === 'error' && (
                            <button
                              type="button"
                              onClick={() => uploadSingleEvidence(item)}
                              title="Retry upload"
                              className="h-7 w-7 rounded-lg border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFile(item.id)}
                            title="Remove file"
                            className="h-7 w-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!submittedReport && (
          <div className="p-4 sm:p-5 border-t border-white/10 flex items-center justify-end gap-2 shrink-0 bg-white/[0.02]">
            <Button
              size="sm"
              variant="outline"
              onClick={onClose}
              disabled={submitReportMutation.isPending || isUploadingAny}
              className="border-white/10 text-xs text-white/70 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={
                !reason.trim() ||
                !description.trim() ||
                (selectedTargetType === 'ORDER' && !selectedOrderId) ||
                isUploadingAny ||
                submitReportMutation.isPending
              }
              onClick={() => submitReportMutation.mutate()}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs gap-1.5 min-w-[140px]"
            >
              {submitReportMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : isUploadingAny ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading files...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Submit Incident Report</span>
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
