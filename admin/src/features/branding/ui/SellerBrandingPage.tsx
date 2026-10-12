"use client";

import React, { useEffect, useState } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAdminBranding, useUpdateBranding } from '@/lib/hooks/useBranding';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { ImageUploadField } from '@/shared/components/ImageUploadField';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Eye,
  Image as ImageIcon,
  Lock,
  Palette,
  Save,
  ShieldAlert,
  Store,
  RotateCcw,
  CheckCircle2,
  Globe,
  Sliders,
  Type,
  LayoutDashboard,
  Box,
  ShoppingBag,
  Settings,
  Mail,
  UserCheck,
  FileCheck
} from 'lucide-react';

interface SellerBrandingFormState {
  brandName: string;
  sellerPortalTitle: string;
  shortName: string;
  tagline: string;
  sellerPortalTagline: string;
  brandDescription: string;
  logoUrl: string;
  logoPublicId: string;
  darkLogoUrl: string;
  darkLogoPublicId: string;
  lightLogoUrl: string;
  lightLogoPublicId: string;
  faviconUrl: string;
  faviconPublicId: string;
  browserTitle: string;
  seoTitle: string;
  seoDescription: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  supportPhone: string;
}

const EMPTY_SELLER_FORM: SellerBrandingFormState = {
  brandName: '',
  sellerPortalTitle: '',
  shortName: '',
  tagline: '',
  sellerPortalTagline: '',
  brandDescription: '',
  logoUrl: '',
  logoPublicId: '',
  darkLogoUrl: '',
  darkLogoPublicId: '',
  lightLogoUrl: '',
  lightLogoPublicId: '',
  faviconUrl: '',
  faviconPublicId: '',
  browserTitle: '',
  seoTitle: '',
  seoDescription: '',
  primaryColor: '#7C3AED',
  secondaryColor: '#4F46E5',
  supportEmail: '',
  supportPhone: '',
};

export function SellerBrandingPage() {
  const { can } = usePermissions();
  const { showToast } = useUIStore();
  const { branding, isLoading, refetch } = useAdminBranding('seller');
  const updateMutation = useUpdateBranding('seller');

  const canView = can('branding.view');
  const canManage = can('branding.manage');

  const [form, setForm] = useState<SellerBrandingFormState>(EMPTY_SELLER_FORM);
  const [hasChanges, setHasChanges] = useState(false);
  const [previewTab, setPreviewTab] = useState<'sidebar' | 'login'>('sidebar');

  useEffect(() => {
    if (!branding) return;

    const portalTitle = branding.sellerPortalTitle || branding.brandName || branding.name || '';
    const portalTagline = branding.sellerPortalTagline || branding.tagline || '';

    setForm({
      brandName: portalTitle,
      sellerPortalTitle: portalTitle,
      shortName: branding.shortName ?? 'Seller',
      tagline: portalTagline,
      sellerPortalTagline: portalTagline,
      brandDescription: branding.brandDescription ?? '',
      logoUrl: branding.sellerPortalLogoUrl || branding.logoUrl || branding.logo || '',
      logoPublicId: branding.sellerPortalLogoPublicId || branding.logoPublicId || '',
      darkLogoUrl: branding.darkLogoUrl ?? '',
      darkLogoPublicId: branding.darkLogoPublicId ?? '',
      lightLogoUrl: branding.lightLogoUrl ?? '',
      lightLogoPublicId: branding.lightLogoPublicId ?? '',
      faviconUrl: branding.faviconUrl ?? branding.favicon ?? '',
      faviconPublicId: branding.faviconPublicId ?? '',
      browserTitle: branding.browserTitle ?? portalTitle,
      seoTitle: branding.seoTitle ?? portalTitle,
      seoDescription: branding.seoDescription ?? '',
      primaryColor: branding.primaryColor ?? '#7C3AED',
      secondaryColor: branding.secondaryColor ?? '#4F46E5',
      supportEmail: branding.supportEmail ?? '',
      supportPhone: branding.supportPhone ?? '',
    });
    setHasChanges(false);
  }, [branding]);

  const update = (key: keyof SellerBrandingFormState) => (value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'brandName') next.sellerPortalTitle = value;
      if (key === 'sellerPortalTitle') next.brandName = value;
      if (key === 'tagline') next.sellerPortalTagline = value;
      if (key === 'sellerPortalTagline') next.tagline = value;
      return next;
    });
    setHasChanges(true);
  };

  const updateFields = (fields: Partial<SellerBrandingFormState>) => {
    setForm((current) => ({ ...current, ...fields }));
    setHasChanges(true);
  };

  const handleReset = () => {
    if (!branding) return;
    const portalTitle = branding.sellerPortalTitle || branding.brandName || branding.name || '';
    const portalTagline = branding.sellerPortalTagline || branding.tagline || '';

    setForm({
      brandName: portalTitle,
      sellerPortalTitle: portalTitle,
      shortName: branding.shortName ?? 'Seller',
      tagline: portalTagline,
      sellerPortalTagline: portalTagline,
      brandDescription: branding.brandDescription ?? '',
      logoUrl: branding.sellerPortalLogoUrl || branding.logoUrl || branding.logo || '',
      logoPublicId: branding.sellerPortalLogoPublicId || branding.logoPublicId || '',
      darkLogoUrl: branding.darkLogoUrl ?? '',
      darkLogoPublicId: branding.darkLogoPublicId ?? '',
      lightLogoUrl: branding.lightLogoUrl ?? '',
      lightLogoPublicId: branding.lightLogoPublicId ?? '',
      faviconUrl: branding.faviconUrl ?? branding.favicon ?? '',
      faviconPublicId: branding.faviconPublicId ?? '',
      browserTitle: branding.browserTitle ?? portalTitle,
      seoTitle: branding.seoTitle ?? portalTitle,
      seoDescription: branding.seoDescription ?? '',
      primaryColor: branding.primaryColor ?? '#7C3AED',
      secondaryColor: branding.secondaryColor ?? '#4F46E5',
      supportEmail: branding.supportEmail ?? '',
      supportPhone: branding.supportPhone ?? '',
    });
    setHasChanges(false);
    showToast('Unsaved changes discarded', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(form);
      setHasChanges(false);
      showToast('Seller portal branding saved successfully', 'success');
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to save seller branding. Please try again.';
      showToast(msg, 'error');
    }
  };

  if (!canView) {
    return <NoPermission title="Seller Branding" />;
  }

  const effectivePortalName = form.sellerPortalTitle || form.brandName || 'Sante Seller Portal';
  const effectivePortalTagline = form.sellerPortalTagline || form.tagline || 'Manage your storefront, products, and incoming orders.';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wider">
              Seller Scope
            </span>
            <span className="text-[11px] text-white/40">Dedicated Seller Portal Branding</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 mt-1">Seller Branding</h1>
          <p className="text-xs text-white/45 mt-0.5">
            Controls seller portal workspace name, sidebar logo, auth screen headers, theme colors, and portal metadata.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={updateMutation.isPending}
              className="border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          {!canManage && (
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <Lock className="h-3 w-3" /> View only
            </span>
          )}
          <Button
            type="submit"
            form="seller-branding-form"
            size="sm"
            disabled={!canManage || isLoading}
            isLoading={updateMutation.isPending}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-950/40"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {updateMutation.isPending ? 'Saving seller branding…' : 'Save Seller Branding'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form Columns */}
        <div className="lg:col-span-2 space-y-6">
          <form id="seller-branding-form" onSubmit={handleSubmit} className="space-y-6">
            {isLoading ? (
              <Card className="border border-white/5">
                <CardContent className="p-6 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-11 w-full" />
                  ))}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* 1. Seller Portal Identity */}
                <SectionCard
                  icon={Store}
                  title="Seller Portal Identity"
                  description="Portal name and tagline presented to vendors in their dashboard"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Seller Portal Name" hint="Appears in sidebar header and vendor auth screens">
                      <Input
                        value={form.sellerPortalTitle}
                        onChange={(e) => update('sellerPortalTitle')(e.target.value)}
                        placeholder="e.g. Sante Seller Portal"
                        required
                      />
                    </Field>
                    <Field label="Short Name / Mobile Initials" hint="Used for mobile badges and compact indicators">
                      <Input
                        value={form.shortName}
                        onChange={(e) => update('shortName')(e.target.value)}
                        placeholder="e.g. Seller"
                      />
                    </Field>
                  </div>
                  <Field label="Seller Portal Tagline" hint="Displayed under the portal title in the seller sidebar">
                    <Input
                      value={form.sellerPortalTagline}
                      onChange={(e) => update('sellerPortalTagline')(e.target.value)}
                      placeholder="e.g. Manage your storefront, products, and incoming orders."
                    />
                  </Field>
                  <Field label="Vendor Portal Welcome Message" hint="Displayed on seller login and registration screens">
                    <Input
                      value={form.brandDescription}
                      onChange={(e) => update('brandDescription')(e.target.value)}
                      placeholder="e.g. Merchant operating system for marketplace sellers."
                    />
                  </Field>
                </SectionCard>

                {/* 2. Seller Portal Logos & Assets */}
                <SectionCard
                  icon={ImageIcon}
                  title="Seller Portal Logos & Media Assets"
                  description="Logos and favicon specifically used by the seller application"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Primary Seller Portal Logo" hint="SVG, PNG, or WEBP displayed on seller sidebar and login">
                      <ImageUploadField
                        value={form.logoUrl}
                        folder="branding"
                        onChange={({ url, publicId }) =>
                          updateFields({ logoUrl: url, logoPublicId: publicId })
                        }
                        onRemove={() => updateFields({ logoUrl: '', logoPublicId: '' })}
                      />
                    </Field>

                    <Field label="Seller Portal Favicon" hint="Small icon appearing in seller browser tabs">
                      <ImageUploadField
                        value={form.faviconUrl}
                        folder="branding"
                        onChange={({ url, publicId }) =>
                          updateFields({ faviconUrl: url, faviconPublicId: publicId })
                        }
                        onRemove={() => updateFields({ faviconUrl: '', faviconPublicId: '' })}
                      />
                    </Field>

                    <Field label="Optional Dark Mode Logo" hint="Used in dark themes if different from primary logo">
                      <ImageUploadField
                        value={form.darkLogoUrl}
                        folder="branding"
                        onChange={({ url, publicId }) =>
                          updateFields({ darkLogoUrl: url, darkLogoPublicId: publicId })
                        }
                        onRemove={() => updateFields({ darkLogoUrl: '', darkLogoPublicId: '' })}
                      />
                    </Field>

                    <Field label="Optional Light Mode Logo" hint="Used in light backgrounds if different from primary logo">
                      <ImageUploadField
                        value={form.lightLogoUrl}
                        folder="branding"
                        onChange={({ url, publicId }) =>
                          updateFields({ lightLogoUrl: url, lightLogoPublicId: publicId })
                        }
                        onRemove={() => updateFields({ lightLogoUrl: '', lightLogoPublicId: '' })}
                      />
                    </Field>
                  </div>
                </SectionCard>

                {/* 3. Seller Portal Brand Colors */}
                <SectionCard
                  icon={Palette}
                  title="Seller Portal Brand Colors"
                  description="Theme colors applied to seller sidebar, buttons, and navigation badges"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Seller Primary Color" hint="Primary buttons, sidebar accents, and active tabs">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.primaryColor || '#7C3AED'}
                          onChange={(e) => update('primaryColor')(e.target.value)}
                          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
                        />
                        <Input
                          value={form.primaryColor}
                          onChange={(e) => update('primaryColor')(e.target.value)}
                          placeholder="#7C3AED"
                          className="font-mono"
                        />
                      </div>
                    </Field>

                    <Field label="Seller Secondary Color" hint="Secondary badges, charts, and highlights">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.secondaryColor || '#4F46E5'}
                          onChange={(e) => update('secondaryColor')(e.target.value)}
                          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
                        />
                        <Input
                          value={form.secondaryColor}
                          onChange={(e) => update('secondaryColor')(e.target.value)}
                          placeholder="#4F46E5"
                          className="font-mono"
                        />
                      </div>
                    </Field>
                  </div>
                </SectionCard>

                {/* 4. Seller Application Page Title & SEO */}
                <SectionCard
                  icon={Globe}
                  title="Seller Application Page Title & Metadata"
                  description="Browser tab titles and descriptions for the seller workspace"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Seller Browser Title" hint="Shown in the browser tab title">
                      <Input
                        value={form.browserTitle}
                        onChange={(e) => update('browserTitle')(e.target.value)}
                        placeholder="e.g. Sante Seller Portal"
                      />
                    </Field>
                    <Field label="Seller SEO Title" hint="Rendered on public merchant portal pages">
                      <Input
                        value={form.seoTitle}
                        onChange={(e) => update('seoTitle')(e.target.value)}
                        placeholder="e.g. Sante Seller Portal — Merchant Center"
                      />
                    </Field>
                  </div>
                  <Field label="Seller SEO Description" hint="Search engine meta description for seller portal">
                    <Input
                      value={form.seoDescription}
                      onChange={(e) => update('seoDescription')(e.target.value)}
                      placeholder="Manage your shop, products, orders, and sales."
                    />
                  </Field>
                </SectionCard>

                {/* 5. Seller Support Contact */}
                <SectionCard
                  icon={Mail}
                  title="Vendor Support Contact"
                  description="Support email and hotline provided to sellers inside the portal"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Seller Support Email">
                      <Input
                        type="email"
                        value={form.supportEmail}
                        onChange={(e) => update('supportEmail')(e.target.value)}
                        placeholder="sellers@marketplace.com"
                      />
                    </Field>
                    <Field label="Seller Support Phone">
                      <Input
                        value={form.supportPhone}
                        onChange={(e) => update('supportPhone')(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                      />
                    </Field>
                  </div>
                </SectionCard>
              </div>
            )}
          </form>
        </div>

        {/* Live Seller Sidebar & Header Preview Pane */}
        <div className="space-y-6">
          <Card className="border border-white/10 bg-white/[0.01] sticky top-6">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-400" />
                  <CardTitle className="text-xs font-bold text-white/90">
                    Live Seller Preview
                  </CardTitle>
                </div>
                <div className="flex gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('sidebar')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                      previewTab === 'sidebar' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Sidebar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('login')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                      previewTab === 'login' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Login Screen
                  </button>
                </div>
              </div>
              <CardDescription className="text-[11px]">
                Real-time preview of how sellers experience your portal
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              {/* Browser Tab Preview */}
              <div className="rounded-lg border border-white/10 bg-[#0e0e13] p-2 flex items-center gap-2 text-[11px] text-white/70">
                <div className="h-4 w-4 rounded-sm bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  {form.faviconUrl ? (
                    <img src={form.faviconUrl} alt="Favicon" className="h-full w-full object-contain" />
                  ) : (
                    <Globe className="h-2.5 w-2.5 text-white/40" />
                  )}
                </div>
                <span className="truncate font-medium">{form.browserTitle || effectivePortalName}</span>
              </div>

              {previewTab === 'sidebar' && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                    Seller Sidebar Preview
                  </p>
                  <div className="rounded-xl border border-white/10 bg-[#07070a] shadow-inner overflow-hidden">
                    {/* Sidebar Brand Header */}
                    <div className="h-16 flex items-center px-4 border-b border-white/5 gap-3 bg-white/[0.01]">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 text-white overflow-hidden shrink-0 shadow-sm">
                        {form.logoUrl ? (
                          <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <Store className="h-4.5 w-4.5 text-purple-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs tracking-tight block truncate">
                          {effectivePortalName}
                        </span>
                        <span className="text-[9px] text-white/40 block font-medium truncate tracking-wide">
                          {effectivePortalTagline}
                        </span>
                      </div>
                    </div>

                    {/* Vendor Shop Indicator Badge (Separation Notice) */}
                    <div className="p-3 mx-3 my-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
                        <Store className="h-3 w-3 text-purple-300" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-white/80 block truncate">Individual Shop Name</span>
                        <span className="text-[8px] text-emerald-400 block font-mono">APPROVED</span>
                      </div>
                    </div>

                    {/* Mock Nav Items */}
                    <div className="p-2 space-y-1 text-[11px] text-white/60">
                      <div
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-white font-semibold"
                        style={{ backgroundColor: `${form.primaryColor || '#7C3AED'}25`, color: form.primaryColor || '#A78BFA' }}
                      >
                        <LayoutDashboard className="h-3.5 w-3.5" />
                        <span>Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/50 hover:bg-white/[0.02]">
                        <Box className="h-3.5 w-3.5" />
                        <span>Products</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/50 hover:bg-white/[0.02]">
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Orders</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-white/50 hover:bg-white/[0.02]">
                        <Settings className="h-3.5 w-3.5" />
                        <span>Shop Settings</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'login' && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">
                    Seller Auth Screen Preview
                  </p>
                  <div className="p-5 rounded-xl border border-white/10 bg-[#07070a] shadow-inner text-center space-y-3">
                    <div className="h-12 w-12 mx-auto rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center overflow-hidden">
                      {form.logoUrl ? (
                        <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <Store className="h-6 w-6 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-white tracking-tight">
                        {effectivePortalName}
                      </h4>
                      <p className="text-[9px] text-white/40 uppercase tracking-widest font-semibold mt-0.5">
                        {effectivePortalTagline}
                      </p>
                    </div>
                    <p className="text-[10px] text-white/50 max-w-xs mx-auto">
                      {form.brandDescription || 'Merchant operating system for marketplace sellers.'}
                    </p>
                    <div className="pt-2">
                      <span
                        className="inline-block px-4 py-1.5 text-[10px] font-bold rounded-lg text-white shadow-sm"
                        style={{ backgroundColor: form.primaryColor || '#7C3AED' }}
                      >
                        Sign In to Merchant Hub
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Independence Notice */}
              <div className="p-3 rounded-xl border border-purple-500/10 bg-purple-500/[0.02] space-y-1.5">
                <div className="flex items-center gap-2 text-purple-400 text-[11px] font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Independent Seller Scope</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Saving this page updates seller portal branding only. The customer storefront and individual sellers&apos; shop logos remain completely independent.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function NoPermission({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[55vh] animate-fade-up">
      <Card className="border border-white/10 w-full max-w-md">
        <CardContent className="py-14 flex flex-col items-center gap-3 text-center">
          <ShieldAlert className="h-9 w-9 text-white/20" />
          <p className="text-sm font-bold text-white/80">You don&apos;t have permission to view {title}.</p>
          <p className="text-[11px] text-white/40 max-w-xs">Contact a super admin if you believe this is a mistake.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-white/5">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-purple-400" />
          <CardTitle className="text-xs font-bold text-white/90">{title}</CardTitle>
        </div>
        <CardDescription className="text-[11px]">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">{children}</CardContent>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}
