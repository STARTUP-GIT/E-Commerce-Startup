'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProfile } from '../hooks/useProfile';
import { editProfileSchema, getAddAddressSchema, EditProfileInput, AddAddressInput } from '../services/profileService';
import { useFileUpload } from '@/features/storage/hooks/useFileUpload';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { User, MapPin, ShieldAlert, LogOut, Loader2, Plus, Home, Upload, Pencil, Trash2, CheckCircle2, Star } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { profileApi, type Address } from '../api/profileApi';
import { useLocationStore } from '@/lib/store/locationStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { GoogleMapsLocationPicker, type LocationPickerValue } from '@/features/location/ui/GoogleMapsLocationPicker';

export function ProfileDashboard() {
  const {
    profile,
    addresses,
    isLoading,
    isError,
    editProfile,
    isEditing,
    createAddress,
    isCreatingAddress,
    updateAddress,
    isUpdatingAddress,
    deleteAddress,
    isDeletingAddress,
    setDefaultAddress,
    isSettingDefaultAddress,
    deactivateAccount,
    isDeactivating,
    deleteAccount,
    isDeleting,
  } = useProfile();

  const [activeTab, setActiveTab] = useState<'info' | 'addresses' | 'danger'>('info');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [locationValue, setLocationValue] = useState<LocationPickerValue>({ country: 'India' });
  const [addressSaveError, setAddressSaveError] = useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'addresses') {
        setActiveTab('addresses');
        if (params.get('add') === 'true') {
          setShowAddressForm(true);
        }
      }
    }
  }, []);

  // Fetch active states & configurations from backend
  const { data: locationsConfig, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['locations-config'],
    queryFn: profileApi.getLocationsStates,
    staleTime: 10 * 60 * 1000,
  });

  const activeStates = locationsConfig?.states ?? [];
  const districtRequired = locationsConfig?.districtRequired !== false;

  const { upload: uploadAvatar, isUploading: isUploadingAvatar, publicUrl: avatarPreview } = useFileUpload({ folder: 'customer-profile' });

  const { setActiveStatesData, setComingSoon, setLocation } = useLocationStore();
  const { showConfirm, showAlert } = useConfirmStore();

  React.useEffect(() => {
    if (locationsConfig) {
      setActiveStatesData(locationsConfig.states.map(s => s.name), locationsConfig.districtRequired);
    }
  }, [locationsConfig, setActiveStatesData]);

  // Form for Profile Info
  const {
    register: registerInfo,
    handleSubmit: handleSubmitInfo,
    formState: { errors: infoErrors },
  } = useForm<EditProfileInput>({
    resolver: zodResolver(editProfileSchema),
    values: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName || '',
          username: profile.username,
          phone: profile.phone || '',
        }
      : undefined,
  });

  // Form for Adding Address
  const {
    register: registerAddress,
    handleSubmit: handleSubmitAddress,
    reset: resetAddressForm,
    setValue: setValueAddress,
    watch: watchAddress,
    formState: { errors: addressErrors },
  } = useForm<AddAddressInput>({
    resolver: zodResolver(getAddAddressSchema(districtRequired)),
    defaultValues: {
      type: 'HOME',
      isDefault: false,
      country: 'India',
      state: '',
      city: '',
    },
  });

  const selectedState = watchAddress('state');

  // Fetch active districts for selected state
  const { data: districtsData, isLoading: isLoadingDistricts } = useQuery({
    queryKey: ['locations-districts', selectedState],
    queryFn: () => profileApi.getLocationsDistricts(selectedState),
    enabled: !!selectedState,
    staleTime: 10 * 60 * 1000,
  });

  const districts = districtsData?.districts ?? [];

  const selectedStateObj = (locationsConfig?.allStates ?? []).find(
    (st: any) => st.name.toLowerCase() === (selectedState || '').toLowerCase()
  );

  const selectedDistrict = watchAddress('city');
  const selectedDistrictObj = (districtsData?.allDistricts ?? []).find(
    (d: any) => d.name.toLowerCase() === (selectedDistrict || '').toLowerCase()
  );

  // Reset district selection if state changes
  React.useEffect(() => {
    setValueAddress('city', '');
  }, [selectedState, setValueAddress]);

  // Open Coming Soon dialog if selected state is inactive
  React.useEffect(() => {
    if (selectedState && selectedStateObj) {
      if (!selectedStateObj.isEnabled) {
        setComingSoon(true, selectedStateObj.name, undefined, () => {
          setValueAddress('state', '');
        });
      }
    }
  }, [selectedState, selectedStateObj, setComingSoon, setValueAddress]);

  // Open Coming Soon dialog if selected district is inactive
  React.useEffect(() => {
    if (selectedDistrict && selectedDistrictObj) {
      if (!selectedDistrictObj.isEnabled) {
        setComingSoon(true, selectedState, selectedDistrictObj.name, () => {
          setValueAddress('city', '');
        });
      }
    }
  }, [selectedDistrict, selectedDistrictObj, selectedState, setComingSoon, setValueAddress]);

  const onUpdateInfo = (data: EditProfileInput) => {
    editProfile(data);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadAvatar(file);
    if (result) {
      editProfile({ avatarUrl: result.url });
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressSaveError(null);
    resetAddressForm({
      fullName: `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim(),
      phone: profile?.phone || '',
      addressLine1: '',
      addressLine2: '',
      state: '',
      city: '',
      postalCode: '',
      country: 'India',
      type: 'HOME',
      label: '',
      isDefault: false,
    });
    setLocationValue({ country: 'India' });
    setShowAddressForm(true);
  };

  const handleOpenEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddressSaveError(null);
    resetAddressForm({
      fullName: addr.fullName,
      phone: addr.phone,
      addressLine1: addr.addressLine1,
      addressLine2: addr.addressLine2 || '',
      state: addr.state,
      city: addr.district || addr.city,
      postalCode: addr.postalCode,
      country: addr.country || 'India',
      type: (addr.type as any) || 'HOME',
      label: addr.label || '',
      isDefault: addr.isDefault,
    });
    setLocationValue({
      latitude: addr.latitude !== undefined && addr.latitude !== null ? Number(addr.latitude) : null,
      longitude: addr.longitude !== undefined && addr.longitude !== null ? Number(addr.longitude) : null,
      formattedAddress: addr.formattedAddress || '',
      addressLine1: addr.addressLine1 || '',
      addressLine2: addr.addressLine2 || '',
      city: addr.city || '',
      district: addr.district || addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      country: addr.country || 'India',
      placeId: addr.placeId || '',
    });
    setShowAddressForm(true);
  };

  const handleLocationPickerChange = (loc: LocationPickerValue) => {
    setLocationValue(loc);
    if (loc.addressLine1) setValueAddress('addressLine1', loc.addressLine1, { shouldValidate: true });
    if (loc.addressLine2) setValueAddress('addressLine2', loc.addressLine2);
    if (loc.state) setValueAddress('state', loc.state, { shouldValidate: true });
    if (loc.district || loc.city) setValueAddress('city', loc.district || loc.city || '', { shouldValidate: true });
    if (loc.postalCode) setValueAddress('postalCode', loc.postalCode, { shouldValidate: true });
  };

  const onSubmitAddress = async (data: AddAddressInput) => {
    setAddressSaveError(null);
    try {
      const payload = {
        ...data,
        city: data.city || '',
        district: data.city || locationValue.district,
        latitude: locationValue.latitude,
        longitude: locationValue.longitude,
        formattedAddress: locationValue.formattedAddress,
        placeId: locationValue.placeId,
      };

      if (editingAddress) {
        await updateAddress({ id: editingAddress.id, payload });
        setShowAddressForm(false);
        setEditingAddress(null);
        showAlert({ title: 'Success', message: 'Delivery address updated successfully!' });
      } else {
        const res = await createAddress(payload);
        setShowAddressForm(false);
        if (res?.address) {
          setLocation(res.address.id, res.address.state, res.address.city || res.address.district || '');
        }
        showAlert({ title: 'Success', message: 'Address added successfully and set as your active location!' });
      }
    } catch (err: any) {
      setAddressSaveError(err.response?.data?.message || err.message || 'Failed to save address.');
    }
  };

  const handleDeleteAddress = (addr: Address) => {
    showConfirm({
      title: 'Delete Delivery Address?',
      message: `Are you sure you want to delete "${addr.addressLine1}"? This action cannot be undone.`,
      confirmText: 'Delete Address',
      onConfirm: async () => {
        try {
          await deleteAddress(addr.id);
          showAlert({ title: 'Success', message: 'Address deleted successfully.' });
        } catch (err: any) {
          showAlert({
            title: 'Cannot Delete Address',
            message: err.response?.data?.message || err.message || 'Failed to delete address.',
          });
        }
      },
    });
  };

  const handleSetDefaultAddress = async (addr: Address) => {
    try {
      await setDefaultAddress(addr.id);
      setLocation(addr.id, addr.state, addr.city || addr.district || '');
      showAlert({ title: 'Success', message: 'Default address updated successfully!' });
    } catch (err: any) {
      showAlert({
        title: 'Error',
        message: err.response?.data?.message || err.message || 'Failed to set default address.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <div className="grid md:grid-cols-[240px_1fr] gap-8">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 text-center space-y-4">
        <p className="text-destructive font-semibold">Failed to load profile information.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your personal details, shipping addresses, and security preferences.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-2 max-w-fit cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid md:grid-cols-[240px_1fr] gap-8 items-start">
        {/* Navigation Sidebar */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'info'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <User className="h-4 w-4" />
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Address Book
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'danger'
                ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Danger Zone
          </button>
        </nav>

        {/* Content Box */}
        <div className="space-y-6">
          {/* TAB 1: Personal Info */}
          {activeTab === 'info' && (
            <Card>
              <CardHeader>
                <CardTitle>Personal Details</CardTitle>
                <CardDescription>Update your username, name, and contact details.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Avatar Upload */}
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border">
                  <div className="relative h-16 w-16 rounded-full border-2 border-border overflow-hidden bg-zinc-900 flex items-center justify-center shrink-0">
                    {avatarPreview || profile.avatarUrl ? (
                      <img src={avatarPreview || profile.avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-7 w-7 text-zinc-600" />
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-zinc-900 text-foreground hover:bg-zinc-800 transition-colors cursor-pointer">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        disabled={isUploadingAvatar}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-muted-foreground mt-1">JPEG, PNG, or WEBP. Max 5MB.</p>
                  </div>
                </div>
                <form onSubmit={handleSubmitInfo(onUpdateInfo)} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">First Name</label>
                      <Input error={!!infoErrors.firstName} {...registerInfo('firstName')} />
                      {infoErrors.firstName && <p className="text-xs text-destructive">{infoErrors.firstName.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Last Name</label>
                      <Input {...registerInfo('lastName')} />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Username</label>
                      <Input error={!!infoErrors.username} {...registerInfo('username')} />
                      {infoErrors.username && <p className="text-xs text-destructive">{infoErrors.username.message}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number</label>
                      <Input placeholder="+1 234 567 890" {...registerInfo('phone')} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Email Address</label>
                    <Input value={profile.email} disabled className="opacity-70 bg-zinc-900" />
                    <p className="text-[10px] text-muted-foreground">Email address cannot be changed.</p>
                  </div>

                  <div className="pt-2">
                    <Button type="submit" isLoading={isEditing} className="cursor-pointer">
                      Save Changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: Address Book */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Saved Addresses</h3>
                  <p className="text-sm text-muted-foreground">Manage your delivery and pickup destinations.</p>
                </div>
                {!showAddressForm && (
                  <Button
                    onClick={handleOpenAddAddress}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add Address
                  </Button>
                )}
              </div>

              {/* Add / Edit Address Form */}
              {showAddressForm && (
                <Card className="border-primary/20 bg-zinc-950/40 backdrop-blur-md shadow-2xl">
                  <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="text-lg">
                      {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
                    </CardTitle>
                    <CardDescription>
                      {editingAddress
                        ? 'Update your delivery location pin and address details.'
                        : 'Search on Google Maps or drop a pin to auto-fill address details.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    {addressSaveError && (
                      <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400">
                        <ShieldAlert className="h-4 w-4 shrink-0" />
                        <span>{addressSaveError}</span>
                      </div>
                    )}

                    {/* Google Maps Location Picker */}
                    <GoogleMapsLocationPicker
                      value={locationValue}
                      onChange={handleLocationPickerChange}
                      availableStates={locationsConfig?.allStates ?? []}
                      availableDistricts={districtsData?.allDistricts ?? []}
                      title="Delivery Location & Pin"
                      description="Search for your address or move the marker directly to fine-tune your delivery location."
                    />

                    <form onSubmit={handleSubmitAddress(onSubmitAddress)} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Recipient Full Name *</label>
                          <Input error={!!addressErrors.fullName} {...registerAddress('fullName')} placeholder="e.g. John Doe" />
                          {addressErrors.fullName && <p className="text-xs text-destructive">{addressErrors.fullName.message}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Phone Number *</label>
                          <Input error={!!addressErrors.phone} {...registerAddress('phone')} placeholder="e.g. +91 98765 43210" />
                          {addressErrors.phone && <p className="text-xs text-destructive">{addressErrors.phone.message}</p>}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Address Line 1 *</label>
                        <Input error={!!addressErrors.addressLine1} {...registerAddress('addressLine1')} placeholder="Flat, House no., Building, Apartment, Street" />
                        {addressErrors.addressLine1 && <p className="text-xs text-destructive">{addressErrors.addressLine1.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Address Line 2 (Optional)</label>
                        <Input {...registerAddress('addressLine2')} placeholder="Floor, Landmark, Near metro station" />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* State selection */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">State *</label>
                          {isLoadingConfig ? (
                            <Skeleton className="h-10 w-full rounded-xl" />
                          ) : (
                            <select
                              {...registerAddress('state')}
                              className={`flex h-10 w-full rounded-xl px-3 py-2 text-sm outline-none bg-zinc-900 border border-white/10 text-white focus:border-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                                addressErrors.state ? 'border-red-500/50 focus:border-red-500/60' : ''
                              }`}
                            >
                              <option value="" className="bg-zinc-950 text-white/50">Select State</option>
                              {(locationsConfig?.allStates ?? []).map((st: any) => (
                                <option key={st.name} value={st.name} className="bg-zinc-950 text-white">
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {addressErrors.state && (
                            <p className="text-[10px] text-red-400 mt-0.5">{addressErrors.state.message}</p>
                          )}
                        </div>

                        {/* District (City) selection */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">
                            District {districtRequired ? '*' : '(Optional)'}
                          </label>
                          {isLoadingDistricts ? (
                            <Skeleton className="h-10 w-full rounded-xl" />
                          ) : !selectedState ? (
                            <select
                              className="flex h-10 w-full rounded-xl px-3 py-2 text-sm outline-none bg-zinc-900 border border-white/10 text-white/40 disabled:cursor-not-allowed"
                              disabled
                            >
                              <option>Select State first</option>
                            </select>
                          ) : (districtsData?.allDistricts ?? []).length === 0 ? (
                            <select
                              {...registerAddress('city')}
                              className={`flex h-10 w-full rounded-xl px-3 py-2 text-sm outline-none bg-zinc-900 border border-white/10 text-white focus:border-purple-500/50 ${
                                addressErrors.city ? 'border-red-500/50 focus:border-red-500/60' : ''
                              }`}
                            >
                              <option value="">{districtRequired ? 'No operational districts' : 'None available (Optional)'}</option>
                            </select>
                          ) : (
                            <select
                              {...registerAddress('city')}
                              className={`flex h-10 w-full rounded-xl px-3 py-2 text-sm outline-none bg-zinc-900 border border-white/10 text-white focus:border-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                                addressErrors.city ? 'border-red-500/50 focus:border-red-500/60' : ''
                              }`}
                            >
                              <option value="" className="bg-zinc-950 text-white/50">
                                {districtRequired ? 'Select District' : 'Select District (Optional)'}
                              </option>
                              {(districtsData?.allDistricts ?? []).map((d: any) => (
                                <option key={d.name} value={d.name} className="bg-zinc-950 text-white">
                                  {d.name}
                                </option>
                              ))}
                            </select>
                          )}
                          {addressErrors.city && (
                            <p className="text-[10px] text-red-400 mt-0.5">{addressErrors.city.message}</p>
                          )}
                        </div>

                        {/* Postal Code */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Postal Code *</label>
                          <Input error={!!addressErrors.postalCode} {...registerAddress('postalCode')} placeholder="e.g. 560001" />
                          {addressErrors.postalCode && (
                            <p className="text-[10px] text-red-400 mt-0.5">{addressErrors.postalCode.message}</p>
                          )}
                        </div>

                        {/* Country */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Country</label>
                          <Input value="India" disabled readOnly className="opacity-70 bg-zinc-900" />
                          <input type="hidden" value="India" {...registerAddress('country')} />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Address Type</label>
                          <select
                            {...registerAddress('type')}
                            className="flex h-10 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white focus-visible:outline-none focus:border-purple-500/50"
                          >
                            <option value="HOME" className="bg-zinc-950 text-white">Home</option>
                            <option value="WORK" className="bg-zinc-950 text-white">Work / Office</option>
                            <option value="BILLING" className="bg-zinc-950 text-white">Billing</option>
                            <option value="SHIPPING" className="bg-zinc-950 text-white">Shipping</option>
                            <option value="OTHER" className="bg-zinc-950 text-white">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">Label (Optional)</label>
                          <Input placeholder="e.g. Parents' House, Studio" {...registerAddress('label')} />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 py-2">
                        <input type="checkbox" id="isDefault" {...registerAddress('isDefault')} className="h-4 w-4 accent-purple-600 rounded" />
                        <label htmlFor="isDefault" className="text-sm font-medium text-foreground cursor-pointer select-none">
                          Set as default delivery address
                        </label>
                      </div>

                      <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowAddressForm(false);
                            setEditingAddress(null);
                          }}
                          className="cursor-pointer"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          isLoading={isCreatingAddress || isUpdatingAddress}
                          className="cursor-pointer"
                        >
                          {editingAddress ? 'Update Address' : 'Save Address'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {/* Address List */}
              <div className="grid gap-4">
                {addresses && addresses.length > 0 ? (
                  addresses.map((addr) => (
                    <Card
                      key={addr.id}
                      className={`transition-all duration-200 ${
                        addr.isDefault
                          ? 'border-purple-500/50 bg-purple-500/[0.03] shadow-md shadow-purple-500/5'
                          : 'border-border/60 hover:border-border'
                      }`}
                    >
                      <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-base text-foreground">{addr.fullName}</span>
                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                              {addr.type}
                            </Badge>
                            {addr.label && (
                              <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                                {addr.label}
                              </Badge>
                            )}
                            {addr.isDefault && (
                              <Badge variant="default" className="text-[10px] px-2 py-0.5 bg-purple-600 hover:bg-purple-600 text-white flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Default</span>
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm text-foreground/90 font-medium">
                            {addr.addressLine1}
                            {addr.addressLine2 && `, ${addr.addressLine2}`}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {[addr.city || addr.district, addr.state, addr.postalCode, addr.country]
                              .filter(Boolean)
                              .join(', ')}
                          </p>

                          {addr.phone && (
                            <p className="text-xs text-muted-foreground font-mono">
                              Phone: <span className="text-foreground/80">{addr.phone}</span>
                            </p>
                          )}

                          {addr.latitude && addr.longitude && (
                            <div className="pt-1 flex items-center gap-1 text-[11px] text-purple-400/80">
                              <MapPin className="h-3 w-3" />
                              <span>Pin verified ({Number(addr.latitude).toFixed(4)}, {Number(addr.longitude).toFixed(4)})</span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-3 sm:pt-0 w-full sm:w-auto justify-end">
                          {!addr.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefaultAddress(addr)}
                              disabled={isSettingDefaultAddress}
                              className="text-xs h-8 text-muted-foreground hover:text-purple-400 hover:bg-purple-500/10 cursor-pointer"
                              title="Set as Default Address"
                            >
                              <Star className="h-3.5 w-3.5 mr-1 text-purple-400" />
                              <span>Set Default</span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditAddress(addr)}
                            className="text-xs h-8 border-border hover:bg-zinc-800 cursor-pointer"
                            title="Edit Address"
                          >
                            <Pencil className="h-3.5 w-3.5 mr-1 text-zinc-300" />
                            <span>Edit</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAddress(addr)}
                            disabled={isDeletingAddress}
                            className="text-xs h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                            title="Delete Address"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-16 border border-dashed border-border/60 rounded-2xl bg-zinc-950/20">
                    <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <h4 className="text-sm font-semibold text-foreground">No saved addresses found</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                      Add your shipping address to enable rapid checkout and accurate delivery calculations.
                    </p>
                    <Button
                      onClick={handleOpenAddAddress}
                      size="sm"
                      className="mt-4 text-xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Your First Address
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Danger Zone */}
          {activeTab === 'danger' && (
            <Card className="border-red-500/20 bg-red-500/[0.02]">
              <CardHeader>
                <CardTitle className="text-red-500">Danger Zone</CardTitle>
                <CardDescription>Deactivating or deleting your account is irreversible. Please proceed with caution.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-base">Deactivate Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable your profile. You can reactivate it anytime.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10 cursor-pointer"
                    onClick={() => {
                      showConfirm({
                        title: 'Deactivate Account',
                        message: 'Are you sure you want to deactivate your account? You can reactivate it later.',
                        confirmText: 'Yes, Deactivate',
                        onConfirm: () => {
                          deactivateAccount();
                        },
                      });
                    }}
                    isLoading={isDeactivating}
                  >
                    Deactivate
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="font-semibold text-base">Permanently Delete Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Delete your account and all associated order history. This action is permanent.
                    </p>
                  </div>
                  <Button
                    variant="default"
                    className="bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    onClick={() => {
                      showConfirm({
                        title: 'Permanently Delete Account',
                        message: 'WARNING: This action is permanent and cannot be undone. Are you sure you want to delete your profile?',
                        confirmText: 'Delete Permanently',
                        onConfirm: () => {
                          deleteAccount();
                        },
                      });
                    }}
                    isLoading={isDeleting}
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
