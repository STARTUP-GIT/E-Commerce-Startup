'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProducts } from '../hooks/useProducts';
import { useFileUpload } from '../../storage/hooks/useFileUpload';
import { createProductSchema, editProductSchema, productService } from '../services/productService';
import type { CreateProductInput, EditProductInput } from '../services/productService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/shared/components/Button';
import { Card, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Dialog } from '@/shared/components/Dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  AlertTriangle,
  Upload,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { productApi } from '../api/productApi';
import { useShop } from '@/features/shop/hooks/useShop';
import { SellerAgreementBanner } from '@/features/shop/ui/SellerAgreementBanner';
import { useConfirmStore } from '@/lib/store/confirmStore';

export function ProductListPage() {
  const { shop } = useShop();
  const { products, isLoading, isError, refetch, createProduct, updateProduct, deleteProduct } = useProducts();
  const { upload: uploadProductImage, isUploading, progress: uploadProgress, publicUrl } = useFileUpload({ folder: 'products' });

  // Forms declared at top of component body
  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    setValue: setValueCreate,
    watch: watchCreate,
    reset: resetCreate,
    formState: { errors: errorsCreate },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      productname: '',
      fulfilmentType: 'READY_TO_SHIP',
      productquantity: 1,
      productprice: 0,
      imageKey: '',
      categoryId: '',
      minPrepDays: 1,
      maxPrepDays: 3,
      prepTimeType: 'BUSINESS_DAYS',
      productionNotes: '',
      maxConcurrentOrders: null,
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    setValue: setValueEdit,
    watch: watchEdit,
    reset: resetEdit,
    formState: { errors: errorsEdit },
  } = useForm<EditProductInput>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      fulfilmentType: 'READY_TO_SHIP',
      productquantity: 1,
      productprice: 0,
      imageKey: '',
      categoryId: '',
      minPrepDays: 1,
      maxPrepDays: 3,
      prepTimeType: 'BUSINESS_DAYS',
      productionNotes: '',
      maxConcurrentOrders: null,
    },
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    productApi.getAllowedCategories()
      .then(setCategories)
      .catch((e) => console.error('Failed to load allowed categories:', e));
  }, []);

  const [stockFilter, setStockFilter] = useState<'ALL' | 'READY_TO_SHIP' | 'MADE_TO_ORDER' | 'LOW' | 'OUT'>('ALL');

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const watchCreateImg = watchCreate('imageKey');
  const watchEditImg = watchEdit('imageKey');
  const watchCreateFulfilment = watchCreate('fulfilmentType');
  const watchEditFulfilment = watchEdit('fulfilmentType');

  // File Upload Handlers
  const showToast = useUIStore((state) => state.showToast);

  const handleCreateImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadProductImage(file);
    if (result) setValueCreate('imageKey', result.url, { shouldValidate: true });
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadProductImage(file);
    if (result) setValueEdit('imageKey', result.url, { shouldValidate: true });
  };

  // Submit Handlers
  const onCreateSubmit = async (data: CreateProductInput) => {
    setFormError(null);
    try {
      await createProduct({
        productname: data.productname,
        fulfilmentType: data.fulfilmentType,
        productquantity: data.fulfilmentType === 'MADE_TO_ORDER' ? (data.maxConcurrentOrders ?? 9999) : (data.productquantity || 1),
        productprice: data.productprice,
        imageUrl: data.imageKey,
        categoryId: data.categoryId || undefined,
        minPrepDays: data.fulfilmentType === 'MADE_TO_ORDER' ? data.minPrepDays : null,
        maxPrepDays: data.fulfilmentType === 'MADE_TO_ORDER' ? data.maxPrepDays : null,
        prepTimeType: data.fulfilmentType === 'MADE_TO_ORDER' ? (data.prepTimeType || 'BUSINESS_DAYS') : 'BUSINESS_DAYS',
        productionNotes: data.fulfilmentType === 'MADE_TO_ORDER' ? data.productionNotes : null,
        maxConcurrentOrders: data.fulfilmentType === 'MADE_TO_ORDER' ? data.maxConcurrentOrders : null,
      });
      setIsCreateOpen(false);
      resetCreate();
      showToast('Product added successfully', 'success');
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product.');
    }
  };

  const onEditSubmit = async (data: EditProductInput) => {
    setFormError(null);
    try {
      await updateProduct({
        id: selectedProduct.id,
        payload: {
          fulfilmentType: data.fulfilmentType,
          productquantity: data.fulfilmentType === 'MADE_TO_ORDER' ? (data.maxConcurrentOrders ?? 9999) : data.productquantity,
          productprice: data.productprice,
          imageUrl: data.imageKey,
          categoryId: data.categoryId || '',
          minPrepDays: data.fulfilmentType === 'MADE_TO_ORDER' ? data.minPrepDays : null,
          maxPrepDays: data.fulfilmentType === 'MADE_TO_ORDER' ? data.maxPrepDays : null,
          prepTimeType: data.fulfilmentType === 'MADE_TO_ORDER' ? (data.prepTimeType || 'BUSINESS_DAYS') : 'BUSINESS_DAYS',
          productionNotes: data.fulfilmentType === 'MADE_TO_ORDER' ? data.productionNotes : null,
          maxConcurrentOrders: data.fulfilmentType === 'MADE_TO_ORDER' ? data.maxConcurrentOrders : null,
        },
      });
      setIsEditOpen(false);
      setSelectedProduct(null);
      resetEdit();
      showToast('Product updated successfully', 'success');
    } catch (err: any) {
      setFormError(err.message || 'Failed to update product.');
    }
  };

  const openEditModal = (prod: any) => {
    setSelectedProduct(prod);
    setValueEdit('fulfilmentType', prod.fulfilmentType || 'READY_TO_SHIP');
    setValueEdit('productprice', prod.price);
    setValueEdit('productquantity', prod.stockQuantity ?? 1);
    setValueEdit('imageKey', prod.imageUrl);
    setValueEdit('categoryId', prod.categoryId || '');
    setValueEdit('minPrepDays', prod.minPrepDays ?? 1);
    setValueEdit('maxPrepDays', prod.maxPrepDays ?? 3);
    setValueEdit('prepTimeType', prod.prepTimeType || 'BUSINESS_DAYS');
    setValueEdit('productionNotes', prod.productionNotes || '');
    setValueEdit('maxConcurrentOrders', prod.maxConcurrentOrders ?? null);
    setIsEditOpen(true);
  };

  const handleDelete = (productId: string) => {
    showConfirm({
      title: 'Delete Product',
      message: 'Are you sure you want to delete this product? It will be hidden from your shop catalog.',
      confirmText: 'Delete Product',
      onConfirm: async () => {
        try {
          await deleteProduct(productId);
          showToast('Product deleted successfully', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to delete product.');
        }
      },
    });
  };

  // Filters and Searches
  const filteredProducts = products.filter((prod) => {
    const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesFilter = true;
    if (stockFilter === 'READY_TO_SHIP') matchesFilter = prod.fulfilmentType !== 'MADE_TO_ORDER';
    else if (stockFilter === 'MADE_TO_ORDER') matchesFilter = prod.fulfilmentType === 'MADE_TO_ORDER';
    else if (stockFilter === 'LOW') matchesFilter = prod.fulfilmentType !== 'MADE_TO_ORDER' && prod.stockQuantity <= 10 && prod.stockQuantity > 0;
    else if (stockFilter === 'OUT') matchesFilter = prod.fulfilmentType !== 'MADE_TO_ORDER' && prod.stockQuantity === 0;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-up">
        {/* Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white/95">Product Management</h1>
            <p className="text-xs text-white/45">Publish and edit Ready to Ship or Made to Order products, manage catalog stocks, and configure preparation times.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0 font-bold">
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Shop Approval & Agreement Status Notice */}
        <SellerAgreementBanner shopStatus={shop?.status} />

        {/* Filters Panel */}
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Search products by title…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 pl-0 sm:pl-4">
            <button
              onClick={() => setStockFilter('ALL')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'ALL' ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStockFilter('READY_TO_SHIP')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'READY_TO_SHIP' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'text-white/45 hover:text-white/80'
              }`}
            >
              Ready to Ship
            </button>
            <button
              onClick={() => setStockFilter('MADE_TO_ORDER')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'MADE_TO_ORDER' ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'text-white/45 hover:text-white/80'
              }`}
            >
              Made to Order
            </button>
            <button
              onClick={() => setStockFilter('LOW')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'LOW' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'text-white/45 hover:text-white/80'
              }`}
            >
              Low Stock
            </button>
            <button
              onClick={() => setStockFilter('OUT')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                stockFilter === 'OUT' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-white/45 hover:text-white/80'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>

        {/* Product Catalog list */}
        <Card className="border border-white/5 overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : isError ? (
              <div className="p-12 text-center space-y-4">
                <AlertTriangle className="mx-auto h-10 w-10 text-red-400/60" />
                <p className="text-sm font-semibold text-red-400">Failed to load catalog products.</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mx-auto">
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Retry Load
                </Button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                {/* ── MOBILE VIEW: PRODUCT CARDS (< md) ── */}
                <div className="block md:hidden p-4 space-y-4">
                  {filteredProducts.map((prod) => (
                    <div
                      key={prod.id}
                      className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-14 w-14 rounded-xl border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} loading="lazy" className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-6 w-6 text-white/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <h4 className="font-bold text-white/95 text-xs truncate">{prod.name}</h4>
                          <span className="text-xs font-bold text-purple-400 block">
                            {productService.formatPrice(prod.price)}
                          </span>
                          
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {prod.fulfilmentType === 'MADE_TO_ORDER' ? (
                              <>
                                <Badge variant="default" className="text-[8px] py-0 px-1.5 font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Made to Order
                                </Badge>
                                <span className="text-[10px] text-white/60 font-medium">
                                  {productService.formatPrepTime(prod.minPrepDays, prod.maxPrepDays, prod.prepTimeType)}
                                </span>
                                {prod.maxConcurrentOrders && (
                                  <span className="text-[9px] text-white/40">
                                    ({prod.activeProductionOrders || 0}/{prod.maxConcurrentOrders} in prod)
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <Badge variant="success" className="text-[8px] py-0 px-1.5 font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  Ready to Ship
                                </Badge>
                                <span className="text-[10px] text-white/60 font-medium">{prod.stockQuantity} in stock</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 text-xs font-semibold"
                          onClick={() => openEditModal(prod)}
                        >
                          <Edit2 className="h-3.5 w-3.5 mr-1.5 text-white/70" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-9 px-3 text-xs font-semibold bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                          onClick={() => handleDelete(prod.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── DESKTOP VIEW: TABLE (>= md) ── */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Image</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Fulfilment Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock / Prep Window</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((prod) => (
                        <TableRow key={prod.id}>
                          <TableCell>
                            <div className="h-11 w-11 rounded-lg border border-white/10 overflow-hidden bg-white/5 flex items-center justify-center">
                              {prod.imageUrl ? (
                                <img src={prod.imageUrl} alt={prod.name} loading="lazy" className="h-full w-full object-cover" />
                              ) : (
                                <Package className="h-5 w-5 text-white/30" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-white/95 text-xs">{prod.name}</TableCell>
                          <TableCell>
                            {prod.fulfilmentType === 'MADE_TO_ORDER' ? (
                              <Badge className="bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[9px] font-extrabold uppercase px-2 py-0.5">
                                Made to Order
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold uppercase px-2 py-0.5">
                                Ready to Ship
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-white/80">
                            {productService.formatPrice(prod.price)}
                          </TableCell>
                          <TableCell>
                            {prod.fulfilmentType === 'MADE_TO_ORDER' ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-white/90">
                                  <Clock className="h-3 w-3 text-purple-400" />
                                  <span>{productService.formatPrepTime(prod.minPrepDays, prod.maxPrepDays, prod.prepTimeType)}</span>
                                </div>
                                {prod.maxConcurrentOrders && (
                                  <span className="text-[10px] text-white/45 block">
                                    Capacity: {prod.activeProductionOrders || 0} / {prod.maxConcurrentOrders} in progress
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white/90">{prod.stockQuantity} units</span>
                                {prod.stockQuantity <= 0 ? (
                                  <Badge variant="destructive" className="text-[7.5px] py-0 px-1.5 font-extrabold">
                                    Out of Stock
                                  </Badge>
                                ) : prod.stockQuantity <= 10 ? (
                                  <Badge variant="default" className="text-[7.5px] py-0 px-1.5 font-extrabold bg-yellow-500/20 text-yellow-400 border-none">
                                    Low Stock
                                  </Badge>
                                ) : (
                                  <Badge variant="success" className="text-[7.5px] py-0 px-1.5 font-extrabold">
                                    In Stock
                                  </Badge>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => openEditModal(prod)}
                              >
                                <Edit2 className="h-3.5 w-3.5 text-white/70" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8 rounded-lg bg-red-500/10 border-red-500/20 hover:bg-red-500/20"
                                onClick={() => handleDelete(prod.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-16 space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                  <Package className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-white/60">No products found</h4>
                <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
                  Try refining your search keyword, adjusting status filters, or create a brand new item.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Dialog */}
        <Dialog
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            resetCreate();
            setFormError(null);
          }}
          title="Add New Catalog Product"
          description="Configure fulfilment settings and listing details"
        >
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 mb-4">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitCreate(onCreateSubmit)} className="space-y-4">
            {/* Required Fulfilment Type Selection */}
            <div className="space-y-2 border border-white/10 bg-white/[0.02] p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-white/80">Fulfilment Type <span className="text-red-400">*</span></label>
                <span className="text-[10px] text-white/40">Select how this item is supplied</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setValueCreate('fulfilmentType', 'READY_TO_SHIP', { shouldValidate: true })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    watchCreateFulfilment === 'READY_TO_SHIP'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                      : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.03] text-white/60'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <CheckCircle2 className={`h-4 w-4 ${watchCreateFulfilment === 'READY_TO_SHIP' ? 'text-emerald-400' : 'text-white/30'}`} />
                    <span>Ready to Ship</span>
                  </div>
                  <p className="text-[10px] text-white/45 leading-relaxed">Pre-manufactured stock available for immediate dispatch.</p>
                </div>

                <div
                  onClick={() => setValueCreate('fulfilmentType', 'MADE_TO_ORDER', { shouldValidate: true })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    watchCreateFulfilment === 'MADE_TO_ORDER'
                      ? 'border-purple-500/50 bg-purple-500/10 text-white'
                      : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.03] text-white/60'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Sparkles className={`h-4 w-4 ${watchCreateFulfilment === 'MADE_TO_ORDER' ? 'text-purple-400' : 'text-white/30'}`} />
                    <span>Made to Order</span>
                  </div>
                  <p className="text-[10px] text-white/45 leading-relaxed">Manufactured or prepared on demand after customer order.</p>
                </div>
              </div>
            </div>

            {/* Product Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/60 ml-1">Product Title</label>
              <Input placeholder="Custom 3D Printed Dragon Art" {...registerCreate('productname')} error={!!errorsCreate.productname} />
              {errorsCreate.productname && (
                <p className="text-[9px] text-red-400 ml-1">{errorsCreate.productname.message}</p>
              )}
            </div>

            {/* Price & Conditional Stock / Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 ml-1">Unit Price (INR)</label>
                <Input type="number" step="0.01" placeholder="499.00" {...registerCreate('productprice', { valueAsNumber: true })} error={!!errorsCreate.productprice} />
                {errorsCreate.productprice && (
                  <p className="text-[9px] text-red-400 ml-1">{errorsCreate.productprice.message}</p>
                )}
              </div>

              {watchCreateFulfilment === 'READY_TO_SHIP' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 ml-1">Available Stock Units</label>
                  <Input type="number" placeholder="50" {...registerCreate('productquantity', { valueAsNumber: true })} error={!!errorsCreate.productquantity} />
                  {errorsCreate.productquantity && (
                    <p className="text-[9px] text-red-400 ml-1">{errorsCreate.productquantity.message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 ml-1">Max Concurrent Capacity</label>
                  <Input type="number" placeholder="Optional (e.g. 10)" {...registerCreate('maxConcurrentOrders', { valueAsNumber: true })} error={!!errorsCreate.maxConcurrentOrders} />
                  <p className="text-[8px] text-white/35 ml-1">Maximum active production orders before pausing</p>
                </div>
              )}
            </div>

            {/* Made to Order Conditional Fields */}
            {watchCreateFulfilment === 'MADE_TO_ORDER' && (
              <div className="space-y-3 p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/[0.03]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Preparation Time Settings</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">Min Prep Days <span className="text-red-400">*</span></label>
                    <Input type="number" min={1} placeholder="1" {...registerCreate('minPrepDays', { valueAsNumber: true })} error={!!errorsCreate.minPrepDays} />
                    {errorsCreate.minPrepDays && (
                      <p className="text-[9px] text-red-400">{errorsCreate.minPrepDays.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">Max Prep Days <span className="text-red-400">*</span></label>
                    <Input type="number" min={1} placeholder="3" {...registerCreate('maxPrepDays', { valueAsNumber: true })} error={!!errorsCreate.maxPrepDays} />
                    {errorsCreate.maxPrepDays && (
                      <p className="text-[9px] text-red-400">{errorsCreate.maxPrepDays.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60">Calculation Days Type</label>
                  <select
                    {...registerCreate('prepTimeType')}
                    className="flex h-10 w-full rounded-xl border border-white/10 bg-[#0b0b0f] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-white/80"
                  >
                    <option value="BUSINESS_DAYS">Business Days (Excludes Weekends)</option>
                    <option value="CALENDAR_DAYS">Calendar Days (Consecutive Days)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60">Production Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Handcrafted after order, requires 48hr drying"
                    {...registerCreate('productionNotes')}
                    className="flex w-full rounded-xl border border-white/10 bg-[#0b0b0f] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-white/80"
                  />
                  {errorsCreate.productionNotes && (
                    <p className="text-[9px] text-red-400">{errorsCreate.productionNotes.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/60 ml-1">Category (Optional)</label>
              <select
                {...registerCreate('categoryId')}
                className="flex h-10 w-full rounded-xl border border-white/10 bg-[#0b0b0f] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-white/80"
              >
                <option value="" className="bg-[#0b0b0f] text-white/50">Select a category (Optional)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#0b0b0f] text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload Form Panel */}
            <div className="space-y-2 border border-white/5 bg-white/[0.01] rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-white/60 ml-1 block">Product Image</span>
              <div className="flex gap-4 items-center">
                <div className="h-16 w-16 border border-white/10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                  {publicUrl || watchCreateImg ? (
                    <img src={publicUrl || watchCreateImg} alt="Preview" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-white/20" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="relative flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold glass text-white/80 hover:text-white hover:border-white/20 transition-all cursor-pointer w-fit">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCreateImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {isUploading && (
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                  <p className="text-[9px] text-white/30">Support PNG, JPEG, or WEBP. Max size 5MB.</p>
                </div>
              </div>
              <Input type="hidden" {...registerCreate('imageKey')} />
              {errorsCreate.imageKey && (
                <p className="text-[9px] text-red-400 ml-1">{errorsCreate.imageKey.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full mt-4" isLoading={isUploading}>
              Create Catalog Listing
            </Button>
          </form>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedProduct(null);
            resetEdit();
            setFormError(null);
          }}
          title="Edit Catalog Product"
          description={`Update details for: ${selectedProduct?.name}`}
        >
          {formError && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 mb-4">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitEdit(onEditSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/30 ml-1">Product Title (Not Editable)</label>
              <Input value={selectedProduct?.name || ''} disabled className="opacity-60 bg-white/[0.02]" />
            </div>

            {/* Fulfilment Type Switcher */}
            <div className="space-y-2 border border-white/10 bg-white/[0.02] p-3.5 rounded-xl">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-white/80">Fulfilment Type <span className="text-red-400">*</span></label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => setValueEdit('fulfilmentType', 'READY_TO_SHIP', { shouldValidate: true })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    watchEditFulfilment === 'READY_TO_SHIP'
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                      : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.03] text-white/60'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <CheckCircle2 className={`h-4 w-4 ${watchEditFulfilment === 'READY_TO_SHIP' ? 'text-emerald-400' : 'text-white/30'}`} />
                    <span>Ready to Ship</span>
                  </div>
                  <p className="text-[10px] text-white/45 leading-relaxed">Fulfilled directly from inventory.</p>
                </div>

                <div
                  onClick={() => setValueEdit('fulfilmentType', 'MADE_TO_ORDER', { shouldValidate: true })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    watchEditFulfilment === 'MADE_TO_ORDER'
                      ? 'border-purple-500/50 bg-purple-500/10 text-white'
                      : 'border-white/10 bg-white/[0.01] hover:bg-white/[0.03] text-white/60'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs mb-1">
                    <Sparkles className={`h-4 w-4 ${watchEditFulfilment === 'MADE_TO_ORDER' ? 'text-purple-400' : 'text-white/30'}`} />
                    <span>Made to Order</span>
                  </div>
                  <p className="text-[10px] text-white/45 leading-relaxed">Manufactured on demand per order.</p>
                </div>
              </div>
            </div>

            {/* Price & Conditional Stock / Capacity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 ml-1">Unit Price (INR)</label>
                <Input type="number" step="0.01" placeholder="499.00" {...registerEdit('productprice', { valueAsNumber: true })} error={!!errorsEdit.productprice} />
                {errorsEdit.productprice && (
                  <p className="text-[9px] text-red-400 ml-1">{errorsEdit.productprice.message}</p>
                )}
              </div>

              {watchEditFulfilment === 'READY_TO_SHIP' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 ml-1">Available Stock Units</label>
                  <Input type="number" placeholder="50" {...registerEdit('productquantity', { valueAsNumber: true })} error={!!errorsEdit.productquantity} />
                  {errorsEdit.productquantity && (
                    <p className="text-[9px] text-red-400 ml-1">{errorsEdit.productquantity.message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60 ml-1">Max Concurrent Capacity</label>
                  <Input type="number" placeholder="Optional (e.g. 10)" {...registerEdit('maxConcurrentOrders', { valueAsNumber: true })} error={!!errorsEdit.maxConcurrentOrders} />
                  <p className="text-[8px] text-white/35 ml-1">Maximum active production orders</p>
                </div>
              )}
            </div>

            {/* Made to Order Conditional Fields */}
            {watchEditFulfilment === 'MADE_TO_ORDER' && (
              <div className="space-y-3 p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/[0.03]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Preparation Time Settings</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">Min Prep Days <span className="text-red-400">*</span></label>
                    <Input type="number" min={1} placeholder="1" {...registerEdit('minPrepDays', { valueAsNumber: true })} error={!!errorsEdit.minPrepDays} />
                    {errorsEdit.minPrepDays && (
                      <p className="text-[9px] text-red-400">{errorsEdit.minPrepDays.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/60">Max Prep Days <span className="text-red-400">*</span></label>
                    <Input type="number" min={1} placeholder="3" {...registerEdit('maxPrepDays', { valueAsNumber: true })} error={!!errorsEdit.maxPrepDays} />
                    {errorsEdit.maxPrepDays && (
                      <p className="text-[9px] text-red-400">{errorsEdit.maxPrepDays.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60">Calculation Days Type</label>
                  <select
                    {...registerEdit('prepTimeType')}
                    className="flex h-10 w-full rounded-xl border border-white/10 bg-[#0b0b0f] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-white/80"
                  >
                    <option value="BUSINESS_DAYS">Business Days (Excludes Weekends)</option>
                    <option value="CALENDAR_DAYS">Calendar Days (Consecutive Days)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/60">Production Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Handcrafted after order, requires 48hr drying"
                    {...registerEdit('productionNotes')}
                    className="flex w-full rounded-xl border border-white/10 bg-[#0b0b0f] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-white/80"
                  />
                  {errorsEdit.productionNotes && (
                    <p className="text-[9px] text-red-400">{errorsEdit.productionNotes.message}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-white/60 ml-1">Category (Optional)</label>
              <select
                {...registerEdit('categoryId')}
                className="flex h-10 w-full rounded-xl border border-white/10 bg-[#0b0b0f] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-white/80"
              >
                <option value="" className="bg-[#0b0b0f] text-white/50">Select a category (Optional)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#0b0b0f] text-white">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload Form Panel */}
            <div className="space-y-2 border border-white/5 bg-white/[0.01] rounded-xl p-3.5">
              <span className="text-[10px] font-bold text-white/60 ml-1 block">Product Image</span>
              <div className="flex gap-4 items-center">
                <div className="h-16 w-16 border border-white/10 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shrink-0">
                  {publicUrl || watchEditImg ? (
                    <img src={publicUrl || watchEditImg} alt="Preview" loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-6 w-6 text-white/20" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="relative flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-semibold glass text-white/80 hover:text-white hover:border-white/20 transition-all cursor-pointer w-fit">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>
                  {isUploading && (
                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                      <div className="bg-purple-500 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  )}
                  <p className="text-[9px] text-white/30">Support PNG, JPEG, or WEBP. Max size 5MB.</p>
                </div>
              </div>
              <Input type="hidden" {...registerEdit('imageKey')} />
              {errorsEdit.imageKey && (
                <p className="text-[9px] text-red-400 ml-1">{errorsEdit.imageKey.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full mt-4" isLoading={isUploading}>
              Update Product Listing
            </Button>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
