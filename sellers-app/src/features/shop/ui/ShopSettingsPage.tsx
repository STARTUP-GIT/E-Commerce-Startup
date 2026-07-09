import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { Skeleton } from '@/shared/components/Skeleton';
export function ShopSettingsPage() {
  const {
    shop,
    bankAccounts,
    isLoadingBank,
    addBankAccount,
    isAddingBank,
    updateShop,
    isUpdatingShop,
    updateBanner,
    updateLogo,
    deleteShop,
    isDeletingShop,
  } = useShop();

  const showConfirm = useConfirmStore((state) => state.showConfirm);


  const [bankSuccess, setBankSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setEditAddressLine1(shop.defaultPickupAddress?.addressLine1 || '');
      setEditAddressLine2(shop.defaultPickupAddress?.addressLine2 || '');
      setEditPostalCode(shop.defaultPickupAddress?.postalCode || '');
      setSelectedState(shop.defaultPickupAddress?.state || '');
      setSelectedDistrict(shop.defaultPickupAddress?.city || '');
    }
  }, [shop]);

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
      if (!selectedState) {
        throw new Error('State is required.');
      }
      if (districtRequired && !selectedDistrict) {
        throw new Error('District is required.');
      }
      
      await updateShop({
        shopName: editShopName.trim(),
        description: editDescription.trim(),
        phone: editPhone.trim(),
        addressLine1: editAddressLine1.trim(),
        addressLine2: editAddressLine2.trim() || undefined,
        city: selectedDistrict,
        state: selectedState,
        postalCode: editPostalCode.trim(),
        country: 'India',
      });
      setEditSuccess(true);
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
      bankReset();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add bank account.');
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

        <Card className="border border-white/10 bg-gradient-to-br from-purple-500/10 via-transparent to-emerald-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-white/90">Platform Configuration</CardTitle>
            <CardDescription>Read-only marketplace settings that affect your shop.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Commission</p>
              <p className="mt-1 font-semibold text-white">{shop?.commissionPercentage ?? 10}%</p>
              {shop?.commissionNotes && (
                <p className="text-[10px] text-white/45 mt-1 border-t border-white/5 pt-1 italic font-normal">
                  Notes: {shop.commissionNotes}
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Packing Fee Approval</p>
              <p className="mt-1 font-semibold text-white">{shop?.packingFeeApproved ? 'Approved' : 'Pending'}</p>
            </div>
          </CardContent>
        </Card>

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

        {/* Marketplace settings (Read-Only) */}
        <Card className="border border-white/5 bg-zinc-950/20">
          <CardHeader className="pb-3 border-b border-white/5">
            <CardTitle className="text-xs font-bold text-white/90">Platform Configuration (Read-Only)</CardTitle>
            <CardDescription className="text-xs text-white/50">Marketplace parameters set by administration for your store</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
              <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider mb-1">Platform Commission</p>
              <p className="text-sm font-bold text-white/90">{(shop as any)?.commissionPercentage ?? 10}%</p>
              {(shop as any)?.commissionNotes && (
                <p className="text-[10px] text-white/40 mt-1 border-t border-white/5 pt-1 italic font-normal">
                  Notes: {(shop as any).commissionNotes}
                </p>
              )}
            </div>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
              <p className="text-[9px] font-bold text-white/35 uppercase tracking-wider mb-1">Packing Fee Authorization</p>
              <p className="text-sm font-bold text-white/90">
                {(shop as any)?.packingFeeApproved ? 'Approved' : 'Not Approved'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Shop Status */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-sm font-bold text-white/90 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span>Shop Status</span>
            </CardTitle>
            <CardDescription>Your shop's current standing on the platform</CardDescription>
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
                <h4 className="text-xs font-bold text-white/80 mb-3">Default Pickup Address</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/60 ml-1">Address Line 1</label>
                    <Input
                      placeholder="Flat, House no., Building, Street address"
                      value={editAddressLine1}
                      onChange={(e) => setEditAddressLine1(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/60 ml-1">Address Line 2 (Optional)</label>
                    <Input
                      placeholder="Apartment, Suite, Unit, Landmark"
                      value={editAddressLine2}
                      onChange={(e) => setEditAddressLine2(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      {isLoadingConfig ? (
                        <Skeleton className="h-10 w-full rounded-xl" />
                      ) : (
                        <SearchableDropdown
                          options={allStates}
                          value={selectedState}
                          onChange={(val) => {
                            setSelectedState(val);
                            setSelectedDistrict('');
                          }}
                          placeholder="Select State"
                          label="State"
                        />
                      )}
                    </div>

                    <div className="space-y-1">
                      {isLoadingDistricts ? (
                        <Skeleton className="h-10 w-full rounded-xl" />
                      ) : !selectedState ? (
                        <div className="space-y-1.5 relative w-full">
                          <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                            District {districtRequired ? '' : '(Optional)'}
                          </label>
                          <button
                            type="button"
                            disabled
                            className="w-full h-10 flex items-center justify-between px-3 rounded-xl border border-white/10 bg-neutral-900/60 text-xs text-white/30 cursor-not-allowed text-left font-medium select-none"
                          >
                            Select a State first
                          </button>
                        </div>
                      ) : districts.length === 0 ? (
                        <div className="space-y-1.5 relative w-full">
                          <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                            District {districtRequired ? '' : '(Optional)'}
                          </label>
                          <button
                            type="button"
                            disabled
                            className="w-full h-10 flex items-center justify-between px-3 rounded-xl border border-white/10 bg-neutral-900/60 text-xs text-white/30 cursor-not-allowed text-left font-medium select-none"
                          >
                            No operational districts
                          </button>
                        </div>
                      ) : (
                        <SearchableDropdown
                          options={districts}
                          value={selectedDistrict}
                          onChange={setSelectedDistrict}
                          placeholder={districtRequired ? 'Select District' : 'Select District (Optional)'}
                          label={`District ${districtRequired ? '' : '(Optional)'}`}
                          isLoading={isLoadingDistricts}
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/60 ml-1">Postal Code</label>
                      <Input
                        placeholder="e.g. 560001"
                        value={editPostalCode}
                        onChange={(e) => setEditPostalCode(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-white/60 ml-1">Country</label>
                      <Input value="India" disabled readOnly />
                    </div>
                  </div>
                </div>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Holder</TableHead>
                      <TableHead>Bank / Account</TableHead>
                      <TableHead>IFSC</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.map((acct) => (
                      <TableRow key={acct.id}>
                        <TableCell className="font-semibold text-white/90 text-xs">
                          {acct.accountHolderName}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span className="block">{acct.bankName}</span>
                          <span className="block text-[10px] text-white/30">
                            •••• {acct.accountNumber.slice(-4)}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{acct.ifscCode}</TableCell>
                        <TableCell>
                          <Badge variant={acct.isVerified ? 'success' : 'secondary'} className="text-[8px] py-0">
                            {acct.isVerified ? 'Verified' : 'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-10 space-y-2.5">
                  <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/30">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-bold text-white/60">No bank accounts linked</h4>
                  <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
                    Link a valid bank account to enable automatic settlements. Payouts require an approved shop profile.
                  </p>
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
      </div>
    </DashboardLayout>
  );
}
