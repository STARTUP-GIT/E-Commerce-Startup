'use client';

import React, { useState, useEffect } from 'react';
import { useCustomOrders } from '../hooks/useCustomOrders';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { customOrderService, CustomOrderInput } from '../services/customOrderService';
import { useProfile } from '@/features/auth/profile/hooks/useProfile';
import { productListService } from '../../products/product-list/services/productListService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  Plus,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Box as BoxIcon,
  Paperclip,
  MapPin,
  Calendar,
  Clock,
  Store,
  Check,
  AlertCircle,
  Trash2,
  Loader2,
  ChevronRight,
  ClipboardList,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';

export function CustomOrderPage() {
  const { profile } = useProfile();
  const {
    customOrders,
    isCustomOrdersLoading,
    customOrder,
    isCustomOrderLoading,
    createCustomOrder,
    isCreating,
    cancelCustomOrder,
    isCancelling,
    acceptQuote,
    isAccepting,
    rejectQuote,
    isRejecting,
    uploadFile,
    isUploading,
    uploadProgress,
    refetchOrders
  } = useCustomOrders();

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [material, setMaterial] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [shippingAddressId, setShippingAddressId] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Quote actions reason states
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [activeRejectionQuoteId, setActiveRejectionQuoteId] = useState<string | null>(null);
  
  const { showConfirm, showAlert } = useConfirmStore();

  // Set first order as selected when loaded
  useEffect(() => {
    if (customOrders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(customOrders[0].id);
    }
  }, [customOrders, selectedOrderId]);

  // Hook details query when selectedOrderId changes
  const {
    customOrder: activeOrder,
    isCustomOrderLoading: isActiveLoading
  } = useCustomOrders(selectedOrderId || undefined);

  // Auto-fill default shipping address when modal opens
  useEffect(() => {
    if (isModalOpen && profile?.addresses && profile.addresses.length > 0) {
      const defAddr = profile.addresses.find((a) => a.isDefault) || profile.addresses[0];
      setShippingAddressId(defAddr.id);
    }
  }, [isModalOpen, profile]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploaded = await uploadFile(file);
        setUploadedFiles((prev) => [...prev, uploaded]);
      } catch (err: any) {
        showAlert({ title: 'Upload Failed', message: err.message || 'File upload failed' });
      }
    }
  };

  const removeUploadedFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate using the schema
    const validation = customOrderService.validateInput({
      title,
      description,
      material,
      quantity,
      shippingAddressId,
      files: uploadedFiles,
    });

    if (!validation.success) {
      const errorMsg = validation.error.issues[0]?.message || 'Please fill in all required fields correctly.';
      setFormError(errorMsg);
      return;
    }

    try {
      const result = await createCustomOrder({
        title,
        description,
        material,
        quantity,
        shippingAddressId,
        files: uploadedFiles,
      });

      // Clear Form
      setTitle('');
      setDescription('');
      setMaterial('');
      setQuantity(1);
      setUploadedFiles([]);
      setIsModalOpen(false);

      // Select newly created order
      if (result?.customOrder?.id) {
        setSelectedOrderId(result.customOrder.id);
      }
      refetchOrders();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to submit custom request.');
    }
  };

  const handleCancelOrder = (id: string) => {
    showConfirm({
      title: 'Cancel Custom Request',
      message: 'Are you sure you want to cancel this custom print request?',
      confirmText: 'Yes, Cancel',
      onConfirm: async () => {
        try {
          await cancelCustomOrder({ id, reason: undefined });
          refetchOrders();
        } catch (err: any) {
          showAlert({ title: 'Error', message: 'Failed to cancel order request.' });
        }
      }
    });
  };

  const handleAcceptQuote = (quoteId: string) => {
    if (!selectedOrderId) return;
    showConfirm({
      title: 'Accept Quote',
      message: 'Are you sure you want to accept this quote? All other quotes will be rejected.',
      confirmText: 'Yes, Accept',
      onConfirm: async () => {
        try {
          await acceptQuote({ orderId: selectedOrderId, quoteId });
          refetchOrders();
        } catch (err: any) {
          showAlert({ title: 'Error', message: err.response?.data?.message || 'Failed to accept quote.' });
        }
      }
    });
  };

  const handleRejectQuote = (quoteId: string) => {
    if (!selectedOrderId) return;
    showConfirm({
      title: 'Reject Quote',
      message: 'Are you sure you want to reject this quotation?',
      confirmText: 'Yes, Reject',
      onConfirm: async () => {
        try {
          await rejectQuote({ orderId: selectedOrderId, quoteId, reason: undefined });
          refetchOrders();
        } catch (err: any) {
          showAlert({ title: 'Error', message: 'Failed to reject quote.' });
        }
      }
    });
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toUpperCase()) {
      case 'STL':
      case 'STEP':
      case 'OBJ':
        return <BoxIcon className="h-4 w-4 text-purple-400" />;
      case 'PDF':
        return <FileText className="h-4 w-4 text-red-400" />;
      case 'IMAGE':
        return <ImageIcon className="h-4 w-4 text-blue-400" />;
      default:
        return <Paperclip className="h-4 w-4 text-zinc-400" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-zinc-400 bg-clip-text text-transparent">
            Custom Manufacturing Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit custom designs, view fabricator quotations, and monitor bespoke production.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 cursor-pointer">
          <Plus className="h-4 w-4" />
          New Custom Request
        </Button>
      </div>

      {isCustomOrdersLoading ? (
        <div className="grid md:grid-cols-[300px_1fr] gap-8">
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      ) : customOrders.length > 0 ? (
        <div className="grid md:grid-cols-[320px_1fr] gap-8 items-start">
          {/* Left Panel: Request List */}
          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
            {customOrders.map((ord) => {
              const isSelected = selectedOrderId === ord.id;
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`p-4 border rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/[0.03] shadow-[0_0_12px_-3px_rgba(var(--primary-rgb),0.2)]'
                      : 'border-border bg-zinc-950/20 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-extrabold text-xs text-foreground tracking-wider block">
                      {ord.orderNumber}
                    </span>
                    <Badge variant={customOrderService.getStatusBadgeVariant(ord.status)} className="text-[9px] px-1.5 py-0">
                      {customOrderService.formatStatus(ord.status)}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-sm text-foreground line-clamp-1 mb-1">{ord.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{ord.description}</p>
                  
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-2">
                    <span>Qty: {ord.quantity}</span>
                    <span>{new Date(ord.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Panel: Detail View */}
          <div className="space-y-6">
            {isActiveLoading ? (
              <div className="space-y-6">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : activeOrder ? (
              <div className="space-y-6">
                {/* Title & Metadata */}
                <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold tracking-tight text-foreground">{activeOrder.title}</h2>
                        <Badge variant={customOrderService.getStatusBadgeVariant(activeOrder.status)}>
                          {customOrderService.formatStatus(activeOrder.status)}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground tracking-wide mt-1 block">
                        Order Code: {activeOrder.orderNumber} | Submitted: {new Date(activeOrder.submittedAt).toLocaleString()}
                      </span>
                    </div>

                    {(activeOrder.status === 'SUBMITTED' || activeOrder.status === 'PENDING') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelOrder(activeOrder.id)}
                        isLoading={isCancelling}
                        className="text-xs border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer"
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Description</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                      {activeOrder.description}
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-3 bg-zinc-950/30 border border-border/50 rounded-xl">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Material Spec</span>
                      <span className="text-sm font-bold text-foreground mt-0.5 block">{activeOrder.material || 'Not specified'}</span>
                    </div>
                    <div className="p-3 bg-zinc-950/30 border border-border/50 rounded-xl">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Required Quantity</span>
                      <span className="text-sm font-bold text-foreground mt-0.5 block">{activeOrder.quantity} units</span>
                    </div>
                    <div className="p-3 bg-zinc-950/30 border border-border/50 rounded-xl">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">Design Files</span>
                      <span className="text-sm font-bold text-foreground mt-0.5 block">{activeOrder.files?.length || 0} attached</span>
                    </div>
                  </div>
                </div>

                {/* Attached Files Card */}
                {activeOrder.files && activeOrder.files.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold">Design Specifications & Attachments</CardTitle>
                    </CardHeader>
                    <CardContent className="grid sm:grid-cols-2 gap-3">
                      {activeOrder.files.map((file, idx) => (
                        <a
                          key={file.id || idx}
                          href={file.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-3 p-3 border border-border rounded-xl bg-zinc-950/20 hover:bg-zinc-950/40 transition-colors"
                        >
                          <div className="p-2 bg-zinc-900 border border-border rounded-lg">
                            {getFileIcon(file.fileType)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-foreground truncate block">{file.fileName}</span>
                            <span className="text-[10px] text-muted-foreground block">
                              {file.fileType} | {formatBytes(file.fileSizeBytes)}
                            </span>
                          </div>
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Timeline Tracking */}
                {activeOrder.timelineEvents && activeOrder.timelineEvents.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-bold">Request Progress Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <div className="relative border-l border-border pl-6 space-y-6 ml-3">
                        {activeOrder.timelineEvents.map((evt: any, idx: number) => {
                          const isLast = idx === activeOrder.timelineEvents!.length - 1;
                          return (
                            <div key={evt.id || idx} className="relative">
                              <div
                                className={`absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border-2 bg-background ${
                                  isLast ? 'border-primary ring-4 ring-primary/10' : 'border-zinc-700'
                                }`}
                              />
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs gap-4">
                                  <span className={`font-bold ${isLast ? 'text-primary' : 'text-foreground'}`}>
                                    {evt.title}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {new Date(evt.occurredAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {evt.description}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Quotations / Bids */}
                <Card className="overflow-hidden border-border bg-card">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Store className="h-4.5 w-4.5 text-primary" />
                      Fabricator Quotations ({activeOrder.quotes?.length || 0})
                    </CardTitle>
                    <CardDescription>Review custom manufacturing offers submitted by verified makers.</CardDescription>
                  </CardHeader>

                  <CardContent className="divide-y divide-border p-0">
                    {activeOrder.quotes && activeOrder.quotes.length > 0 ? (
                      activeOrder.quotes.map((quote) => {
                        const isQuoteAccepted = quote.isAccepted;
                        const isQuoteRejected = !!quote.rejectedAt;
                        
                        return (
                          <div
                            key={quote.id}
                            className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-colors ${
                              isQuoteAccepted ? 'bg-emerald-500/[0.02]' : isQuoteRejected ? 'opacity-50' : 'bg-transparent'
                            }`}
                          >
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-foreground">
                                  {quote.seller?.shop?.name || `${quote.seller?.firstName} ${quote.seller?.lastName}`}
                                </span>
                                {isQuoteAccepted && (
                                  <Badge variant="success" className="text-[9px] py-0 px-1.5 flex items-center gap-1">
                                    <Check className="h-2.5 w-2.5" /> Accepted
                                  </Badge>
                                )}
                                {isQuoteRejected && (
                                  <Badge variant="destructive" className="text-[9px] py-0 px-1.5">
                                    Rejected
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>Turnaround: {quote.estimatedDays} days</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>Valid Until: {new Date(quote.validUntil).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {isQuoteRejected && quote.rejectionReason && (
                                <p className="text-xs text-red-400 italic">
                                  Reason: {quote.rejectionReason}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[10px] text-muted-foreground block uppercase tracking-wider">Quote Cost</span>
                                <span className="font-extrabold text-base text-foreground">
                                  {productListService.formatPrice(quote.quotedPrice)}
                                </span>
                              </div>

                              {activeOrder.status === 'SUBMITTED' && !isQuoteAccepted && !isQuoteRejected && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRejectQuote(quote.id)}
                                    isLoading={isRejecting}
                                    className="text-xs border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer h-9"
                                  >
                                    Decline
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAcceptQuote(quote.id)}
                                    isLoading={isAccepting}
                                    className="text-xs cursor-pointer h-9"
                                  >
                                    Accept Offer
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12 p-6 text-xs text-muted-foreground">
                        <MessageSquare className="mx-auto h-8 w-8 opacity-40 mb-3" />
                        No quotes have been submitted for this request yet. We will notify you once fabricators respond.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-20 border border-dashed border-border rounded-2xl">
                <p className="text-sm text-muted-foreground">Select a custom request from the left pane to view quotations and details.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl max-w-md mx-auto">
          <ClipboardList className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h4 className="text-base font-bold text-foreground">No Custom Requests</h4>
          <p className="text-sm text-muted-foreground mt-1 px-4">
            Submit custom design files (like STL or CAD drawings) to get manufacturing quotes from our shops.
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-6 cursor-pointer">
            Create First Request
          </Button>
        </div>
      )}

      {/* CREATE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className="bg-zinc-900 border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-border/80">
              <h2 className="text-lg font-bold text-foreground">Submit Custom Manufacturing Request</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setFormError(null);
                }}
                className="p-1.5 text-zinc-400 hover:text-foreground rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-5">
              {formError && (
                <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4.5 w-4.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Request Title *</label>
                <Input
                  placeholder="e.g. Gearbox casing replacement print"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Detailed Specifications & Description *</label>
                <textarea
                  placeholder="Describe your design, specific requirements, dimensions, infill percentage, function, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="w-full min-h-[100px] p-3 text-sm text-foreground bg-zinc-950/50 border border-border rounded-xl focus:outline-none focus:border-primary placeholder-zinc-500 transition-all resize-y"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Material */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Material Required *</label>
                  <select
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    required
                    className="w-full p-3 text-sm text-foreground bg-zinc-950/50 border border-border rounded-xl focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Material</option>
                    <option value="PLA">PLA (Polylactic Acid)</option>
                    <option value="ABS">ABS (Acrylonitrile Butadiene Styrene)</option>
                    <option value="PETG">PETG (Polyethylene Terephthalate Glycol)</option>
                    <option value="Resin">Resin / SLA Tough</option>
                    <option value="Nylon">SLS Nylon</option>
                    <option value="Aluminum">Aluminum CNC</option>
                    <option value="Steel">Steel / Brass CNC</option>
                    <option value="Acrylic">Acrylic / Wood Laser Cut</option>
                    <option value="Other">Other (Detail in description)</option>
                  </select>
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Quantity *</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Shipping Address selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">Shipping Address *</label>
                {profile?.addresses && profile.addresses.length > 0 ? (
                  <select
                    value={shippingAddressId}
                    onChange={(e) => setShippingAddressId(e.target.value)}
                    required
                    className="w-full p-3 text-sm text-foreground bg-zinc-950/50 border border-border rounded-xl focus:outline-none focus:border-primary transition-all cursor-pointer"
                  >
                    {profile.addresses.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        [{addr.type}] {addr.fullName} - {addr.addressLine1}, {addr.city} ({addr.postalCode})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-4 border border-dashed border-border rounded-xl text-center space-y-2">
                    <p className="text-xs text-muted-foreground">You must add a shipping address to your profile to place a custom order request.</p>
                    <Link href="/profile">
                      <Button type="button" size="sm" className="h-8">Add Address</Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* File Attachment Upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block font-sans">Design Files (STL, STEP, OBJ, PDF, Image) *</label>
                
                {/* Upload Area */}
                <div className="relative border border-dashed border-border hover:border-zinc-700 bg-zinc-950/20 rounded-xl p-6 text-center transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".stl,.step,.stp,.obj,.pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  
                  {isUploading ? (
                    <div className="space-y-2 py-2">
                      <Loader2 className="mx-auto h-8 w-8 text-primary animate-spin" />
                      <p className="text-xs font-semibold text-foreground">Uploading attachment...</p>
                      <div className="w-48 mx-auto bg-zinc-800 rounded-full h-1.5">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Upload className="mx-auto h-8 w-8 text-zinc-500" />
                      <p className="text-xs font-bold text-foreground">Drag & drop files or click to browse</p>
                      <p className="text-[10px] text-muted-foreground">STL, STEP, OBJ, PDF, or Images up to 25MB</p>
                    </div>
                  )}
                </div>

                {/* Uploaded File List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2 mt-3 bg-zinc-950/40 p-3 rounded-xl border border-border/50">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Attached Files</span>
                    <div className="divide-y divide-border/40">
                      {uploadedFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between py-2 text-xs gap-3">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getFileIcon(file.fileType)}
                            <span className="font-medium text-foreground truncate">{file.fileName}</span>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">({formatBytes(file.fileSizeBytes)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeUploadedFile(idx)}
                            className="p-1 text-zinc-400 hover:text-red-500 rounded-md hover:bg-zinc-800/50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="border-t border-border/80 pt-5 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormError(null);
                  }}
                  className="cursor-pointer border-border"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isCreating}
                  disabled={profile?.addresses?.length === 0 || uploadedFiles.length === 0}
                  className="cursor-pointer"
                >
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
