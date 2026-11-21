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
  History, Plus, Trash2, Edit3, Save, X, ExternalLink, ChevronDown
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

  // Form states for child entities
  const [showAddTownForm, setShowAddTownForm] = useState(false);
  const [newTownName, setNewTownName] = useState('');
  const [newTownDisplayName, setNewTownDisplayName] = useState('');

  const [showAddAreaForm, setShowAddAreaForm] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaPostalCodes, setNewAreaPostalCodes] = useState('');
  const [newAreaTownId, setNewAreaTownId] = useState('');

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
    queryKey: ['catalogue-areas', districtId, newAreaTownId],
    queryFn: () => cityApi.getCatalogueAreas(districtId!, { townId: newAreaTownId || undefined }),
    enabled: !!districtId && isOpen,
  });

  const district = data?.district;
  const overview = data?.overview;
  const isParentStateActive = data?.isParentStateActive ?? true;

  // Form state for General Settings
  const [generalForm, setGeneralForm] = useState<any>({});
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
      setGeneralForm({
        displayName: district.displayName || '',
        description: district.description || '',
        launchStatus: district.launchStatus || 'LAUNCHED',
        displayOrder: district.displayOrder || 0,
        maintenanceMode: district.maintenanceMode || false,
        isActive: district.isActive ?? true,
      });

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
      showToast('Town / City added', 'success');
      setNewTownName('');
      setNewTownDisplayName('');
      setShowAddTownForm(false);
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to add town', 'error')
  });

  const toggleTownMutation = useMutation({
    mutationFn: ({ townId, isActive }: { townId: string; isActive: boolean }) =>
      cityApi.updateCityTown(districtId!, townId, { isActive }),
    onSuccess: () => {
      showToast('Town status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update town', 'error')
  });

  const deleteTownMutation = useMutation({
    mutationFn: (townId: string) => cityApi.deleteCityTown(districtId!, townId),
    onSuccess: () => {
      showToast('Town deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to delete town', 'error')
  });

  // Area Mutations
  const addAreaMutation = useMutation({
    mutationFn: (payload: any) => cityApi.createServiceArea(districtId!, payload),
    onSuccess: () => {
      showToast('Service area created', 'success');
      setNewAreaName('');
      setNewAreaPostalCodes('');
      setNewAreaTownId('');
      setShowAddAreaForm(false);
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to add service area', 'error')
  });

  const toggleAreaMutation = useMutation({
    mutationFn: ({ areaId, isActive }: { areaId: string; isActive: boolean }) =>
      cityApi.updateServiceArea(districtId!, areaId, { isActive }),
    onSuccess: () => {
      showToast('Service area status updated', 'success');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to update service area', 'error')
  });

  const deleteAreaMutation = useMutation({
    mutationFn: (areaId: string) => cityApi.deleteServiceArea(districtId!, areaId),
    onSuccess: () => {
      showToast('Service area deleted', 'info');
      queryClient.invalidateQueries({ queryKey: ['district-details', districtId] });
    },
    onError: (err: any) => showToast(err.message || 'Failed to delete service area', 'error')
  });

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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Display Name</label>
                  <Input
                    value={generalForm.displayName}
                    onChange={(e) => setGeneralForm({ ...generalForm, displayName: e.target.value })}
                    placeholder="e.g. Mysuru Heritage Region"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Public Launch Status</label>
                  <select
                    value={generalForm.launchStatus}
                    onChange={(e) => setGeneralForm({ ...generalForm, launchStatus: e.target.value })}
                    className="w-full bg-[#14141f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="LAUNCHED">LAUNCHED (Fully Live)</option>
                    <option value="COMING_SOON">COMING_SOON (Show Coming Soon Screen)</option>
                    <option value="PLANNED">PLANNED (Internal Pre-Launch)</option>
                    <option value="MAINTENANCE">MAINTENANCE (Temporary Maintenance Mode)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Description</label>
                <textarea
                  value={generalForm.description}
                  onChange={(e) => setGeneralForm({ ...generalForm, description: e.target.value })}
                  placeholder="Operational notes or customer-facing description..."
                  className="w-full bg-[#14141f] border border-white/10 rounded-xl p-3 text-xs text-white outline-none min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div>
                    <span className="text-xs font-bold text-white block">District Operational Active</span>
                    <span className="text-[10px] text-white/40">Master switch for this district</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalForm.isActive}
                    onChange={(e) => setGeneralForm({ ...generalForm, isActive: e.target.checked })}
                    className="h-4 w-4 accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.01]">
                  <div>
                    <span className="text-xs font-bold text-white block">Maintenance Mode</span>
                    <span className="text-[10px] text-white/40">Shows temporary maintenance banner</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={generalForm.maintenanceMode}
                    onChange={(e) => setGeneralForm({ ...generalForm, maintenanceMode: e.target.checked })}
                    className="h-4 w-4 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  isLoading={updateGeneralMutation.isPending}
                  onClick={() => updateGeneralMutation.mutate(generalForm)}
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" /> Save General Settings
                </Button>
              </div>
            </div>
          )}

          {/* TAB 3: CITIES AND TOWNS */}
          {activeTab === 'towns' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Sub-Cities and Towns</h3>
                  <p className="text-[10px] text-white/40">Manage individual municipal subdivisions inside {district.name}</p>
                </div>
                <Button size="sm" onClick={() => setShowAddTownForm(!showAddTownForm)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Town / City
                </Button>
              </div>

              {showAddTownForm && (
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/40 uppercase block">
                      Select Town from Authoritative Catalogue
                    </span>
                    <Badge variant="outline" className="text-[9px]">Disabled by Default</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50 block font-medium">Catalogue Town / Municipal Area</label>
                      <select
                        value={newTownName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewTownName(val);
                          if (!newTownDisplayName || newTownDisplayName === newTownName) {
                            setNewTownDisplayName(val);
                          }
                        }}
                        className="w-full bg-[#14141f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="">-- Choose Catalogue Town --</option>
                        {(catalogueTownsData?.towns || []).map((t) => (
                          <option
                            key={t.name}
                            value={t.name}
                            disabled={t.isAlreadyAdded}
                            className={t.isAlreadyAdded ? "text-white/30 bg-[#0d0d12]" : "text-white bg-[#14141f]"}
                          >
                            {t.name} {t.isAlreadyAdded ? "(Already Added)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50 block font-medium">Display Name (Optional override)</label>
                      <Input
                        placeholder="e.g. Nanjangud"
                        value={newTownDisplayName}
                        onChange={(e) => setNewTownDisplayName(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40">
                    All new cities and towns are created in <strong>Disabled</strong> status by default to protect live operations until ready.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowAddTownForm(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!newTownName}
                      isLoading={addTownMutation.isPending}
                      onClick={() => addTownMutation.mutate({
                        name: newTownName,
                        displayName: newTownDisplayName || newTownName,
                        isActive: false,
                        launchStatus: "COMING_SOON"
                      })}
                    >
                      Save Town
                    </Button>
                  </div>
                </div>
              )}

              {district.cityTowns.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-xs text-white/40">
                  No sub-cities/towns mapped yet. All service areas in {district.name} operate at the district root.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {district.cityTowns.map((town: any) => (
                    <div key={town.id} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white block">{town.displayName || town.name}</span>
                        <span className="text-[9px] text-white/40">Canonical: {town.name} • {town.serviceAreas?.length || 0} areas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={town.isActive ? 'outline' : 'default'}
                          className="h-7 text-[9px] px-2"
                          onClick={() => toggleTownMutation.mutate({ townId: town.id, isActive: !town.isActive })}
                        >
                          {town.isActive ? 'Active' : 'Disabled'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                          onClick={() => deleteTownMutation.mutate(town.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SERVICE AREAS */}
          {activeTab === 'areas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-white">Service Areas & Postal Codes</h3>
                  <p className="text-[10px] text-white/40">Fine-grained coverage zones and eligible PIN codes</p>
                </div>
                <Button size="sm" onClick={() => setShowAddAreaForm(!showAddAreaForm)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Service Area
                </Button>
              </div>

              {showAddAreaForm && (
                <div className="p-4 rounded-xl border border-white/10 bg-white/[0.02] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/40 uppercase block">
                      Select Service Area from Authoritative Catalogue
                    </span>
                    <Badge variant="outline" className="text-[9px]">Disabled by Default</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50 block font-medium">Filter by Town (Optional)</label>
                      <select
                        value={newAreaTownId}
                        onChange={(e) => {
                          setNewAreaTownId(e.target.value);
                          setNewAreaName('');
                          setNewAreaPostalCodes('');
                        }}
                        className="w-full bg-[#14141f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="">All District Catalogue Areas</option>
                        {district.cityTowns.map((t: any) => (
                          <option key={t.id} value={t.id}>{t.displayName || t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50 block font-medium">Catalogue Area Name</label>
                      <select
                        value={newAreaName}
                        onChange={(e) => {
                          const selectedName = e.target.value;
                          setNewAreaName(selectedName);
                          const matched = catalogueAreasData?.areas?.find((a: any) => a.name === selectedName);
                          if (matched && matched.postalCodes?.length) {
                            setNewAreaPostalCodes(matched.postalCodes.join(', '));
                          }
                        }}
                        className="w-full bg-[#14141f] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="">-- Choose Catalogue Area --</option>
                        {(catalogueAreasData?.areas || []).map((a: any) => (
                          <option
                            key={a.name}
                            value={a.name}
                            disabled={a.isAlreadyAdded}
                            className={a.isAlreadyAdded ? "text-white/30 bg-[#0d0d12]" : "text-white bg-[#14141f]"}
                          >
                            {a.name} ({a.cityTown}) {a.isAlreadyAdded ? "(Already Added)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-white/50 block font-medium">Auto-Populated PIN Code(s)</label>
                      <Input
                        placeholder="PIN codes auto-fill here"
                        value={newAreaPostalCodes}
                        onChange={(e) => setNewAreaPostalCodes(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-white/40">
                    All new service areas default to <strong>Disabled</strong> and unserviceable until activated.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setShowAddAreaForm(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!newAreaName}
                      isLoading={addAreaMutation.isPending}
                      onClick={() => addAreaMutation.mutate({
                        name: newAreaName,
                        postalCodes: newAreaPostalCodes,
                        cityTownId: newAreaTownId || undefined,
                        isActive: false,
                        deliveryEligible: false
                      })}
                    >
                      Save Area
                    </Button>
                  </div>
                </div>
              )}

              {district.serviceAreas.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-white/10 rounded-xl text-xs text-white/40">
                  No explicit service areas configured. Entire district follows the master district availability rule.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {district.serviceAreas.map((area: any) => (
                    <div key={area.id} className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-bold text-white block">{area.name}</span>
                          <span className="text-[9px] text-white/40">
                            Town: {area.cityTown?.name || 'District Root'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant={area.isActive ? 'outline' : 'default'}
                            className="h-7 text-[9px] px-2"
                            onClick={() => toggleAreaMutation.mutate({ areaId: area.id, isActive: !area.isActive })}
                          >
                            {area.isActive ? 'Active' : 'Disabled'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                            onClick={() => deleteAreaMutation.mutate(area.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(area.postalCodes || []).map((pin: string) => (
                          <span key={pin} className="px-1.5 py-0.5 rounded-md bg-white/5 text-[9px] font-mono text-white/60">
                            {pin}
                          </span>
                        ))}
                        {(!area.postalCodes || area.postalCodes.length === 0) && (
                          <span className="text-[9px] text-white/30 italic">All district PIN codes</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
    </Dialog>
  );
}
