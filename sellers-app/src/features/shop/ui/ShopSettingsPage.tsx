'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useShop } from '../hooks/useShop';
import { useFileUpload } from '../../storage/hooks/useFileUpload';
import { bankDetailsSchema } from '../services/shopService';
import type { BankDetailsInput } from '../services/shopService';
import { Button } from '@/shared/components/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Upload,
  CreditCard,
  Building2,
  CheckCircle,
  AlertTriangle,
  Store,
  ShieldCheck,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { Skeleton } from '@/shared/components/Skeleton';
import { Dialog } from '@/shared/components/Dialog';
import { useUIStore } from '@/lib/store/uiStore';
import { SellerAgreementBanner } from './SellerAgreementBanner';
import { ShopPickupAddressForm, type StructuredShopAddress } from '@/features/location/ui/ShopPickupAddressForm';
import { PackagingCatalogueSection } from './PackagingCatalogueSection';
export function ShopSettingsPage() {
  const {
    shop,
    bankAccounts,
    isLoadingBank,
    addBankAccount,
    isAddingBank,
    updateBankAccount,
    isUpdatingBank,
    deleteBankAccount,
    isDeletingBank,
    setDefaultBankAccount,
    isSettingDefaultBank,
    updateShop,
    isUpdatingShop,
    updateBanner,
    updateLogo,
    deleteShop,
    isDeletingShop,
  } = useShop();

  const showConfirm = useConfirmStore((state) => state.showConfirm);
  const showToast = useUIStore((state) => state.showToast);

  const [bankSuccess, setBankSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bank Account edit state
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editHolderName, setEditHolderName] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfscCode, setEditIfscCode] = useState('');
  const [editUpiId, setEditUpiId] = useState('');

  // Shop details edit form state
  const [editShopName, setEditShopName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddressLine1, setEditAddressLine1] = useState('');
  const [editAddressLine2, setEditAddressLine2] = useState('');
  const [editPostalCode, setEditPostalCode] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [coordinates, setCoordinates] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({
    latitude: null,
    longitude: null,
  });
  const [pickupAddress, setPickupAddress] = useState<StructuredShopAddress | null>(null);

  // Fetch active states & configurations from backend
  const { data: locationsConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['locations-config'],
    queryFn: shopApi.getLocationsStates,
    staleTime: 10 * 60 * 1000,
  });

  const allStates = locationsConfig?.allStates ?? [];
  const districtRequired = locationsConfig?.districtRequired !== false;

  const { data: districtsData, isLoading: isLoadingDistricts } = useQuery({
    queryKey: ['locations-districts', selectedState],
    queryFn: () => shopApi.getLocationsDistricts(selectedState),
    enabled: !!selectedState,
    staleTime: 10 * 60 * 1000,
  });

  const districts = districtsData?.allDistricts ?? [];

  useEffect(() => {
    if (shop) {
      setEditShopName(shop.name || '');
      setEditDescription(shop.description || '');
      setEditPhone(shop.supportPhone || shop.defaultPickupAddress?.phone || '');
      const addr = shop.defaultPickupAddress;
      const initialLat = addr?.latitude !== undefined && addr?.latitude !== null ? Number(addr.latitude) : null;
      const initialLng = addr?.longitude !== undefined && addr?.longitude !== null ? Number(addr.longitude) : null;

      setEditAddressLine1(addr?.addressLine1 || '');
      setEditAddressLine2(addr?.addressLine2 || '');
      setEditPostalCode(addr?.postalCode || '');
      setSelectedState(addr?.state || '');
      setSelectedDistrict(addr?.city || addr?.district || '');

      setCoordinates({
        latitude: initialLat,
        longitude: initialLng,
      });
    }
  }, [shop]);

  const memoizedInitialAddress = useMemo(() => {
    if (!shop?.defaultPickupAddress) return undefined;
    const addr = shop.defaultPickupAddress as any;
    return {
      doorNo: addr.doorNo || '',
      buildingName: addr.buildingName || '',
      street: addr.street || addr.addressLine1 || '',
      cross: addr.cross || '',
      area: addr.area || addr.addressLine2 || '',
      landmark: addr.landmark || '',
      city: addr.city || addr.district || '',
      district: addr.district || addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      country: 'India',
      latitude: addr.latitude !== undefined && addr.latitude !== null ? Number(addr.latitude) : null,
      longitude: addr.longitude !== undefined && addr.longitude !== null ? Number(addr.longitude) : null,
      locationSource: (addr.locationSource as any) || 'MANUALLY_ENTERED',
      accuracyMeters: addr.accuracyMeters ?? null,
      formattedAddress: addr.formattedAddress || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
    };
  }, [shop?.id, (shop?.defaultPickupAddress as any)?.id]);

  const {
    register: bankRegister,
    handleSubmit: bankSubmit,
    reset: bankReset,
    formState: { errors: bankErrors },
  } = useForm<BankDetailsInput>({
    resolver: zodResolver(bankDetailsSchema),
  });

  const { upload: uploadLogo, isUploading: isUploadingLogo } = useFileUpload({ folder: 'shop-logo' });
  const { upload: uploadBanner, isUploading: isUploadingBanner } = useFileUpload({ folder: 'shop-banner' });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const result = await uploadLogo(file);
      if (result) await updateLogo(result.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Logo upload failed');
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    try {
      const result = await uploadBanner(file);
      if (result) await updateBanner(result.url);
    } catch (err: any) {
      setErrorMsg(err.message || 'Banner upload failed');
    }
  };

  const onShopUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setEditSuccess(false);
    try {
      if (!editShopName.trim()) {
        throw new Error('Store Name is required.');
      }
      if (!editPhone.trim()) {
        throw new Error('Store Phone Number is required.');
      }
      if (!editAddressLine1.trim()) {
        throw new Error('Address Line 1 is required.');
      }
      if (!editPostalCode.trim()) {
        throw new Error('Postal Code is required.');
      }
      if (!editShopName.trim()) {
        throw new Error('Store Name is required.');
      }
      if (!editPhone.trim()) {
        throw new Error('Store Phone Number is required.');
      }
      if (!selectedState.trim()) {
        throw new Error('State is required.');
      }
      if (districtRequired && !selectedDistrict.trim()) {
        throw new Error('District is required.');
      }
      if (pickupAddress) {
        if (!pickupAddress.doorNo.trim() && !pickupAddress.addressLine1.trim()) {
          throw new Error('House / Door / Shop Number is required for accurate dispatch.');
        }
        if (!pickupAddress.street.trim() && !pickupAddress.addressLine1.trim()) {
          throw new Error('Street / Road Name is required.');
        }
        if (!pickupAddress.area.trim() && !pickupAddress.addressLine2.trim()) {
          throw new Error('Area / Locality is required.');
        }
        if (!pickupAddress.postalCode.trim() || pickupAddress.postalCode.trim().length !== 6) {
          throw new Error('A valid 6-digit Indian PIN code is required.');
        }
      }
      
      await updateShop({
        shopName: editShopName.trim(),
        description: editDescription.trim(),
        phone: editPhone.trim(),
        doorNo: pickupAddress?.doorNo?.trim(),
        buildingName: pickupAddress?.buildingName?.trim(),
        street: pickupAddress?.street?.trim(),
        cross: pickupAddress?.cross?.trim(),
        area: pickupAddress?.area?.trim(),
        landmark: pickupAddress?.landmark?.trim(),
        addressLine1: pickupAddress?.addressLine1 || editAddressLine1.trim(),
        addressLine2: pickupAddress?.addressLine2 || editAddressLine2.trim() || undefined,
        city: pickupAddress?.city || selectedDistrict,
        district: selectedDistrict,
        state: selectedState,
        postalCode: pickupAddress?.postalCode || editPostalCode.trim(),
        country: 'India',
        latitude: pickupAddress?.latitude ?? coordinates.latitude,
        longitude: pickupAddress?.longitude ?? coordinates.longitude,
        locationSource: pickupAddress?.locationSource,
        accuracyMeters: pickupAddress?.accuracyMeters,
        formattedAddress: pickupAddress?.formattedAddress,
      });
      setEditSuccess(true);
      showToast('Store details and pickup address updated successfully!', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update shop details.');
    }
  };

  const onBankSubmit = async (data: BankDetailsInput) => {
    setErrorMsg(null);
    setBankSuccess(false);
    try {
      await addBankAccount(data);
      setBankSuccess(true);
      showToast('Bank account linked successfully!', 'success');
      bankReset();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to add bank account.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    }
  };

  const handleOpenEditBank = (acct: any) => {
    setEditingAccount(acct);
    setEditHolderName(acct.accountHolderName || '');
    setEditBankName(acct.bankName || '');
    setEditAccountNumber(acct.accountNumber || '');
    setEditIfscCode(acct.ifscCode || '');
    setEditUpiId(acct.upiId || '');
  };

  const handleSaveEditBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      await updateBankAccount({
        id: editingAccount.id,
        payload: {
          accountHolderName: editHolderName.trim(),
          bankName: editBankName.trim(),
          accountNumber: editAccountNumber.trim(),
          ifscCode: editIfscCode.trim().toUpperCase(),
          upiId: editUpiId.trim() || undefined,
        },
      });
      showToast('Bank account details updated successfully', 'success');
      setEditingAccount(null);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to update bank account', 'error');
    }
  };

  const handleDeleteBank = (id: string) => {
    showConfirm({
      title: 'Remove Bank Account',
      message: 'Are you sure you want to remove this bank account? Historical transaction records will be preserved.',
      confirmText: 'Remove Account',
      onConfirm: async () => {
        try {
          await deleteBankAccount(id);
          showToast('Bank account removed successfully', 'success');
        } catch (err: any) {
          showToast(err.response?.data?.message || err.message || 'Failed to remove bank account', 'error');
        }
      },
    });
  };

  const handleSetDefaultBank = async (id: string) => {
    try {
      await setDefaultBankAccount(id);
      showToast('Default settlement bank account updated', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to update default account', 'error');
    }
  };

  const handleDeleteShop = () => {
    showConfirm({
      title: 'Delete Shop permanently?',
      message: 'CRITICAL WARNING: This will permanently delete your store profile and pickup addresses. Active orders must be completed first. Are you absolutely sure you want to delete your shop?',
      confirmText: 'Delete Shop',
      onConfirm: async () => {
        setErrorMsg(null);
        try {
          await deleteShop();
          window.location.href = '/shop-setup';
        } catch (err: any) {
          setErrorMsg(err.message || 'Failed to delete shop.');
        }
      },
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl animate-fade-up">
        {/* Title */}
        <div className="flex flex-col space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Shop Profile & Settings</h1>
          <p className="text-xs text-white/45">Manage your digital storefront, upload branding assets, register tax information, and link bank details.</p>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Shop Agreement & Approval Banner */}
        <SellerAgreementBanner shopStatus={shop?.status} />

        <Card className="border border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-emerald-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-white/90">Marketplace Configuration (Read Only)</CardTitle>
            <CardDescription className="text-xs text-white/50">Marketplace parameters configured by the administrative team</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 text-xs">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3 flex flex-col justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Commission</p>
                <p className="mt-1 text-sm font-semibold text-white">{(shop as any)?.commissionPercentage ?? 10}%</p>
              </div>
              {(shop as any)?.commissionNotes && (
                <p className="text-[10px] text-white/45 mt-2 border-t border-white/5 pt-1 italic font-normal">
                  Notes: {(shop as any).commissionNotes}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-3.5 flex flex-col justify-between min-h-[110px]">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Packaging Catalogue</p>
                <p className="mt-1 text-sm font-semibold text-white">Multi-Option Packaging</p>
                <p className="text-[10px] text-white/45 mt-1">
                  Manage custom boxes, covers, pouches, and gift wrapping in the catalogue section below.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  document.getElementById('packaging-catalogue-section')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full text-[10px] h-7 font-bold py-0 mt-3 border-white/10 text-white/80 hover:text-white"
              >
                Manage Packaging Options
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Packaging Catalogue Section */}
        <div id="packaging-catalogue-section">
          <PackagingCatalogueSection />
        </div>

        {/* Banner and Logo custom cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Logo card */}
          <Card className="md:col-span-1 border border-white/5 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white/90">Store Branding</CardTitle>
              <CardDescription>Upload your shop profile icon logo</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              <div className="relative h-28 w-28 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden mb-4 group shadow-lg">
                {shop?.logoUrl ? (
                  <img src={shop.logoUrl} alt="Store logo" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-10 w-10 text-white/20" />
                )}
                {isUploadingLogo && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-[10px] text-purple-300 font-bold">Uploading...</span>
                  </div>
                )}
              </div>

              <label className="relative flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold glass text-white/80 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>Upload Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={isUploadingLogo}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>

          {/* Banner card */}
          <Card className="md:col-span-2 border border-white/5 flex flex-col justify-between">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-white/90">Store Banner</CardTitle>
              <CardDescription>Hero banner displayed on customer profile page</CardDescription>
            </CardHeader>
            <CardContent className="py-4">
              <div className="relative h-28 w-full rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden mb-4 shadow-inner">
                {shop?.bannerUrl ? (
                  <img src={shop.bannerUrl} alt="Store banner" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center space-y-1.5">
                    <Store className="h-6 w-6 text-white/10 mx-auto" />
                    <span className="text-[11px] text-white/20 block font-medium">No banner uploaded</span>
                  </div>
                )}
                {isUploadingBanner && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-[10px] text-purple-300 font-bold">Uploading...</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <label className="relative flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold glass text-white/80 hover:text-white hover:border-white/20 transition-all cursor-pointer">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Store Banner</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleBannerUpload}
                    disabled={isUploadingBanner}
                    className="hidden"
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Shop Status */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-bold text-white/90 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span>Shop Status</span>
            </CardTitle>
            <CardDescription>Your shop's current standing on the marketplace</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 gap-3">
              <div>
                <span className="text-[10px] text-white/45 uppercase tracking-wider font-semibold block">Status</span>
                <span className="text-sm font-bold text-white/90 block mt-0.5 capitalize">
                  {shop?.status || 'UNKNOWN'}
                </span>
              </div>
              <div>
                {shop?.status === 'APPROVED' ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                    <CheckCircle className="h-4 w-4" />
                    <span>Your shop is approved and active</span>
                  </div>
                ) : shop?.status === 'PENDING' ? (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                    Awaiting Review
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px]">
                    {shop?.status}
                  </Badge>
                )}
              </div>
            </div>
            {shop?.rejectionReason && (
              <div className="p-3.5 rounded-xl border border-red-500/20 bg-red-500/5 text-xs text-red-400">
                <span className="font-bold">Reason: </span>{shop.rejectionReason}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update Shop Information Card */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-bold text-white/90 flex items-center gap-2">
              <Store className="h-4 w-4 text-purple-400" />
              <span>Edit Shop Details</span>
            </CardTitle>
            <CardDescription>Update your public shop profile and pickup address</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {editSuccess && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400 mb-4">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>Shop details updated successfully!</span>
              </div>
            )}
            <form onSubmit={onShopUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 ml-1">Store Name</label>
                  <Input
                    placeholder="My Craft Shop"
                    value={editShopName}
                    onChange={(e) => setEditShopName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/60 ml-1">Store Phone Number</label>
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white/60 ml-1">Store Description</label>
                <textarea
                  placeholder="Describe your craft, materials used, etc..."
                  rows={3}
                  className="glass-input flex w-full rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none resize-none min-h-[80px] border border-white/10"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="border-t border-white/5 pt-3 mt-1">
                <ShopPickupAddressForm
                  initialAddress={memoizedInitialAddress}
                  onAddressChange={setPickupAddress}
                  allStates={allStates}
                  districts={districts}
                  selectedState={selectedState}
                  onStateChange={setSelectedState}
                  selectedDistrict={selectedDistrict}
                  onDistrictChange={setSelectedDistrict}
                  districtRequired={districtRequired}
                  isLoadingConfig={isLoadingConfig}
                  isLoadingDistricts={isLoadingDistricts}
                  disabled={isUpdatingShop}
                />
              </div>

              <Button type="submit" className="w-full mt-4" isLoading={isUpdatingShop}>
                <span>Save Shop Details</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Linked Bank accounts */}
          <Card className="md:col-span-2 border border-white/5 flex flex-col">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-bold text-white/90 flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-purple-400" />
                <span>Linked Bank Accounts</span>
              </CardTitle>
              <CardDescription>Saved settlement accounts for automatic monthly payouts</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col justify-between">
              {isLoadingBank ? (
                <div className="space-y-2">
                  <div className="h-10 w-full skeleton-glass" />
                  <div className="h-10 w-full skeleton-glass" />
                </div>
              ) : bankAccounts.length > 0 ? (
                <>
                  {/* ── MOBILE VIEW: BANK ACCOUNT CARDS (< md) ── */}
                  <div className="block md:hidden space-y-3">
                    {bankAccounts.map((acct: any) => (
                      <div key={acct.id} className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white/90 text-xs">
                            {acct.accountHolderName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {acct.isDefault && (
                              <Badge variant="secondary" className="text-[9px] py-0 bg-purple-600/20 text-purple-300 border-purple-500/30">
                                Default
                              </Badge>
                            )}
                            <Badge variant={acct.isVerified ? 'success' : 'secondary'} className="text-[9px] py-0">
                              {acct.isVerified ? 'Verified' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>{acct.bankName}</span>
                          <span className="font-mono text-white/70">
                            {acct.accountNumber?.includes('•') ? acct.accountNumber : `•••• ${acct.accountNumber?.slice(-4)}`}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-white/40">
                          IFSC: {acct.ifscCode} {acct.upiId ? `• UPI: ${acct.upiId}` : ''}
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                          {!acct.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultBank(acct.id)}
                              disabled={isSettingDefaultBank}
                              className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold px-2 py-1 rounded-lg hover:bg-purple-500/10 transition-colors cursor-pointer"
                            >
                              Make Default
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditBank(acct)}
                            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title="Edit bank details"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBank(acct.id)}
                            disabled={isDeletingBank}
                            className="p-1 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Remove account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── DESKTOP VIEW: TABLE (>= md) ── */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Holder</TableHead>
                          <TableHead>Bank / Account</TableHead>
                          <TableHead>IFSC / UPI</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bankAccounts.map((acct: any) => (
                          <TableRow key={acct.id}>
                            <TableCell className="font-semibold text-white/90 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span>{acct.accountHolderName}</span>
                                {acct.isDefault && (
                                  <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Default
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="block font-medium">{acct.bankName}</span>
                              <span className="block text-[10px] text-white/50 font-mono">
                                {acct.accountNumber?.includes('•') ? acct.accountNumber : `•••• ${acct.accountNumber?.slice(-4)}`}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              <div>{acct.ifscCode}</div>
                              {acct.upiId && <div className="text-[10px] text-white/40">{acct.upiId}</div>}
                            </TableCell>
                            <TableCell>
                              <Badge variant={acct.isVerified ? 'success' : 'secondary'} className="text-[8px] py-0">
                                {acct.isVerified ? 'Verified' : 'Pending'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!acct.isDefault && (
                                  <button
                                    type="button"
                                    onClick={() => handleSetDefaultBank(acct.id)}
                                    disabled={isSettingDefaultBank}
                                    className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold px-2 py-1 rounded-lg hover:bg-purple-500/10 transition-colors cursor-pointer"
                                  >
                                    Make Default
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditBank(acct)}
                                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Edit bank details"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteBank(acct.id)}
                                  disabled={isDeletingBank}
                                  className="p-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                  title="Remove account"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              ) : (
                <div className="text-center py-10 space-y-3">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white/80">No bank accounts linked</h4>
                    <p className="text-[10px] text-white/40 max-w-xs mx-auto leading-relaxed mt-1">
                      You currently have no settlement account linked. You can link a bank account anytime below to receive automated payouts.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add Bank Account */}
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-sm font-bold text-white/90">Link Settlement Bank</CardTitle>
              <CardDescription>Add new checking or savings details</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {bankSuccess && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400 mb-4">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>Bank details linked successfully!</span>
                </div>
              )}

              <form onSubmit={bankSubmit(onBankSubmit)} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/60 ml-1">Account Holder Name</label>
                  <Input placeholder="JOHN DOE" {...bankRegister('accountHolderName')} error={!!bankErrors.accountHolderName} />
                  {bankErrors.accountHolderName && (
                    <p className="text-[9px] text-red-400 ml-1">{bankErrors.accountHolderName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/60 ml-1">Bank Name</label>
                  <Input placeholder="HDFC Bank" {...bankRegister('bankName')} error={!!bankErrors.bankName} />
                  {bankErrors.bankName && (
                    <p className="text-[9px] text-red-400 ml-1">{bankErrors.bankName.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/60 ml-1">Account Number</label>
                  <Input placeholder="501002938487" {...bankRegister('accountNumber')} error={!!bankErrors.accountNumber} />
                  {bankErrors.accountNumber && (
                    <p className="text-[9px] text-red-400 ml-1">{bankErrors.accountNumber.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/60 ml-1">IFSC Code</label>
                  <Input placeholder="HDFC0000123" {...bankRegister('ifscCode')} error={!!bankErrors.ifscCode} />
                  {bankErrors.ifscCode && (
                    <p className="text-[9px] text-red-400 ml-1">{bankErrors.ifscCode.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/60 ml-1">UPI ID (Optional)</label>
                  <Input placeholder="johndoe@okhdfc" {...bankRegister('upiId')} />
                </div>

                <Button type="submit" className="w-full mt-2" isLoading={isAddingBank}>
                  Link Account
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Danger zone */}
        <Card className="border border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Danger Zone</span>
            </CardTitle>
            <CardDescription className="text-red-400/60">Actions are irreversible and will affect customer fulfillment.</CardDescription>
          </CardHeader>
          <CardContent className="pt-2 flex justify-between items-center">
            <div>
              <h4 className="text-xs font-bold text-white/95">Delete Store Portal</h4>
              <p className="text-[10px] text-white/40 leading-relaxed mt-0.5">
                Permanently shut down your shop and delete pickup addresses. Active or pending orders must be fulfilled or resolved first.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDeleteShop} isLoading={isDeletingShop} className="shrink-0 ml-4 font-bold">
              Delete Shop
            </Button>
          </CardContent>
        </Card>
        {/* Edit Bank Account Dialog */}
        <Dialog
          isOpen={!!editingAccount}
          onClose={() => setEditingAccount(null)}
          title="Edit Bank Account Details"
          description="Update account details. Note that changing account number or IFSC code resets verification status."
        >
          <form onSubmit={handleSaveEditBank} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-white/60 ml-1">Account Holder Name</label>
              <Input
                value={editHolderName}
                onChange={(e) => setEditHolderName(e.target.value)}
                placeholder="JOHN DOE"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-white/60 ml-1">Bank Name</label>
              <Input
                value={editBankName}
                onChange={(e) => setEditBankName(e.target.value)}
                placeholder="HDFC Bank"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-white/60 ml-1">Account Number</label>
              <Input
                value={editAccountNumber}
                onChange={(e) => setEditAccountNumber(e.target.value)}
                placeholder="Enter new account number or keep existing"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-white/60 ml-1">IFSC Code</label>
              <Input
                value={editIfscCode}
                onChange={(e) => setEditIfscCode(e.target.value.toUpperCase())}
                placeholder="HDFC0000123"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-white/60 ml-1">UPI ID (Optional)</label>
              <Input
                value={editUpiId}
                onChange={(e) => setEditUpiId(e.target.value)}
                placeholder="johndoe@okhdfc"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingAccount(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isUpdatingBank}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
