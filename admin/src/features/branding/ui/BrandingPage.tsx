"use client";

import React, { useEffect, useState } from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useAdminBranding, useUpdateBranding, useBranding } from '@/lib/hooks/useBranding';
import type { BrandingApp, BrandingConfig } from '@/lib/services/brandingService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { ImageUploadField, type UploadResult } from '@/shared/components/ImageUploadField';
import { useUIStore } from '@/lib/store/uiStore';
import { Eye, Image as ImageIcon, Lock, Monitor, Palette, Save, ShieldAlert, Store, ShoppingBag, LayoutTemplate, Shield, Check } from 'lucide-react';

interface BrandingFormState {
  brandName: string;
  shortName: string;
  tagline: string;
  brandDescription: string;
  logoUrl: string;
  logoPublicId: string;
  darkLogoUrl: string;
  darkLogoPublicId: string;
  lightLogoUrl: string;
  lightLogoPublicId: string;
  faviconUrl: string;
  faviconPublicId: string;
  customerTitle: string;
  sellerPortalTitle: string;
  sellerPortalTagline: string;
  sellerPortalLogoUrl: string;
  sellerPortalLogoPublicId: string;
  browserTitle: string;
  seoTitle: string;
  seoDescription: string;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  supportPhone: string;
  heroBadge: string;
  heroHeadingLine1: string;
  heroHeadingLine2: string;
  heroHeadingLine3: string;
  heroDescription: string;
  searchPlaceholder: string;
  exploreShopsButtonText: string;
  browseProductsButtonText: string;
  footerDescription: string;
}

const EMPTY_FORM: BrandingFormState = {
  brandName: '',
  shortName: '',
  tagline: '',
  brandDescription: '',
  logoUrl: '',
  logoPublicId: '',
  darkLogoUrl: '',
  darkLogoPublicId: '',
  lightLogoUrl: '',
  lightLogoPublicId: '',
  faviconUrl: '',
  faviconPublicId: '',
  customerTitle: '',
  sellerPortalTitle: '',
  sellerPortalTagline: '',
  sellerPortalLogoUrl: '',
  sellerPortalLogoPublicId: '',
  browserTitle: '',
  seoTitle: '',
  seoDescription: '',
  primaryColor: '#FF5722',
  secondaryColor: '#0EA5E9',
  supportEmail: '',
  supportPhone: '',
  heroBadge: '',
  heroHeadingLine1: '',
  heroHeadingLine2: '',
  heroHeadingLine3: '',
  heroDescription: '',
  searchPlaceholder: '',
  exploreShopsButtonText: '',
  browseProductsButtonText: '',
  footerDescription: '',
};

export function BrandingPage() {
  const { can } = usePermissions();
  const { showToast } = useUIStore();
  const { branding, isLoading } = useAdminBranding('customer');
  const { branding: customerBranding, isLoading: customerLoading } = useBranding('customer');
  const { branding: sellerBranding, isLoading: sellerLoading } = useBranding('seller');
  const updateMutation = useUpdateBranding('customer');

  const canView = can('branding.view');
  const canManage = can('branding.manage');

  const [form, setForm] = useState<BrandingFormState>(EMPTY_FORM);
  const [previewTab, setPreviewTab] = useState<'customer' | 'seller' | 'admin'>('seller');

  useEffect(() => {
    if (!branding) return;

    setForm({
      brandName: branding.brandName ?? branding.name ?? '',
      shortName: branding.shortName ?? '',
      tagline: branding.tagline ?? '',
      brandDescription: branding.brandDescription ?? '',
      logoUrl: branding.logoUrl ?? '',
      logoPublicId: branding.logoPublicId ?? '',
      darkLogoUrl: branding.darkLogoUrl ?? '',
      darkLogoPublicId: branding.darkLogoPublicId ?? '',
      lightLogoUrl: branding.lightLogoUrl ?? '',
      lightLogoPublicId: branding.lightLogoPublicId ?? '',
      faviconUrl: branding.faviconUrl ?? '',
      faviconPublicId: branding.faviconPublicId ?? '',
      customerTitle: branding.customerTitle ?? '',
      sellerPortalTitle: branding.sellerPortalTitle ?? '',
      sellerPortalTagline: branding.sellerPortalTagline ?? '',
      sellerPortalLogoUrl: branding.sellerPortalLogoUrl ?? '',
      sellerPortalLogoPublicId: branding.sellerPortalLogoPublicId ?? '',
      browserTitle: branding.browserTitle ?? '',
      seoTitle: branding.seoTitle ?? '',
      seoDescription: branding.seoDescription ?? '',
      primaryColor: branding.primaryColor ?? '#FF5722',
      secondaryColor: branding.secondaryColor ?? '#0EA5E9',
      supportEmail: branding.supportEmail ?? '',
      supportPhone: branding.supportPhone ?? '',
      heroBadge: branding.heroBadge ?? '',
      heroHeadingLine1: branding.heroHeadingLine1 ?? '',
      heroHeadingLine2: branding.heroHeadingLine2 ?? '',
      heroHeadingLine3: branding.heroHeadingLine3 ?? '',
      heroDescription: branding.heroDescription ?? '',
      searchPlaceholder: branding.searchPlaceholder ?? '',
      exploreShopsButtonText: branding.exploreShopsButtonText ?? '',
      browseProductsButtonText: branding.browseProductsButtonText ?? '',
      footerDescription: branding.footerDescription ?? '',
    });
  }, [branding]);

  const update = (key: keyof BrandingFormState) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const updateFields = (fields: Partial<BrandingFormState>) =>
    setForm((current) => ({ ...current, ...fields }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(form);
      showToast('Centralized branding synchronized across all platforms', 'success');
    } catch {
      showToast('Unable to save branding. Please try again.', 'error');
    }
  };

  if (!canView) {
    return <NoPermission title="Branding" />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Centralized Branding</h1>
          <p className="text-xs text-white/45 mt-1">
            Single source of truth for marketplace identity, logos, colors, and portal presentations across Customer, Seller, and Admin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <span className="text-[10px] text-white/40 flex items-center gap-1">
              <Lock className="h-3 w-3" /> View only
            </span>
          )}
          <Button
            type="submit"
            form="branding-form"
            size="sm"
            disabled={!canManage || isLoading}
            isLoading={updateMutation.isPending}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {updateMutation.isPending ? 'Propagating changes…' : 'Save & Propagate Everywhere'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form Columns */}
        <div className="lg:col-span-2 space-y-6">
          <form id="branding-form" onSubmit={handleSubmit} className="space-y-6">
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
                {/* 1. Core Marketplace Identity */}
                <SectionCard
                  icon={ImageIcon}
                  title="Marketplace Core Identity"
                  description="Authoritative brand name and descriptions used across all platforms"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Marketplace Brand Name" hint="Appears in headers, invoices, emails, and title tags">
                      <Input
                        value={form.brandName}
                        onChange={(e) => update('brandName')(e.target.value)}
                        placeholder="e.g. Sante"
                      />
                    </Field>
                    <Field label="Short Name / Initials" hint="Used for mobile badges and compact indicators">
                      <Input
                        value={form.shortName}
                        onChange={(e) => update('shortName')(e.target.value)}
                        placeholder="e.g. Sante"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Central Marketplace Tagline" hint="The primary brand slogan displayed under logos">
                        <Input
                          value={form.tagline}
                          onChange={(e) => update('tagline')(e.target.value)}
                          placeholder="e.g. Your local marketplace for handcrafted goods"
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Brand Description" hint="General marketplace purpose and overview">
                        <textarea
                          value={form.brandDescription}
                          onChange={(e) => update('brandDescription')(e.target.value)}
                          rows={2}
                          placeholder="Short summary of what this marketplace offers..."
                          className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none"
                        />
                      </Field>
                    </div>
                  </div>
                </SectionCard>

                {/* 2. Logos & Visual Assets */}
                <SectionCard
                  icon={LayoutTemplate}
                  title="Logos & Visual Assets"
                  description="Secure Cloudinary-backed assets displayed across all application headers and tabs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Primary Marketplace Logo" hint="Default logo for Customer, Seller, and Admin headers">
                      <ImageUploadField
                        folder="branding"
                        value={form.logoUrl}
                        onChange={(r: UploadResult) => updateFields({ logoUrl: r.url, logoPublicId: r.publicId })}
                        onRemove={() => updateFields({ logoUrl: '', logoPublicId: '' })}
                        maxBytes={2 * 1024 * 1024}
                        disabled={!canManage}
                      />
                    </Field>
                    <Field label="Favicon" hint="Browser tab icon. Falls back to Primary Logo if left empty">
                      <ImageUploadField
                        folder="branding"
                        value={form.faviconUrl}
                        onChange={(r: UploadResult) => updateFields({ faviconUrl: r.url, faviconPublicId: r.publicId })}
                        onRemove={() => updateFields({ faviconUrl: '', faviconPublicId: '' })}
                        maxBytes={1 * 1024 * 1024}
                        disabled={!canManage}
                      />
                    </Field>
                    <Field label="Dark-Mode Logo (Optional)" hint="Alternate logo optimized for dark backgrounds">
                      <ImageUploadField
                        folder="branding"
                        value={form.darkLogoUrl}
                        onChange={(r: UploadResult) => updateFields({ darkLogoUrl: r.url, darkLogoPublicId: r.publicId })}
                        onRemove={() => updateFields({ darkLogoUrl: '', darkLogoPublicId: '' })}
                        maxBytes={2 * 1024 * 1024}
                        disabled={!canManage}
                      />
                    </Field>
                    <Field label="Light-Mode Logo (Optional)" hint="Alternate logo optimized for light documents and prints">
                      <ImageUploadField
                        folder="branding"
                        value={form.lightLogoUrl}
                        onChange={(r: UploadResult) => updateFields({ lightLogoUrl: r.url, lightLogoPublicId: r.publicId })}
                        onRemove={() => updateFields({ lightLogoUrl: '', lightLogoPublicId: '' })}
                        maxBytes={2 * 1024 * 1024}
                        disabled={!canManage}
                      />
                    </Field>
                  </div>
                </SectionCard>

                {/* 3. Platform-Specific Titles */}
                <SectionCard
                  icon={Store}
                  title="Platform Presentation Titles"
                  description="Customise how the marketplace names itself in Customer and Seller portals"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Customer Storefront Title" hint="Leave blank to use the Central Brand Name">
                      <Input
                        value={form.customerTitle}
                        onChange={(e) => update('customerTitle')(e.target.value)}
                        placeholder={form.brandName || "e.g. Sante Marketplace"}
                      />
                    </Field>
                    <Field label="Seller Portal Title" hint="Leave blank to auto-derive as '[Brand Name] Seller Portal'">
                      <Input
                        value={form.sellerPortalTitle}
                        onChange={(e) => update('sellerPortalTitle')(e.target.value)}
                        placeholder={form.brandName ? `${form.brandName} Seller Portal` : "e.g. Sante Seller Portal"}
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Seller Portal Tagline" hint="Displayed under the seller header logo. Leave blank to inherit Central Tagline">
                        <Input
                          value={form.sellerPortalTagline}
                          onChange={(e) => update('sellerPortalTagline')(e.target.value)}
                          placeholder={form.tagline || "e.g. Merchant Center & Storefront Operations"}
                        />
                      </Field>
                    </div>
                  </div>
                </SectionCard>

                {/* 4. Colors & Public Contacts */}
                <SectionCard
                  icon={Palette}
                  title="Colours & Support Contacts"
                  description="Brand colors and public support contact details"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Primary Brand Colour">
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={form.primaryColor}
                          onChange={(e) => update('primaryColor')(e.target.value)}
                          className="h-10 w-12 rounded-xl border border-white/10 bg-white/5 cursor-pointer"
                        />
                        <Input
                          value={form.primaryColor}
                          onChange={(e) => update('primaryColor')(e.target.value)}
                          placeholder="#FF5722"
                          className="font-mono"
                        />
                      </div>
                    </Field>
                    <Field label="Secondary / Accent Colour">
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={form.secondaryColor}
                          onChange={(e) => update('secondaryColor')(e.target.value)}
                          className="h-10 w-12 rounded-xl border border-white/10 bg-white/5 cursor-pointer"
                        />
                        <Input
                          value={form.secondaryColor}
                          onChange={(e) => update('secondaryColor')(e.target.value)}
                          placeholder="#0EA5E9"
                          className="font-mono"
                        />
                      </div>
                    </Field>
                    <Field label="Support Email">
                      <Input
                        value={form.supportEmail}
                        onChange={(e) => update('supportEmail')(e.target.value)}
                        placeholder="support@example.com"
                      />
                    </Field>
                    <Field label="Support Phone">
                      <Input
                        value={form.supportPhone}
                        onChange={(e) => update('supportPhone')(e.target.value)}
                        placeholder="+1 555 555 5555"
                      />
                    </Field>
                  </div>
                </SectionCard>

                {/* 5. Browser & SEO Metadata */}
                <SectionCard
                  icon={Monitor}
                  title="Browser Tab & SEO Metadata"
                  description="Defaults applied to web pages, search engine results, and social previews"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Browser Tab Title">
                      <Input
                        value={form.browserTitle}
                        onChange={(e) => update('browserTitle')(e.target.value)}
                        placeholder="e.g. Sante | Local Multi-Vendor Marketplace"
                      />
                    </Field>
                    <Field label="SEO Title">
                      <Input
                        value={form.seoTitle}
                        onChange={(e) => update('seoTitle')(e.target.value)}
                        placeholder="e.g. Sante - Buy and Sell Local Crafts"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Meta Description">
                        <textarea
                          value={form.seoDescription}
                          onChange={(e) => update('seoDescription')(e.target.value)}
                          rows={2}
                          placeholder="Search engine summary of your marketplace..."
                          className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none"
                        />
                      </Field>
                    </div>
                  </div>
                </SectionCard>

                {/* 6. Customer Storefront Landing Copy */}
                <SectionCard
                  icon={ShoppingBag}
                  title="Customer Storefront Hero Content"
                  description="Hero banner text and call-to-actions displayed on the customer landing page"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Field label="Hero Badge Banner">
                        <Input
                          value={form.heroBadge}
                          onChange={(e) => update('heroBadge')(e.target.value)}
                          placeholder="The Local Marketplace for Everything"
                        />
                      </Field>
                    </div>
                    <Field label="Heading Line 1">
                      <Input
                        value={form.heroHeadingLine1}
                        onChange={(e) => update('heroHeadingLine1')(e.target.value)}
                        placeholder="Buy Anything."
                      />
                    </Field>
                    <Field label="Heading Line 2">
                      <Input
                        value={form.heroHeadingLine2}
                        onChange={(e) => update('heroHeadingLine2')(e.target.value)}
                        placeholder="From Anyone."
                      />
                    </Field>
                    <Field label="Heading Line 3">
                      <Input
                        value={form.heroHeadingLine3}
                        onChange={(e) => update('heroHeadingLine3')(e.target.value)}
                        placeholder="Near You."
                      />
                    </Field>
                    <Field label="Search Input Placeholder">
                      <Input
                        value={form.searchPlaceholder}
                        onChange={(e) => update('searchPlaceholder')(e.target.value)}
                        placeholder="Search products, shops on Marketplace…"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Hero Description">
                        <textarea
                          value={form.heroDescription}
                          onChange={(e) => update('heroDescription')(e.target.value)}
                          rows={3}
                          placeholder="Paragraph under hero heading..."
                          className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none"
                        />
                      </Field>
                    </div>
                    <Field label="Explore Shops Button Text">
                      <Input
                        value={form.exploreShopsButtonText}
                        onChange={(e) => update('exploreShopsButtonText')(e.target.value)}
                        placeholder="Explore Shops"
                      />
                    </Field>
                    <Field label="Browse Products Button Text">
                      <Input
                        value={form.browseProductsButtonText}
                        onChange={(e) => update('browseProductsButtonText')(e.target.value)}
                        placeholder="Browse Products"
                      />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Footer Description">
                        <textarea
                          value={form.footerDescription}
                          onChange={(e) => update('footerDescription')(e.target.value)}
                          rows={2}
                          placeholder="Text in storefront footer..."
                          className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none"
                        />
                      </Field>
                    </div>
                  </div>
                </SectionCard>
              </div>
            )}
          </form>
        </div>

        {/* Live Synchronized Previews Pane */}
        <div className="space-y-6">
          <Card className="border border-white/10 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-400" />
                  <CardTitle className="text-xs font-bold text-white/90">
                    Live Synchronized Previews
                  </CardTitle>
                </div>
                <div className="flex gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/10">
                  <button
                    type="button"
                    onClick={() => setPreviewTab('seller')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                      previewTab === 'seller' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Seller Header
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('customer')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                      previewTab === 'customer' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab('admin')}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition ${
                      previewTab === 'admin' ? 'bg-purple-600 text-white' : 'text-white/40 hover:text-white'
                    }`}
                  >
                    Admin
                  </button>
                </div>
              </div>
              <CardDescription className="text-[11px]">
                Preview how the current settings appear across marketplace applications
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {previewTab === 'seller' && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Seller Portal Header Preview</p>
                  <div className="p-4 rounded-xl border border-white/10 bg-[#07070a] shadow-inner space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {form.logoUrl ? (
                          <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <Store className="h-5 w-5 text-purple-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white text-xs tracking-tight block truncate">
                          {form.sellerPortalTitle || (form.brandName ? `${form.brandName} Seller Portal` : 'Seller Portal')}
                        </span>
                        <span className="text-[9px] text-white/40 block font-medium truncate">
                          {form.sellerPortalTagline || form.tagline || 'Merchant Center'}
                        </span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[10px] text-white/50">
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span>Synchronized with Central Logo &amp; Identity</span>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'customer' && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Customer Storefront Header Preview</p>
                  <div className="p-4 rounded-xl border border-white/10 bg-[#07070a] shadow-inner space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {form.logoUrl ? (
                          <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <ShoppingBag className="h-5 w-5 text-black" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white text-sm tracking-tight block truncate">
                          {form.customerTitle || form.brandName || 'Marketplace'}
                        </span>
                        <span className="text-[9px] text-white/40 block font-medium truncate">
                          {form.tagline || 'Your local marketplace'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewTab === 'admin' && (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-purple-400">Admin Sidebar Header Preview</p>
                  <div className="p-4 rounded-xl border border-white/10 bg-[#07070a] shadow-inner space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {form.logoUrl ? (
                          <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                        ) : (
                          <Shield className="h-4 w-4 text-black" />
                        )}
                      </div>
                      <div>
                        <span className="font-black text-white text-xs tracking-tight block uppercase">
                          {form.brandName || 'Marketplace'}
                        </span>
                        <span className="text-[8px] text-white/45 block font-bold -mt-0.5 uppercase tracking-wider">
                          Enterprise Admin
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-2 text-xs">
                <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Authoritative Storage Status</p>
                <div className="flex items-center justify-between text-white/80 text-xs">
                  <span>Customer Cache:</span>
                  <span className="font-mono text-emerald-400">{customerLoading ? 'Syncing…' : 'Active'}</span>
                </div>
                <div className="flex items-center justify-between text-white/80 text-xs">
                  <span>Seller Portal Cache:</span>
                  <span className="font-mono text-emerald-400">{sellerLoading ? 'Syncing…' : 'Active'}</span>
                </div>
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