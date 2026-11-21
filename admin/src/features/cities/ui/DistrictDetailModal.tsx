"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cityApi } from '../api/cityApi';
import { Dialog } from '@/shared/components/Dialog';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { ImageUploadField } from '@/shared/components/ImageUploadField';
import {
  MapPin, ShieldAlert, CheckCircle2, AlertTriangle, Building2,
  Users, Store, ShoppingBag, Settings, Truck, Rocket, MessageSquare,
  History, Plus, Trash2, Edit3, Save, X, ExternalLink, ChevronDown,
  Search, Check, SlidersHorizontal, ArrowRight, Eye, ShieldCheck,
  CheckCircle, XCircle, Filter
} from 'lucide-react';

interface DistrictDetailModalProps {
  districtId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DistrictDetailModal({ districtId, isOpen, onClose }: DistrictDetailModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [activeTab, setActiveTab] = useState<string>('overview');

  // --- Town State ---
  const [townSearch, setTownSearch] = useState('');
  const [townStatusFilter, setTownStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [showAddTownModal, setShowAddTownModal] = useState(false);
  const [catalogueTownSearch, setCatalogueTownSearch] = useState('');
  const [catalogueTownFilter, setCatalogueTownFilter] = useState<'AVAILABLE' | 'ALL' | 'MAPPED'>('AVAILABLE');
  const [selectedCatalogueTown, setSelectedCatalogueTown] = useState<any>(null);

  // --- Service Area State ---
  const [areaSearch, setAreaSearch] = useState('');
  const [areaTownFilter, setAreaTownFilter] = useState<string>('ALL');
  const [areaStatusFilter, setAreaStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [showAddAreaModal, setShowAddAreaModal] = useState(false);
  const [catalogueAreaSearch, setCatalogueAreaSearch] = useState('');
  const [catalogueAreaTownScope, setCatalogueAreaTownScope] = useState<string>('ALL');
  const [catalogueAreaFilter, setCatalogueAreaFilter] = useState<'AVAILABLE' | 'ALL' | 'MAPPED'>('AVAILABLE');
  const [selectedCatalogueArea, setSelectedCatalogueArea] = useState<any>(null);

  // Fetch full details
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['district-details', districtId],
    queryFn: () => cityApi.getDistrictDetails(districtId!),
    enabled: !!districtId && isOpen,
  });

  // Authoritative catalogue queries
  const { data: catalogueTownsData } = useQuery({
    queryKey: ['catalogue-towns', districtId],
    queryFn: () => cityApi.getCatalogueTowns(districtId!),
    enabled: !!districtId && isOpen,
  });

  const { data: catalogueAreasData } = useQuery({
    queryKey: ['catalogue-areas', districtId],
    queryFn: () => cityApi.getCatalogueAreas(districtId!),
    enabled: !!districtId && isOpen,
  });

  const district = data?.district;
  const overview = data?.overview;
  const isParentStateActive = data?.isParentStateActive ?? true;

  // Form state for Customer Settings
  const [customerForm, setCustomerForm] = useState<any>({});
  // Form state for Seller Settings
  const [sellerForm, setSellerForm] = useState<any>({});
  // Form state for Delivery Settings
  const [deliveryForm, setDeliveryForm] = useState<any>({});
  // Form state for Launch Config
  const [launchForm, setLaunchForm] = useState<any>({});

  // Sync state when data loads
  React.useEffect(() => {
    if (district) {

      setCustomerForm({
        isCustomerEnabled: district.isCustomerEnabled ?? true,
        allowCustomerBrowsing: district.allowCustomerBrowsing ?? true,
        allowCustomerOrdering: district.allowCustomerOrdering ?? true,
        customerNoticeMessage: district.customerNoticeMessage || '',
      });

      setSellerForm({
        isSellerEnabled: district.isSellerEnabled ?? true,
        allowSellerRegistration: district.allowSellerRegistration ?? true,
        allowShopCreation: district.allowShopCreation ?? true,
        sellerNoticeMessage: district.sellerNoticeMessage || '',
      });

      setDeliveryForm({
        isDeliveryEnabled: district.isDeliveryEnabled ?? true,
      });

      setLaunchForm({
        comingSoonMessage: district.comingSoonMessage || '',
        launchAnnouncement: district.launchAnnouncement || '',
        expectedLaunchDate: district.expectedLaunchDate ? district.expectedLaunchDate.split('T')[0] : '',
        bannerUrl: district.bannerUrl || '',
      });
    }
  }, [district]);

  // Mutations
  const updateGeneralMutation = useMutation({
    mutationFn: (payload: any) => cityApi.updateGeneralSettings(districtId!, payload),
    onSuccess: () => {
      showToast('General settings updated successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update settings', 'error')
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (payload: any) => cityApi.updateCustomerSettings(districtId!, payload),
    onSuccess: () => {
      showToast('Customer availability updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update customer settings', 'error')
  });

  const updateSellerMutation = useMutation({
    mutationFn: (payload: any) => cityApi.updateSellerSettings(districtId!, payload),
    onSuccess: () => {
      showToast('Seller availability updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update seller settings', 'error')
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: (payload: any) => cityApi.updateDeliverySettings(districtId!, payload),
    onSuccess: () => {
      showToast('Delivery settings updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update delivery settings', 'error')
  });

  const updateLaunchMutation = useMutation({
    mutationFn: (payload: any) => cityApi.updateLaunchConfig(districtId!, payload),
    onSuccess: () => {
      showToast('Launch configuration updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['cities'] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update launch config', 'error')
  });

  // Town Mutations
  const addTownMutation = useMutation({
    mutationFn: (payload: any) => cityApi.createCityTown(districtId!, payload),
    onSuccess: () => {
      showToast('Town mapped successfully (defaults to disabled)', 'success');
      setSelectedCatalogueTown(null);
      setShowAddTownModal(false);
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-towns', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to map town', 'error')
  });

  const toggleTownMutation = useMutation({
    mutationFn: ({ townId, isActive }: { townId: string; isActive: boolean }) =>
      cityApi.updateCityTown(districtId!, townId, { isActive }),
    onSuccess: () => {
      showToast('Town status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-towns', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update town', 'error')
  });

  const deleteTownMutation = useMutation({
    mutationFn: (townId: string) => cityApi.deleteCityTown(districtId!, townId),
    onSuccess: () => {
      showToast('Town unmapped', 'info');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-towns', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to delete town', 'error')
  });

  // Area Mutations
  const addAreaMutation = useMutation({
    mutationFn: (payload: any) => cityApi.createServiceArea(districtId!, payload),
    onSuccess: () => {
      showToast('Service area mapped successfully (defaults to disabled)', 'success');
      setSelectedCatalogueArea(null);
      setShowAddAreaModal(false);
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-areas', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to map service area', 'error')
  });

  const toggleAreaMutation = useMutation({
    mutationFn: ({ areaId, isActive, deliveryEligible }: { areaId: string; isActive: boolean; deliveryEligible?: boolean }) =>
      cityApi.updateServiceArea(districtId!, areaId, {
        isActive,
        deliveryEligible: deliveryEligible !== undefined ? deliveryEligible : isActive
      }),
    onSuccess: () => {
      showToast('Service area status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-areas', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update service area', 'error')
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (areaId: string) => cityApi.deleteServiceArea(districtId!, areaId),
    onSuccess: () => {
      showToast('Service area unmapped', 'info');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
      queryClient.invalidateQueries({ queryKey: ['catalogue-areas', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to delete service area', 'error')
  });

  const getTownEffectiveStatus = (town: any) => {
    if (!isParentStateActive) {
      return {
        label: 'Inherited Disabled (State Inactive)',
        variant: 'destructive' as const,
        description: `State "${district?.state}" is inactive`
      };
    }
    if (!district?.isActive) {
      return {
        label: 'Inherited Disabled (District Inactive)',
        variant: 'warning' as const,
        description: `District "${district?.name}" is inactive`
      };
    }
    if (!town.isActive) {
      return {
        label: 'Locally Disabled',
        variant: 'secondary' as const,
        description: 'Disabled at town level'
      };
    }
    return {
      label: 'Effectively Available',
      variant: 'success' as const,
      description: 'Active & serviceable'
    };
  };

  const getAreaEffectiveStatus = (area: any) => {
    if (!isParentStateActive) {
      return {
        label: 'Inherited Disabled (State)',
        variant: 'destructive' as const,
        description: `State "${district?.state}" is inactive`
      };
    }
    if (!district?.isActive) {
      return {
        label: 'Inherited Disabled (District)',
        variant: 'warning' as const,
        description: `District "${district?.name}" is inactive`
      };
    }
    if (area.cityTown && !area.cityTown.isActive) {
      return {
        label: 'Inherited Disabled (Town)',
        variant: 'warning' as const,
        description: `Town "${area.cityTown.displayName || area.cityTown.name}" is inactive`
      };
    }
    if (!area.isActive) {
      return {
        label: 'Locally Disabled',
        variant: 'secondary' as const,
        description: 'Disabled at area level'
      };
    }
    if (!area.deliveryEligible) {
      return {
        label: 'Delivery Ineligible',
        variant: 'warning' as const,
        description: 'Area active but delivery not eligible'
      };
    }
    return {
      label: 'Effectively Available',
      variant: 'success' as const,
      description: 'Active & delivery eligible'
    };
  };

  // Location Requests query
  const { data: requestsData, isLoading: isRequestsLoading } = useQuery({
    queryKey: ['district-requests', districtId],
    queryFn: () => cityApi.getDistrictRequests(districtId!),
    enabled: activeTab === 'requests' && !!districtId,
  });

  // Audit Logs query
  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['district-audit-logs', districtId],
    queryFn: () => cityApi.getDistrictAuditLogs(districtId!),
    enabled: activeTab === 'audit' && !!districtId,
  });

  // Update Request status mutation
  const updateRequestMutation = useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) =>
      cityApi.updateLocationRequest(id, { status, adminNotes }),
    onSuccess: () => {
      showToast('Request status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-requests', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update request', 'error')
  });

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'general', label: 'General Settings', icon: Settings },
    { id: 'towns', label: `Cities & Towns (${district?.cityTowns?.length || 0})`, icon: Building2 },
    { id: 'areas', label: `Service Areas (${district?.serviceAreas?.length || 0})`, icon: MapPin },
    { id: 'customer', label: 'Customer Availability', icon: Users },
    { id: 'seller', label: 'Seller Availability', icon: Store },
    { id: 'delivery', label: 'Delivery Settings', icon: Truck },
    { id: 'launch', label: 'Launch Configuration', icon: Rocket },
    { id: 'requests', label: 'Location Requests', icon: MessageSquare },
    { id: 'audit', label: 'Activity & Audit', icon: History },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-[960px]"
      title={
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {district?.displayName || district?.name || 'District Management'}
            </h2>
            <p className="text-[10px] text-white/45">
              {district?.state} State • Single Source of Truth District Control
            </p>
          </div>
        </div>
      }
    >
      {isLoading ? (
        <div className="space-y-4 py-8">
          <Skeleton className="h-8 w-1/3" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : !district ? (
        <div className="text-center py-12 text-xs text-white/40">District not found.</div>
      ) : (
        <div className="space-y-5">
          {/* Parent State Inheritance Warning */}
          {!isParentStateActive && (
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <span className="font-bold block text-white">Inherited Availability Blocked by Parent State</span>
                <span className="text-white/70 text-[11px] leading-relaxed">
                  The parent state <strong>"{district.state}"</strong> is currently deactivated in the States configuration.
                  All child districts, cities, and service areas inside this state are automatically unserviceable to customers and sellers regardless of local switches.
                </span>
              </div>
            </div>
          )}

          {/* Responsive Navigation Tabs with Overflow Prevention */}
          {/* Mobile Dropdown View */}
          <div className="block md:hidden pb-1 border-b border-white/10">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block mb-1">
              Configuration Section
            </label>
            <div className="relative">
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
                className="w-full bg-[#14141f] border border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none cursor-pointer appearance-none"
              >
                {tabs.map((tab) => (
                  <option key={tab.id} value={tab.id} className="bg-[#14141f] text-white">
                    {tab.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-white/40 pointer-events-none" />
            </div>
          </div>

          {/* Desktop Responsive Scrollable Sticky Tabs */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-white/10 scrollbar-none sticky top-0 bg-[#0d0d12]/95 backdrop-blur-md z-10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-xs'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Inherited Status Banner */}
              <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider block">Authoritative Availability Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-extrabold text-white">
                      {overview?.effectiveStatus === 'ENABLED'
                        ? 'Operational & Serviceable'
                        : overview?.effectiveStatus === 'DISABLED_BY_STATE'
                        ? 'Disabled by Parent State'
                        : overview?.effectiveStatus === 'DISABLED_BY_DISTRICT'
                        ? 'Disabled at District Level'
                        : overview?.effectiveStatus === 'MAINTENANCE'
                        ? 'Under Maintenance'
                        : `Launch Status: ${overview?.effectiveStatus}`}
                    </span>
                    <Badge
                      variant={
                        overview?.effectiveStatus === 'ENABLED'
                          ? 'success'
                          : overview?.effectiveStatus === 'MAINTENANCE'
                          ? 'warning'
                          : 'secondary'
                      }
                      className="text-[9px]"
                    >
                      {overview?.effectiveStatus}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-white/40 block">Canonical Name</span>
                  <span className="text-xs font-mono font-bold text-white/80">{district.name}</span>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Towns/Cities</span>
                  <span className="text-lg font-black text-white mt-1 block">
                    {overview?.activeTownsCount} / {overview?.townsCount}
                  </span>
                  <span className="text-[9px] text-white/40">Active / Total</span>
                </div>
                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Service Areas</span>
                  <span className="text-lg font-black text-white mt-1 block">
                    {overview?.activeServiceAreasCount} / {overview?.serviceAreasCount}
                  </span>
                  <span className="text-[9px] text-white/40">Active / Total</span>
                </div>
                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Customers</span>
                  <span className="text-lg font-black text-emerald-400 mt-1 block">{overview?.customerCount}</span>
                  <span className="text-[9px] text-white/40">Addresses mapped</span>
                </div>
                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Sellers</span>
                  <span className="text-lg font-black text-amber-400 mt-1 block">{overview?.sellerCount}</span>
                  <span className="text-[9px] text-white/40">Registered</span>
                </div>
                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Active Shops</span>
                  <span className="text-lg font-black text-purple-400 mt-1 block">{overview?.activeShopsCount}</span>
                  <span className="text-[9px] text-white/40">Approved pickup</span>
                </div>
                <div className="p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] font-bold text-white/40 uppercase block">Requests</span>
                  <span className="text-lg font-black text-blue-400 mt-1 block">{overview?.requestsCount}</span>
                  <span className="text-[9px] text-white/40">Launch interest</span>
                </div>
              </div>

              {/* District Overview Details */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] space-y-2 text-xs">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Description & Notices</span>
                <p className="text-white/70 leading-relaxed">
                  {district.description || 'No custom description provided for this district.'}
                </p>
                {district.customerNoticeMessage && (
                  <p className="text-amber-300/80 text-[11px] bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    <strong>Customer Notice:</strong> {district.customerNoticeMessage}
                  </p>
                )}
                {district.sellerNoticeMessage && (
                  <p className="text-purple-300/80 text-[11px] bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                    <strong>Seller Notice:</strong> {district.sellerNoticeMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">District Operational Status</h3>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Single source of truth activation control for {district.name}.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">District Name</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{district.name}</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Parent State</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">{district.state}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Current Status</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={district.isActive ? 'success' : 'secondary'} className="text-[10px] font-bold">
                        {district.isActive ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {!isParentStateActive && (
                        <Badge variant="warning" className="text-[9px] font-bold">
                          Unavailable: State is Disabled
                        </Badge>
                      )}
                    </div>
                    {!isParentStateActive && (
                      <p className="text-[10px] text-amber-300/80 mt-1">
                        Parent state "{district.state}" is deactivated. Enabling this district will not make it serviceable until the state is enabled.
                      </p>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={district.isActive ? 'outline' : 'default'}
                    className="text-xs font-bold px-4 h-9"
                    isLoading={updateGeneralMutation.isPending}
                    onClick={() => {
                      if (district.isActive) {
                        if (window.confirm(`Are you sure you want to disable district "${district.name}"? This will make this district and all child locations unavailable.`)) {
                          updateGeneralMutation.mutate({ isActive: false });
                        }
                      } else {
                        updateGeneralMutation.mutate({ isActive: true });
                      }
                    }}
                  >
                    {district.isActive ? 'Disable District' : 'Enable District'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CITIES AND TOWNS */}
          {activeTab === 'towns' && (
            <div className="space-y-4">
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Cities & Towns</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {(district.cityTowns || []).length} Mapped
                    </Badge>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Municipal subdivisions within {district.name}.
                  </p>
                </div>
                <Button size="sm" onClick={() => {
                  setSelectedCatalogueTown(null);
                  setShowAddTownModal(true);
                }}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Map Town from Catalogue
                </Button>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search mapped towns..."
                    value={townSearch}
                    onChange={(e) => setTownSearch(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/20 transition-all"
                  />
                  {townSearch && (
                    <button onClick={() => setTownSearch('')} className="absolute right-2.5 top-2 text-white/40 hover:text-white text-xs">✕</button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                  {(['ALL', 'ACTIVE', 'DISABLED'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setTownStatusFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        townStatusFilter === filter
                          ? 'bg-white/15 text-white border border-white/20'
                          : 'bg-white/[0.02] text-white/40 hover:text-white/80 border border-white/5'
                      }`}
                    >
                      {filter === 'ALL' ? `All (${(district.cityTowns || []).length})` :
                       filter === 'ACTIVE' ? `Active (${(district.cityTowns || []).filter((t: any) => t.isActive).length})` :
                       `Disabled (${(district.cityTowns || []).filter((t: any) => !t.isActive).length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mapped Towns Cards Grid */}
              {(() => {
                const mappedTowns = (district.cityTowns || []).filter((town: any) => {
                  const matchesSearch = !townSearch.trim() ||
                    (town.displayName || '').toLowerCase().includes(townSearch.toLowerCase()) ||
                    town.name.toLowerCase().includes(townSearch.toLowerCase());
                  const matchesStatus =
                    townStatusFilter === 'ALL' ? true :
                    townStatusFilter === 'ACTIVE' ? town.isActive :
                    !town.isActive;
                  return matchesSearch && matchesStatus;
                });

                if (mappedTowns.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] space-y-2">
                      <Building2 className="h-8 w-8 text-white/20 mx-auto" />
                      <p className="text-xs font-bold text-white/70">No towns match your criteria</p>
                      <p className="text-[10px] text-white/40 max-w-sm mx-auto">
                        {townSearch.trim() || townStatusFilter !== 'ALL'
                          ? 'Try adjusting your search query or status filter.'
                          : `No sub-cities/towns mapped yet. All service areas in ${district.name} currently operate at the district root.`}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mappedTowns.map((town: any) => {
                      const isUnavailableFromParent = !isParentStateActive || !district.isActive;
                      return (
                        <div
                          key={town.id}
                          className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-white block">
                              {town.name}
                            </span>
                            <span className="text-[10px] text-white/40 block">
                              District: {district.name}
                            </span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <Badge variant={town.isActive ? 'success' : 'secondary'} className="text-[9px] font-bold">
                                {town.isActive ? 'Enabled' : 'Disabled'}
                              </Badge>
                              {isUnavailableFromParent && (
                                <Badge variant="warning" className="text-[8px] font-bold">
                                  {!isParentStateActive ? 'Unavailable: State Disabled' : 'Unavailable: District Disabled'}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={town.isActive ? 'outline' : 'default'}
                              className="h-8 text-[10px] font-bold px-3"
                              isLoading={toggleTownMutation.isPending && (toggleTownMutation.variables as any)?.townId === town.id}
                              onClick={() => {
                                if (town.isActive) {
                                  if (window.confirm(`Are you sure you want to disable town "${town.name}"? Customers will not be able to order in this town.`)) {
                                    toggleTownMutation.mutate({ townId: town.id, isActive: false });
                                  }
                                } else {
                                  toggleTownMutation.mutate({ townId: town.id, isActive: true });
                                }
                              }}
                            >
                              {town.isActive ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 shrink-0"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete town "${town.name}"?`)) {
                                  deleteTownMutation.mutate(town.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 4: SERVICE AREAS */}
          {activeTab === 'areas' && (
            <div className="space-y-4">
              {/* Header and Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Service Areas</h3>
                    <Badge variant="outline" className="text-[10px]">
                      {(district.serviceAreas || []).length} Configured
                    </Badge>
                  </div>
                  <p className="text-[10px] text-white/40 mt-0.5">
                    Coverage localities and PIN codes within {district.name}.
                  </p>
                </div>
                <Button size="sm" onClick={() => {
                  setSelectedCatalogueArea(null);
                  setShowAddAreaModal(true);
                }}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Map Service Area from Catalogue
                </Button>
              </div>

              {/* Search & Filter Controls */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search areas by name or PIN code..."
                      value={areaSearch}
                      onChange={(e) => setAreaSearch(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/20 transition-all"
                    />
                    {areaSearch && (
                      <button onClick={() => setAreaSearch('')} className="absolute right-2.5 top-2 text-white/40 hover:text-white text-xs">✕</button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                    {(['ALL', 'ACTIVE', 'DISABLED'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setAreaStatusFilter(filter)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          areaStatusFilter === filter
                            ? 'bg-white/15 text-white border border-white/20'
                            : 'bg-white/[0.02] text-white/40 hover:text-white/80 border border-white/5'
                        }`}
                      >
                        {filter === 'ALL' ? `All (${(district.serviceAreas || []).length})` :
                         filter === 'ACTIVE' ? `Active (${(district.serviceAreas || []).filter((a: any) => a.isActive).length})` :
                         `Disabled (${(district.serviceAreas || []).filter((a: any) => !a.isActive).length})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Town Filter Pills */}
                {(district.cityTowns || []).length > 0 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider shrink-0 mr-1">
                      Town:
                    </span>
                    <button
                      onClick={() => setAreaTownFilter('ALL')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition-all ${
                        areaTownFilter === 'ALL'
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-white/40 hover:text-white/70'
                      }`}
                    >
                      All Towns
                    </button>
                    <button
                      onClick={() => setAreaTownFilter('ROOT')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition-all ${
                        areaTownFilter === 'ROOT'
                          ? 'bg-white/20 text-white'
                          : 'bg-white/5 text-white/40 hover:text-white/70'
                      }`}
                    >
                      District Root
                    </button>
                    {district.cityTowns.map((t: any) => (
                      <button
                        key={t.id}
                        onClick={() => setAreaTownFilter(t.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition-all ${
                          areaTownFilter === t.id
                            ? 'bg-white/20 text-white'
                            : 'bg-white/5 text-white/40 hover:text-white/70'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mapped Service Areas Cards Grid */}
              {(() => {
                const mappedAreas = (district.serviceAreas || []).filter((area: any) => {
                  const matchesSearch = !areaSearch.trim() ||
                    area.name.toLowerCase().includes(areaSearch.toLowerCase()) ||
                    (area.postalCodes || []).some((p: string) => p.includes(areaSearch.trim()));
                  const matchesTown =
                    areaTownFilter === 'ALL' ? true :
                    areaTownFilter === 'ROOT' ? !area.cityTownId :
                    area.cityTownId === areaTownFilter;
                  const matchesStatus =
                    areaStatusFilter === 'ALL' ? true :
                    areaStatusFilter === 'ACTIVE' ? area.isActive :
                    !area.isActive;
                  return matchesSearch && matchesTown && matchesStatus;
                });

                if (mappedAreas.length === 0) {
                  return (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/[0.01] space-y-2">
                      <MapPin className="h-8 w-8 text-white/20 mx-auto" />
                      <p className="text-xs font-bold text-white/70">No service areas match your criteria</p>
                      <p className="text-[10px] text-white/40 max-w-sm mx-auto">
                        {areaSearch.trim() || areaTownFilter !== 'ALL' || areaStatusFilter !== 'ALL'
                          ? 'Try adjusting your search query or filters.'
                          : 'No explicit service areas configured. Entire district follows the master district availability rule.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mappedAreas.map((area: any) => {
                      const isUnavailableFromParent = !isParentStateActive || !district.isActive || (area.cityTown && !area.cityTown.isActive);
                      return (
                        <div
                          key={area.id}
                          className="p-4 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div className="space-y-1">
                            <span className="text-sm font-bold text-white block">
                              {area.name}
                            </span>
                            <span className="text-[10px] text-white/40 block">
                              Parent: {area.cityTown?.name || 'District Root'}
                            </span>
                            <div className="flex flex-wrap gap-1 py-0.5">
                              {(area.postalCodes || []).map((pin: string) => (
                                <span key={pin} className="px-1.5 py-0.2 rounded bg-white/5 font-mono text-[9px] text-white/70 border border-white/5">
                                  {pin}
                                </span>
                              ))}
                              {(!area.postalCodes || area.postalCodes.length === 0) && (
                                <span className="text-[9px] text-white/30 italic">All district PIN codes</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <Badge variant={area.isActive ? 'success' : 'secondary'} className="text-[9px] font-bold">
                                {area.isActive ? 'Enabled' : 'Disabled'}
                              </Badge>
                              {isUnavailableFromParent && (
                                <Badge variant="warning" className="text-[8px] font-bold">
                                  {!isParentStateActive ? 'Unavailable: State Disabled' :
                                   !district.isActive ? 'Unavailable: District Disabled' :
                                   'Unavailable: Town Disabled'}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={area.isActive ? 'outline' : 'default'}
                              className="h-8 text-[10px] font-bold px-3"
                              isLoading={toggleAreaMutation.isPending && (toggleAreaMutation.variables as any)?.areaId === area.id}
                              onClick={() => {
                                if (area.isActive) {
                                  if (window.confirm(`Are you sure you want to disable service area "${area.name}"? Delivery will be disabled for this area.`)) {
                                    toggleAreaMutation.mutate({ areaId: area.id, isActive: false, deliveryEligible: false });
                                  }
                                } else {
                                  toggleAreaMutation.mutate({ areaId: area.id, isActive: true, deliveryEligible: true });
                                }
                              }}
                            >
                              {area.isActive ? 'Disable' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 shrink-0"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete service area "${area.name}"?`)) {
                                  deleteAreaMutation.mutate(area.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: CUSTOMER AVAILABILITY */}
          {activeTab === 'customer' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div>
                    <span className="text-xs font-bold text-white block">Allow Customer Access</span>
                    <span className="text-[10px] text-white/40">Controls whether customers can select and view this district</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customerForm.isCustomerEnabled}
                    onChange={(e) => setCustomerForm({ ...customerForm, isCustomerEnabled: e.target.checked })}
                    className="h-4 w-4 accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div>
                    <span className="text-xs font-bold text-white block">Allow Product Browsing</span>
                    <span className="text-[10px] text-white/40">Customers can view catalog even if checkout is temporarily restricted</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customerForm.allowCustomerBrowsing}
                    onChange={(e) => setCustomerForm({ ...customerForm, allowCustomerBrowsing: e.target.checked })}
                    className="h-4 w-4 accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div>
                    <span className="text-xs font-bold text-white block">Allow Customer Ordering</span>
                    <span className="text-[10px] text-white/40">Permit checkout and order placement for delivery in this district</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={customerForm.allowCustomerOrdering}
                    onChange={(e) => setCustomerForm({ ...customerForm, allowCustomerOrdering: e.target.checked })}
                    className="h-4 w-4 accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Customer-Facing Temporary Notice / Closure Message
                </label>
                <textarea
                  value={customerForm.customerNoticeMessage}
                  onChange={(e) => setCustomerForm({ ...customerForm, customerNoticeMessage: e.target.value })}
                  placeholder="e.g. Due to regional festivities, standard delivery will resume on Tuesday..."
                  className="w-full bg-[#14141f] border border-white/10 rounded-xl p-3 text-xs text-white outline-none min-h-[70px]"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  isLoading={updateCustomerMutation.isPending}
                  onClick={() => updateCustomerMutation.mutate(customerForm)}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save Customer Settings
                </Button>
              </div>
            </div>
          )}

          {/* TAB 6: SELLER AVAILABILITY */}
          {activeTab === 'seller' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div>
                    <span className="text-xs font-bold text-white block">Seller Platform Access</span>
                    <span className="text-[10px] text-white/40">Enable seller operations and portal access in this district</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sellerForm.isSellerEnabled}
                    onChange={(e) => setSellerForm({ ...sellerForm, isSellerEnabled: e.target.checked })}
                    className="h-4 w-4 accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div>
                    <span className="text-xs font-bold text-white block">Allow New Seller Registrations</span>
                    <span className="text-[10px] text-white/40">Accept onboarding applications from merchants in this district</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sellerForm.allowSellerRegistration}
                    onChange={(e) => setSellerForm({ ...sellerForm, allowSellerRegistration: e.target.checked })}
                    className="h-4 w-4 accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div>
                    <span className="text-xs font-bold text-white block">Allow Shop Creation Requests</span>
                    <span className="text-[10px] text-white/40">Permit existing sellers to create new storefronts in this district</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sellerForm.allowShopCreation}
                    onChange={(e) => setSellerForm({ ...sellerForm, allowShopCreation: e.target.checked })}
                    className="h-4 w-4 accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-xs text-purple-200">
                <strong>Important:</strong> Serviceable location status does NOT automatically approve sellers or their storefronts.
                Admin review and agreement issuance remains strictly mandatory under platform onboarding rules.
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Seller-Facing Notice Message</label>
                <textarea
                  value={sellerForm.sellerNoticeMessage}
                  onChange={(e) => setSellerForm({ ...sellerForm, sellerNoticeMessage: e.target.value })}
                  placeholder="e.g. Courier pickup runs 3 times daily from central hub..."
                  className="w-full bg-[#14141f] border border-white/10 rounded-xl p-3 text-xs text-white outline-none min-h-[70px]"
                />
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  isLoading={updateSellerMutation.isPending}
                  onClick={() => updateSellerMutation.mutate(sellerForm)}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save Seller Settings
                </Button>
              </div>
            </div>
          )}

          {/* TAB 7: DELIVERY SETTINGS */}
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
                <div>
                  <span className="text-xs font-bold text-white block">Delivery Enabled</span>
                  <span className="text-[10px] text-white/40">Dispatch and rider routing enabled for this district</span>
                </div>
                <input
                  type="checkbox"
                  checked={deliveryForm.isDeliveryEnabled}
                  onChange={(e) => setDeliveryForm({ ...deliveryForm, isDeliveryEnabled: e.target.checked })}
                  className="h-4 w-4 accent-purple-500 cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.02] text-xs text-white/60 space-y-2">
                <span className="font-bold text-white block">Central Delivery Architecture Integration</span>
                <p className="leading-relaxed text-[11px]">
                  AtlasBasket delivery pricing, carrier splits, and dispatch algorithms operate centrally via the
                  <a href="/delivery" className="underline font-bold text-white hover:text-white/80 ml-1">Delivery Management Panel</a>.
                  Toggling delivery off here suppresses courier dispatch for orders originating or terminating in {district.name} without altering central delivery rates.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  isLoading={updateDeliveryMutation.isPending}
                  onClick={() => updateDeliveryMutation.mutate(deliveryForm)}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save Delivery Settings
                </Button>
              </div>
            </div>
          )}

          {/* TAB 8: LAUNCH CONFIGURATION */}
          {activeTab === 'launch' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Coming Soon Custom Message
                </label>
                <textarea
                  value={launchForm.comingSoonMessage}
                  onChange={(e) => setLaunchForm({ ...launchForm, comingSoonMessage: e.target.value })}
                  placeholder="e.g. AtlasBasket is arriving in Mysuru with 100+ local craft makers soon!"
                  className="w-full bg-[#14141f] border border-white/10 rounded-xl p-3 text-xs text-white outline-none min-h-[60px]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Launch Announcement Headline
                </label>
                <Input
                  value={launchForm.launchAnnouncement}
                  onChange={(e) => setLaunchForm({ ...launchForm, launchAnnouncement: e.target.value })}
                  placeholder="e.g. Launching November 2026 with free same-day regional delivery"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Expected Launch Date</label>
                  <Input
                    type="date"
                    value={launchForm.expectedLaunchDate}
                    onChange={(e) => setLaunchForm({ ...launchForm, expectedLaunchDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <ImageUploadField
                    value={launchForm.bannerUrl}
                    folder="district-banners"
                    label="District Launch Banner / Landmark"
                    hint="Cloudinary-backed banner displayed on the Coming Soon screen and regional landing pages"
                    onChange={(result) => setLaunchForm((prev: any) => ({ ...prev, bannerUrl: result.url }))}
                    onRemove={() => setLaunchForm((prev: any) => ({ ...prev, bannerUrl: '' }))}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  isLoading={updateLaunchMutation.isPending}
                  onClick={() => updateLaunchMutation.mutate(launchForm)}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save Launch Config
                </Button>
              </div>
            </div>
          )}

          {/* TAB 9: LOCATION REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Requests for {district.name}</h3>
                  <p className="text-[10px] text-white/40">Customer and seller launch interest submissions</p>
                </div>
                <span className="text-xs font-bold text-white/60">
                  {requestsData?.requests?.length || 0} Total
                </span>
              </div>

              {isRequestsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : (requestsData?.requests || []).length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-xs text-white/40">
                  No location requests submitted for this district yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {requestsData.requests.map((req: any) => (
                    <div key={req.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant={req.requestType === 'SELLER' ? 'warning' : 'default'} className="text-[8px]">
                            {req.requestType}
                          </Badge>
                          <span className="text-xs font-bold text-white">{req.name || req.email || 'Anonymous Guest'}</span>
                          <span className="text-[10px] text-white/40">{req.city || req.district}</span>
                        </div>
                        <div className="text-[10px] text-white/50 mt-1 flex items-center gap-3">
                          {req.email && <span>{req.email}</span>}
                          {req.phone && <span>{req.phone}</span>}
                          <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={req.status}
                          onChange={(e) => updateRequestMutation.mutate({ id: req.id, status: e.target.value })}
                          className="bg-[#14141f] border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white outline-none"
                        >
                          <option value="PENDING">PENDING</option>
                          <option value="REVIEWED">REVIEWED</option>
                          <option value="APPROVED_FOR_FUTURE">APPROVED_FOR_FUTURE</option>
                          <option value="REJECTED">REJECTED</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 10: ACTIVITY & AUDIT */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">District Audit Trail</h3>
                  <p className="text-[10px] text-white/40">Authoritative log of administrative modifications</p>
                </div>
              </div>

              {isAuditLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : (auditData?.logs || []).length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-xs text-white/40">
                  No administrative actions logged for this district yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                  {auditData.logs.map((log: any) => (
                    <div key={log.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.01] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white/90 text-[11px]">{log.action}</span>
                        <span className="text-[10px] text-white/40">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] text-white/50">
                        Admin: {log.adminName || log.adminEmail || log.adminId || 'System'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL 1: SEARCHABLE CATALOGUE TOWN SELECTION ─── */}
      <Dialog
        isOpen={showAddTownModal}
        onClose={() => {
          setShowAddTownModal(false);
          setSelectedCatalogueTown(null);
        }}
        maxWidth="max-w-xl"
        title={
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-purple-400" />
            <span>Map Town from Catalogue</span>
          </div>
        }
        description={`Select an official administrative subdivision for ${district?.name}. All new mappings default to Disabled.`}
      >
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
              <input
                type="text"
                placeholder="Search catalogue towns by name..."
                value={catalogueTownSearch}
                onChange={(e) => setCatalogueTownSearch(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/20 transition-all"
              />
              {catalogueTownSearch && (
                <button onClick={() => setCatalogueTownSearch('')} className="absolute right-2.5 top-2 text-white/40 hover:text-white text-xs">✕</button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {(['AVAILABLE', 'ALL', 'MAPPED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCatalogueTownFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    catalogueTownFilter === filter
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/50 hover:text-white'
                  }`}
                >
                  {filter === 'AVAILABLE' ? 'Available to Map' : filter === 'ALL' ? 'All Catalogue Records' : 'Already Mapped'}
                </button>
              ))}
            </div>
          </div>

          {/* Catalogue Cards Grid */}
          <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 scrollbar-none">
            {(() => {
              const items = (catalogueTownsData?.towns || []).filter((t: any) => {
                const matchesSearch = !catalogueTownSearch.trim() ||
                  t.name.toLowerCase().includes(catalogueTownSearch.toLowerCase());
                const matchesFilter =
                  catalogueTownFilter === 'ALL' ? true :
                  catalogueTownFilter === 'AVAILABLE' ? !t.isAlreadyAdded :
                  t.isAlreadyAdded;
                return matchesSearch && matchesFilter;
              });

              if (items.length === 0) {
                return (
                  <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-xs text-white/40">
                    No catalogue records found matching your query.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((t: any) => {
                    const isSelected = selectedCatalogueTown?.name === t.name;
                    return (
                      <div
                        key={t.name}
                        onClick={() => {
                          if (t.isAlreadyAdded) return;
                          setSelectedCatalogueTown(t);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          t.isAlreadyAdded
                            ? 'border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'border-purple-500 bg-purple-500/10 cursor-pointer ring-1 ring-purple-500/30'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold text-white block">{t.name}</span>
                          {t.isAlreadyAdded ? (
                            <Badge variant="secondary" className="text-[8px]">Already Mapped</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[8px] text-purple-300 border-purple-500/30">Available</Badge>
                          )}
                        </div>
                        <span className="text-[9px] text-white/40 block mt-1">
                          Parent District: {district?.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Selected Town Confirmation Details */}
          {selectedCatalogueTown && (
            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Selected Catalogue Town</span>
                <span className="text-sm font-bold text-white">{selectedCatalogueTown.name}</span>
                <span className="text-[10px] text-white/40 block">Parent: {district?.name}</span>
              </div>
              <Badge variant="secondary" className="text-[9px]">Disabled by Default</Badge>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddTownModal(false);
                setSelectedCatalogueTown(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedCatalogueTown || addTownMutation.isPending}
              isLoading={addTownMutation.isPending}
              onClick={() => {
                if (!selectedCatalogueTown) return;
                addTownMutation.mutate({
                  name: selectedCatalogueTown.name,
                  isActive: false,
                  launchStatus: 'COMING_SOON'
                });
              }}
            >
              Confirm & Map Town
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ─── MODAL 2: SEARCHABLE CATALOGUE SERVICE AREA SELECTION ─── */}
      <Dialog
        isOpen={showAddAreaModal}
        onClose={() => {
          setShowAddAreaModal(false);
          setSelectedCatalogueArea(null);
        }}
        maxWidth="max-w-2xl"
        title={
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-400" />
            <span>Map Service Area from Catalogue</span>
          </div>
        }
        description={`Select an official locality with validated postal PIN codes for ${district?.name}. Defaults to Disabled.`}
      >
        <div className="space-y-4">
          {/* Town Scope Filter and Search */}
          <div className="space-y-2">
            {(district?.cityTowns || []).length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider shrink-0 mr-1">
                  Catalogue Scope:
                </span>
                <button
                  onClick={() => setCatalogueAreaTownScope('ALL')}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition-all ${
                    catalogueAreaTownScope === 'ALL'
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/40 hover:text-white/70'
                  }`}
                >
                  All District Areas
                </button>
                {district.cityTowns.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setCatalogueAreaTownScope(t.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 transition-all ${
                      catalogueAreaTownScope === t.id
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search localities by name or PIN code..."
                  value={catalogueAreaSearch}
                  onChange={(e) => setCatalogueAreaSearch(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 outline-none focus:border-white/20 transition-all"
                />
                {catalogueAreaSearch && (
                  <button onClick={() => setCatalogueAreaSearch('')} className="absolute right-2.5 top-2 text-white/40 hover:text-white text-xs">✕</button>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {(['AVAILABLE', 'ALL', 'MAPPED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setCatalogueAreaFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      catalogueAreaFilter === filter
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/5 text-white/50 hover:text-white'
                    }`}
                  >
                    {filter === 'AVAILABLE' ? 'Available' : filter === 'ALL' ? 'All' : 'Mapped'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Catalogue Areas Grid */}
          <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 scrollbar-none">
            {(() => {
              const areas = (catalogueAreasData?.areas || []).filter((a: any) => {
                const matchesTownScope = catalogueAreaTownScope === 'ALL' ? true :
                  a.cityTown?.toLowerCase() === (district?.cityTowns || []).find((t: any) => t.id === catalogueAreaTownScope)?.name?.toLowerCase();
                const matchesSearch = !catalogueAreaSearch.trim() ||
                  a.name.toLowerCase().includes(catalogueAreaSearch.toLowerCase()) ||
                  (a.postalCodes || []).some((p: string) => p.includes(catalogueAreaSearch.trim()));
                const matchesFilter =
                  catalogueAreaFilter === 'ALL' ? true :
                  catalogueAreaFilter === 'AVAILABLE' ? !a.isAlreadyAdded :
                  a.isAlreadyAdded;
                return matchesTownScope && matchesSearch && matchesFilter;
              });

              if (areas.length === 0) {
                return (
                  <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-xs text-white/40">
                    No catalogue service areas found for this filter.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {areas.map((a: any) => {
                    const isSelected = selectedCatalogueArea?.name === a.name;
                    return (
                      <div
                        key={a.name}
                        onClick={() => {
                          if (a.isAlreadyAdded) return;
                          setSelectedCatalogueArea(a);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          a.isAlreadyAdded
                            ? 'border-white/5 bg-white/[0.01] opacity-50 cursor-not-allowed'
                            : isSelected
                            ? 'border-purple-500 bg-purple-500/10 cursor-pointer ring-1 ring-purple-500/30'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-bold text-white block">{a.name}</span>
                          {a.isAlreadyAdded ? (
                            <Badge variant="secondary" className="text-[8px]">Already Mapped</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[8px] text-purple-300 border-purple-500/30">Available</Badge>
                          )}
                        </div>
                        <span className="text-[9px] text-white/40 block mt-0.5">
                          Parent: {a.cityTown || 'District Root'}
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {(a.postalCodes || []).map((pin: string) => (
                            <span key={pin} className="px-1.5 py-0.2 rounded bg-white/5 font-mono text-[9px] text-white/70">
                              {pin}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Selected Service Area Confirmation Details */}
          {selectedCatalogueArea && (
            <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">Selected Service Area</span>
                  <span className="text-sm font-bold text-white">{selectedCatalogueArea.name}</span>
                </div>
                <Badge variant="secondary" className="text-[9px]">Disabled by Default</Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-white/60 pt-1 border-t border-white/5">
                <span>Parent: <strong className="text-white">{selectedCatalogueArea.cityTown || 'District Root'}</strong></span>
                <span>PIN(s): <strong className="text-white font-mono">{Array.isArray(selectedCatalogueArea.postalCodes) ? selectedCatalogueArea.postalCodes.join(', ') : selectedCatalogueArea.postalCodes}</strong></span>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddAreaModal(false);
                setSelectedCatalogueArea(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedCatalogueArea || addAreaMutation.isPending}
              isLoading={addAreaMutation.isPending}
              onClick={() => {
                if (!selectedCatalogueArea) return;
                const matchedTown = (district?.cityTowns || []).find(
                  (t: any) => t.name.toLowerCase() === selectedCatalogueArea.cityTown?.toLowerCase()
                );
                addAreaMutation.mutate({
                  name: selectedCatalogueArea.name,
                  cityTownId: matchedTown ? matchedTown.id : undefined,
                  postalCodes: Array.isArray(selectedCatalogueArea.postalCodes)
                    ? selectedCatalogueArea.postalCodes.join(', ')
                    : selectedCatalogueArea.postalCodes,
                  isActive: false,
                  deliveryEligible: false
                });
              }}
            >
              Confirm & Map Area
            </Button>
          </div>
        </div>
      </Dialog>
    </Dialog>
  );
}
