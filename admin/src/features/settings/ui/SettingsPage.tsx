"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/featureApis';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Settings,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  Percent,
  Building2,
  FileText,
  Calculator,
  ShieldCheck,
  Receipt,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
} from 'lucide-react';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  // 1. Fetch Global Settings
  const { data: globalData, isLoading: isGlobalLoading, isError: isGlobalError, error: globalError, refetch: refetchGlobal } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    staleTime: 30 * 1000,
  });

  // 2. Fetch Authoritative Indian GST Configuration
  const { data: gstData, isLoading: isGstLoading, isError: isGstError, refetch: refetchGst } = useQuery({
    queryKey: ['indian-gst-config'],
    queryFn: settingsApi.getIndianGstConfig,
    staleTime: 30 * 1000,
  });

  const settings = globalData?.settings ?? {};
  const masterConfig = gstData?.masterConfig ?? {};
  const businessReg = gstData?.businessRegistration ?? {};
  const hsnRates: any[] = gstData?.hsnRates ?? [];
  const tcsSummary = gstData?.tcsSummary ?? {};

  // Form states - Platform Fee
  const [feeInput, setFeeInput] = useState<string>('');
  const [feeEnabled, setFeeEnabled] = useState<boolean>(true);
  const [isFeeDirty, setIsFeeDirty] = useState<boolean>(false);

  // Form states - GST Active Tab
  const [activeGstTab, setActiveGstTab] = useState<'master' | 'business' | 'hsn' | 'services' | 'tcs'>('master');

  // Form states - Business Registration Form
  const [businessForm, setBusinessForm] = useState({
    legalName: '',
    tradeName: '',
    gstin: '',
    pan: '',
    state: 'Karnataka',
    stateCode: '29',
    registrationType: 'REGULAR',
    registeredAddress: '',
    principalPlaceOfBusiness: '',
    authorizedSignatoryName: '',
    authorizedSignatoryDesignation: '',
    verificationStatus: 'UNVERIFIED',
  });

  // Form states - New HSN modal / form
  const [hsnSearch, setHsnSearch] = useState('');
  const [newHsn, setNewHsn] = useState({
    hsnCode: '',
    description: '',
    gstRate: '18',
    taxCategory: 'TAXABLE',
  });

  // Sync state whenever authoritative settings load or update
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (!isFeeDirty) {
        setFeeInput(settings.platformFee !== undefined ? String(settings.platformFee) : '10');
        setFeeEnabled(settings.platformFeeEnabled !== undefined ? Boolean(settings.platformFeeEnabled) : true);
      }
    }
  }, [settings, isFeeDirty]);

  useEffect(() => {
    if (businessReg && Object.keys(businessReg).length > 0) {
      setBusinessForm({
        legalName: businessReg.legalName || 'AtlasBasket Technologies Private Limited',
        tradeName: businessReg.tradeName || 'AtlasBasket',
        gstin: businessReg.gstin || '',
        pan: businessReg.pan || '',
        state: businessReg.state || 'Karnataka',
        stateCode: businessReg.stateCode || '29',
        registrationType: businessReg.registrationType || 'REGULAR',
        registeredAddress: businessReg.registeredAddress || '',
        principalPlaceOfBusiness: businessReg.principalPlaceOfBusiness || '',
        authorizedSignatoryName: businessReg.authorizedSignatoryName || '',
        authorizedSignatoryDesignation: businessReg.authorizedSignatoryDesignation || '',
        verificationStatus: businessReg.verificationStatus || 'UNVERIFIED',
      });
    }
  }, [businessReg]);

  // Mutation: Platform Fee
  const updateFee = useMutation({
    mutationFn: async (payload: { platformFee: number; platformFeeEnabled: boolean }) => {
      return await settingsApi.updatePlatformFee(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setIsFeeDirty(false);
      showToast('Platform fee configuration saved successfully.', 'success');
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.message || e.message || 'Failed to update platform fee.', 'error');
    },
  });

  // Mutation: Master GST Config (Toggle / Rates)
  const updateMasterGst = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return await settingsApi.updateIndianGstMaster(payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['indian-gst-config'] });
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      showToast(data.message || 'Indian GST configuration updated.', 'success');
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.message || e.message || 'Failed to update GST config.', 'error');
    },
  });

  // Mutation: Business Registration
  const updateBusiness = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return await settingsApi.updateBusinessGstRegistration(payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['indian-gst-config'] });
      showToast(data.message || 'AtlasBasket GST registration saved.', 'success');
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.message || e.message || 'Failed to save registration.', 'error');
    },
  });

  // Mutation: Create HSN Rate
  const createHsn = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return await settingsApi.createHsnRate(payload);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['indian-gst-config'] });
      setNewHsn({ hsnCode: '', description: '', gstRate: '18', taxCategory: 'TAXABLE' });
      showToast(data.message || 'HSN classification created.', 'success');
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.message || e.message || 'Failed to create HSN.', 'error');
    },
  });

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(feeInput);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid platform fee amount (₹0 or greater).', 'error');
      return;
    }
    updateFee.mutate({
      platformFee: val,
      platformFeeEnabled: feeEnabled,
    });
  };

  const handleBusinessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessForm.gstin && businessForm.gstin.trim()) {
      const cleanGst = businessForm.gstin.trim().toUpperCase();
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(cleanGst)) {
        showToast('Invalid GSTIN format. Must be a valid 15-character Indian GSTIN.', 'error');
        return;
      }
    }
    updateBusiness.mutate(businessForm);
  };

  const handleHsnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHsn.hsnCode.trim()) {
      showToast('HSN code is required.', 'error');
      return;
    }
    if (!newHsn.description.trim()) {
      showToast('Description is required.', 'error');
      return;
    }
    createHsn.mutate({
      hsnCode: newHsn.hsnCode.trim(),
      description: newHsn.description.trim(),
      gstRate: parseFloat(newHsn.gstRate) || 0,
      taxCategory: newHsn.taxCategory,
    });
  };

  if (isGlobalLoading || isGstLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (isGlobalError || isGstError) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-rose-400" />
        <h3 className="font-bold text-base">Failed to load marketplace settings</h3>
        <p className="text-xs text-rose-300/70">{(globalError as any)?.message || 'Internal connection error'}</p>
        <Button size="sm" onClick={() => { refetchGlobal(); refetchGst(); }} className="mt-2 bg-rose-600 hover:bg-rose-500 text-white">
          Retry
        </Button>
      </div>
    );
  }

  const isGstEnabled = masterConfig.isEnabled !== false;
  const filteredHsn = hsnRates.filter((h) =>
    h.hsnCode.toLowerCase().includes(hsnSearch.toLowerCase()) ||
    h.description.toLowerCase().includes(hsnSearch.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-up">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-indigo-400" />
            Marketplace Settings
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Authoritative platform fee control, Indian GST configuration, statutory business registration, and global parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {gstData?.lastUpdatedBy && (
            <div className="text-[11px] text-white/40 flex items-center gap-1.5 bg-white/[0.02] border border-white/10 px-3 py-1.5 rounded-xl">
              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Last modified by: <strong className="text-white/80">{gstData.lastUpdatedBy}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1: PLATFORM FEE CONTROL */}
      <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl shadow-xl">
        <CardHeader className="border-b border-white/5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-white">Platform Fee Control</CardTitle>
                <CardDescription className="text-xs text-white/45">
                  Configure buyer platform fee charged at customer checkout (kept distinct from product GST)
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                feeEnabled
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-white/10 bg-white/5 text-white/40'
              }`}
            >
              {feeEnabled ? 'FEE ENABLED' : 'FEE DISABLED'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={handleFeeSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Toggle Switch */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Charge Platform Fee on Customer Orders</div>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {feeEnabled
                      ? 'Customers will be charged the configured fee at checkout.'
                      : 'Fee is turned off (₹0 applied). Hidden from checkout summary.'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={feeEnabled}
                  onClick={() => {
                    setFeeEnabled(!feeEnabled);
                    setIsFeeDirty(true);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    feeEnabled ? 'bg-indigo-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      feeEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Fee Amount Input */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                  Configured Platform Fee (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">₹</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    disabled={!feeEnabled}
                    value={feeInput}
                    onChange={(e) => {
                      setFeeInput(e.target.value);
                      setIsFeeDirty(true);
                    }}
                    placeholder="e.g. 10"
                    className={`pl-7 h-10 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white ${
                      !feeEnabled ? 'opacity-50 cursor-not-allowed bg-white/[0.01]' : 'focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                size="sm"
                isLoading={updateFee.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-5 rounded-xl"
              >
                Save Platform Fee Configuration
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* SECTION 2: INDIAN GST CONFIGURATION */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight uppercase">Indian GST Configuration</h2>
              <p className="text-xs text-white/50">
                Extensible Goods &amp; Services Tax engine with HSN rates, SAC codes, TCS under Section 52, and Place of Supply rules.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                isGstEnabled
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
              }`}
            >
              {isGstEnabled ? 'ENGINE ACTIVE' : 'ENGINE DISABLED'}
            </Badge>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                businessReg.verificationStatus === 'VERIFIED'
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
              }`}
            >
              GSTIN: {businessReg.gstin || 'NOT REGISTERED'}
            </Badge>
          </div>
        </div>

        {/* GST Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/5 scrollbar-none">
          {[
            { id: 'master', label: 'GST Master Control', icon: Settings },
            { id: 'business', label: 'AtlasBasket Registration', icon: Building2 },
            { id: 'hsn', label: `Product HSN Master (${hsnRates.length})`, icon: Layers },
            { id: 'services', label: 'Services & SAC Rules', icon: Calculator },
            { id: 'tcs', label: 'E-Commerce TCS (Sec 52)', icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeGstTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveGstTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'bg-white/[0.02] text-white/50 hover:text-white/80 border border-white/5'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-400' : 'text-white/40'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB A: MASTER CONTROL & PLACE OF SUPPLY */}
        {activeGstTab === 'master' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl p-5 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white">GST Calculation Master Switch</h3>
                  <p className="text-[11px] text-white/45 mt-0.5">Central enable/disable for tax calculation engine</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isGstEnabled}
                  onClick={() => {
                    updateMasterGst.mutate({ isEnabled: !isGstEnabled });
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isGstEnabled ? 'bg-emerald-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isGstEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-xs space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>Statutory Compliance Mode</span>
                </div>
                <p className="text-[11px] text-white/60 leading-relaxed">
                  When enabled, tax is deterministically split into <strong>CGST + SGST</strong> for Intra-state supplies and <strong>IGST</strong> for Inter-state supplies based on official 2-digit Indian State Codes.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                  Default Product Tax Inclusion Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateMasterGst.mutate({ defaultProductTaxMode: 'EXCLUSIVE' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      masterConfig.defaultProductTaxMode === 'EXCLUSIVE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-white/[0.02] border-white/5 text-white/50 hover:border-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold block text-white">GST Exclusive</span>
                    <span className="text-[10px] opacity-70 block mt-0.5">Tax added on top of product price</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateMasterGst.mutate({ defaultProductTaxMode: 'INCLUSIVE' })}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      masterConfig.defaultProductTaxMode === 'INCLUSIVE'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-white/[0.02] border-white/5 text-white/50 hover:border-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold block text-white">GST Inclusive</span>
                    <span className="text-[10px] opacity-70 block mt-0.5">Tax extracted from displayed price</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  <strong>Notice:</strong> This is an extensible software engine. Actual rates, HSN classification applicability, and statutory return obligations should be reviewed by an Indian Chartered Accountant.
                </p>
              </div>
            </Card>

            {/* Place of Supply Rules Explanation Card */}
            <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl p-5 space-y-4">
              <div className="pb-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Place of Supply Architecture</h3>
                <p className="text-[11px] text-white/45 mt-0.5">Section 10 &amp; 12 of Integrated Goods and Services Tax (IGST) Act</p>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs">
                  <div className="flex justify-between items-center text-white font-bold">
                    <span>Intra-State Transaction</span>
                    <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30">CGST + SGST</Badge>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Occurs when Seller State Code matches Customer Delivery State Code (e.g., Karnataka 29 &rarr; Karnataka 29). Tax rate is split 50% CGST and 50% Karnataka SGST.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs">
                  <div className="flex justify-between items-center text-white font-bold">
                    <span>Inter-State Transaction</span>
                    <Badge variant="outline" className="text-[9px] text-indigo-400 border-indigo-500/30">IGST</Badge>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Occurs when Seller State Code differs from Customer Delivery State Code (e.g., Karnataka 29 &rarr; Maharashtra 27). 100% of the tax rate is levied as IGST.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs">
                  <div className="flex justify-between items-center text-white font-bold">
                    <span>Supported States &amp; UTs</span>
                    <Badge variant="outline" className="text-[9px]">36 Official Codes</Badge>
                  </div>
                  <p className="text-[11px] text-white/50 mt-1">
                    Karnataka (29), Maharashtra (27), Delhi (07), Tamil Nadu (33), Kerala (32), Uttar Pradesh (09), Gujarat (24), Telangana (36), etc.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB B: ATLASBASKET BUSINESS GST REGISTRATION */}
        {activeGstTab === 'business' && (
          <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl p-6">
            <form onSubmit={handleBusinessSubmit} className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">AtlasBasket Legal Entity GST Profile</h3>
                  <p className="text-[11px] text-white/45 mt-0.5">Authoritative registered business credentials for invoicing platform fees and commissions</p>
                </div>
                <Badge
                  variant="outline"
                  className={businessForm.verificationStatus === 'VERIFIED' ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}
                >
                  {businessForm.verificationStatus}
                </Badge>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Legal Business Name</label>
                  <Input
                    value={businessForm.legalName}
                    onChange={(e) => setBusinessForm({ ...businessForm, legalName: e.target.value })}
                    placeholder="e.g. AtlasBasket Technologies Private Limited"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Trade Name</label>
                  <Input
                    value={businessForm.tradeName}
                    onChange={(e) => setBusinessForm({ ...businessForm, tradeName: e.target.value })}
                    placeholder="e.g. AtlasBasket"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">GSTIN (15 characters)</label>
                  <Input
                    value={businessForm.gstin}
                    onChange={(e) => setBusinessForm({ ...businessForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 29AAAAA0000A1Z5"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">PAN Reference</label>
                  <Input
                    value={businessForm.pan}
                    onChange={(e) => setBusinessForm({ ...businessForm, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. AAAAA0000A"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Registered State</label>
                  <Input
                    value={businessForm.state}
                    onChange={(e) => setBusinessForm({ ...businessForm, state: e.target.value })}
                    placeholder="Karnataka"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">State Code (2 digits)</label>
                  <Input
                    value={businessForm.stateCode}
                    onChange={(e) => setBusinessForm({ ...businessForm, stateCode: e.target.value })}
                    placeholder="29"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Principal Place of Business Address</label>
                  <Input
                    value={businessForm.registeredAddress}
                    onChange={(e) => setBusinessForm({ ...businessForm, registeredAddress: e.target.value })}
                    placeholder="Full registered office address"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Authorized Signatory Name</label>
                  <Input
                    value={businessForm.authorizedSignatoryName}
                    onChange={(e) => setBusinessForm({ ...businessForm, authorizedSignatoryName: e.target.value })}
                    placeholder="Director / Legal Officer"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Authorized Signatory Designation</label>
                  <Input
                    value={businessForm.authorizedSignatoryDesignation}
                    onChange={(e) => setBusinessForm({ ...businessForm, authorizedSignatoryDesignation: e.target.value })}
                    placeholder="Managing Director"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-white/5">
                <Button
                  type="submit"
                  size="sm"
                  isLoading={updateBusiness.isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-6 rounded-xl"
                >
                  Save Business GST Registration
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* TAB C: PRODUCT GST & HSN MASTER */}
        {activeGstTab === 'hsn' && (
          <div className="space-y-6">
            {/* Create HSN Rate Form */}
            <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl p-5">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Register New HSN Classification</h3>
              <form onSubmit={handleHsnSubmit} className="grid sm:grid-cols-4 gap-3 pt-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">HSN Code *</label>
                  <Input
                    value={newHsn.hsnCode}
                    onChange={(e) => setNewHsn({ ...newHsn, hsnCode: e.target.value })}
                    placeholder="e.g. 4820"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">Product Description *</label>
                  <Input
                    value={newHsn.description}
                    onChange={(e) => setNewHsn({ ...newHsn, description: e.target.value })}
                    placeholder="e.g. Notebooks, registers and stationery items"
                    className="h-9 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">GST Rate (%) *</label>
                  <select
                    value={newHsn.gstRate}
                    onChange={(e) => setNewHsn({ ...newHsn, gstRate: e.target.value })}
                    className="w-full h-9 text-xs rounded-xl bg-[#14141e] border border-white/10 text-white px-2.5 outline-none focus:border-emerald-500"
                  >
                    <option value="0">0% (Nil / Exempt)</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>

                <div className="sm:col-span-4 flex justify-end pt-2">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={createHsn.isPending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 px-5 rounded-xl"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add HSN Classification
                  </Button>
                </div>
              </form>
            </Card>

            {/* HSN Table */}
            <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Central HSN Classification Master</h3>
                  <p className="text-[11px] text-white/40">Authoritative tax rates linked to product catalogue</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                  <Input
                    value={hsnSearch}
                    onChange={(e) => setHsnSearch(e.target.value)}
                    placeholder="Search by HSN or product..."
                    className="pl-8 h-8 text-xs rounded-xl bg-white/[0.02] border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01] text-[10px] uppercase font-bold text-white/40">
                      <th className="py-2.5 px-4">HSN Code</th>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-right">Applicable Rate</th>
                      <th className="py-2.5 px-4 text-center">Intra-State Split</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredHsn.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">{item.hsnCode}</td>
                        <td className="py-3 px-4 text-white/80 max-w-md truncate">{item.description}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[9px]">
                            {item.taxCategory}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">{Number(item.gstRate)}%</td>
                        <td className="py-3 px-4 text-center text-[10px] text-white/50 font-mono">
                          {Number(item.gstRate) > 0 ? `${Number(item.gstRate) / 2}% CGST + ${Number(item.gstRate) / 2}% SGST` : 'Nil / Exempt'}
                        </td>
                      </tr>
                    ))}
                    {filteredHsn.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-white/40 text-xs">
                          No HSN codes found matching "{hsnSearch}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* TAB D: SERVICES & SAC RULES */}
        {activeGstTab === 'services' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl p-5 space-y-4">
              <div className="pb-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Platform Fee Service Tax (SAC 998319)</h3>
                <p className="text-[11px] text-white/45 mt-0.5">Services provided by AtlasBasket to buyers at checkout</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/60">Service Accounting Code (SAC):</span>
                  <span className="font-mono font-bold text-white">{masterConfig.defaultPlatformFeeSac || '998319'}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/60">Applicable GST Rate:</span>
                  <span className="font-bold text-emerald-400">{Number(masterConfig.platformFeeGstRate || 18)}%</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/60">Tax Calculation Mode:</span>
                  <Badge variant="outline" className="text-[9px]">{masterConfig.platformFeeTaxMode || 'EXCLUSIVE'}</Badge>
                </div>
              </div>
            </Card>

            <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl p-5 space-y-4">
              <div className="pb-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-white">Seller Commission Tax (SAC 996111)</h3>
                <p className="text-[11px] text-white/45 mt-0.5">Marketplace facilitation services supplied by AtlasBasket to sellers</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/60">Service Accounting Code (SAC):</span>
                  <span className="font-mono font-bold text-white">{masterConfig.defaultCommissionSac || '996111'}</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/60">Applicable GST Rate on Commission:</span>
                  <span className="font-bold text-emerald-400">{Number(masterConfig.commissionGstRate || 18)}%</span>
                </div>
                <div className="flex justify-between items-center text-xs p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-white/60">Invoicing Sequence:</span>
                  <span className="font-mono text-white/80">{masterConfig.invoicePrefixPlatform || 'INV-AB-'}YYYY-XXXX</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* TAB E: E-COMMERCE OPERATOR TCS UNDER SECTION 52 */}
        {activeGstTab === 'tcs' && (
          <div className="space-y-6">
            <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white">Tax Collection at Source (TCS) — Section 52 of CGST Act</h3>
                  <p className="text-[11px] text-white/45 mt-0.5">
                    Statutory obligation on e-commerce operators collecting payment for taxable supplies by other suppliers
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                  NOTIFIED RATE: 0.5% (EFFECTIVE JULY 2024)
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">Intra-State CGST TCS</p>
                  <p className="text-base font-bold text-white">{Number(masterConfig.tcsIntraStateCgstRate || 0.25)}%</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Deducted from seller payout</p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">Intra-State SGST TCS</p>
                  <p className="text-base font-bold text-white">{Number(masterConfig.tcsIntraStateSgstRate || 0.25)}%</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Deducted from seller payout</p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">Inter-State IGST TCS</p>
                  <p className="text-base font-bold text-white">{Number(masterConfig.tcsInterStateIgstRate || 0.50)}%</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Deducted from seller payout</p>
                </div>

                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">Total Net Rate</p>
                  <p className="text-base font-bold text-emerald-400">0.50% Net</p>
                  <p className="text-[10px] text-white/40 mt-0.5">Reported on GSTR-8 return</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.01] border border-white/10 text-xs space-y-2">
                <div className="font-semibold text-white">TCS Ledger &amp; Return Metrics (GSTR-8 Ready)</div>
                <div className="grid sm:grid-cols-3 gap-4 pt-1">
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">Total Taxable Supply Processed</span>
                    <span className="font-bold text-white text-sm">₹{tcsSummary.totalTaxableSupply?.toLocaleString() || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">Total TCS Accrued</span>
                    <span className="font-bold text-emerald-400 text-sm">₹{tcsSummary.totalTcsAccrued?.toLocaleString() || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase">Pending Statutory Remittance</span>
                    <span className="font-bold text-amber-400 text-sm">₹{tcsSummary.pendingTcsRemittance?.toLocaleString() || '0.00'}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
