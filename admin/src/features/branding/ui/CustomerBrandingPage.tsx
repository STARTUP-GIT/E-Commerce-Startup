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
  ShoppingBag,
  RotateCcw,
  Search,
  ExternalLink,
  CheckCircle2,
  Globe,
  Sliders,
  Type,
  Phone,
  Mail
} from 'lucide-react';

interface CustomerBrandingFormState {
  brandName: string;
  shortName: string;
  tagline: string;
  customerTitle: string;
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

const EMPTY_CUSTOMER_FORM: CustomerBrandingFormState = {
  brandName: '',
  shortName: '',
  tagline: '',
  customerTitle: '',
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

export function CustomerBrandingPage() {
  const { can } = usePermissions();
  const { showToast } = useUIStore();
  const { branding, isLoading, refetch } = useAdminBranding('customer');
  const updateMutation = useUpdateBranding('customer');

  const canView = can('branding.view');
  const canManage = can('branding.manage');

  const [form, setForm] = useState<CustomerBrandingFormState>(EMPTY_CUSTOMER_FORM);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!branding) return;

    setForm({
      brandName: branding.brandName ?? branding.name ?? '',
      shortName: branding.shortName ?? '',
      tagline: branding.tagline ?? '',
      customerTitle: branding.customerTitle ?? branding.brandName ?? branding.name ?? '',
      brandDescription: branding.brandDescription ?? '',
      logoUrl: branding.logoUrl ?? branding.logo ?? '',
      logoPublicId: branding.logoPublicId ?? '',
      darkLogoUrl: branding.darkLogoUrl ?? '',
      darkLogoPublicId: branding.darkLogoPublicId ?? '',
      lightLogoUrl: branding.lightLogoUrl ?? '',
      lightLogoPublicId: branding.lightLogoPublicId ?? '',
      faviconUrl: branding.faviconUrl ?? branding.favicon ?? '',
      faviconPublicId: branding.faviconPublicId ?? '',
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
    setHasChanges(false);
  }, [branding]);

  const update = (key: keyof CustomerBrandingFormState) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setHasChanges(true);
  };

  const updateFields = (fields: Partial<CustomerBrandingFormState>) => {
    setForm((current) => ({ ...current, ...fields }));
    setHasChanges(true);
  };

  const handleReset = () => {
    if (!branding) return;
    setForm({
      brandName: branding.brandName ?? branding.name ?? '',
      shortName: branding.shortName ?? '',
      tagline: branding.tagline ?? '',
      customerTitle: branding.customerTitle ?? branding.brandName ?? branding.name ?? '',
      brandDescription: branding.brandDescription ?? '',
      logoUrl: branding.logoUrl ?? branding.logo ?? '',
      logoPublicId: branding.logoPublicId ?? '',
      darkLogoUrl: branding.darkLogoUrl ?? '',
      darkLogoPublicId: branding.darkLogoPublicId ?? '',
      lightLogoUrl: branding.lightLogoUrl ?? '',
      lightLogoPublicId: branding.lightLogoPublicId ?? '',
      faviconUrl: branding.faviconUrl ?? branding.favicon ?? '',
      faviconPublicId: branding.faviconPublicId ?? '',
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
    setHasChanges(false);
    showToast('Unsaved changes discarded', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(form);
      setHasChanges(false);
      showToast('Customer marketplace branding saved successfully', 'success');
      refetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Unable to save customer branding. Please try again.';
      showToast(msg, 'error');
    }
  };

  if (!canView) {
    return <NoPermission title="Customer Branding" />;
  }

  const effectiveName = form.customerTitle || form.brandName || 'Sante Marketplace';
  const effectiveTagline = form.tagline || 'Your local marketplace for everything';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider">
              Customer Scope
            </span>
            <span className="text-[11px] text-white/40">Dedicated Customer Marketplace Branding</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 mt-1">Customer Branding</h1>
          <p className="text-xs text-white/45 mt-0.5">
            Controls customer-facing marketplace logos, header identity, homepage marketing copy, colors, and SEO metadata.
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
            form="customer-branding-form"
            size="sm"
            disabled={!canManage || isLoading}
            isLoading={updateMutation.isPending}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold shadow-lg shadow-orange-950/40"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {updateMutation.isPending ? 'Saving customer branding…' : 'Save Customer Branding'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Form Columns */}
        <div className="lg:col-span-2 space-y-6">
          <form id="customer-branding-form" onSubmit={handleSubmit} className="space-y-6">
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
                {/* 1. Customer Marketplace Identity */}
                <SectionCard
                  icon={ShoppingBag}
                  title="Customer Marketplace Identity"
                  description="Primary names and slogans presented to marketplace shoppers"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Marketplace Brand Name" hint="Appears in header, browser titles, and customer communications">
                      <Input
                        value={form.brandName}
                        onChange={(e) => update('brandName')(e.target.value)}
                        placeholder="e.g. Sante Marketplace"
                        required
                      />
                    </Field>
                    <Field label="Short Name / Mobile Initials" hint="Used for mobile badges and compact indicators">
                      <Input
                        value={form.shortName}
                        onChange={(e) => update('shortName')(e.target.value)}
                        placeholder="e.g. Sante"
                      />
                    </Field>
                    <Field label="Customer Storefront Heading" hint="Optional override for header brand text">
                      <Input
                        value={form.customerTitle}
                        onChange={(e) => update('customerTitle')(e.target.value)}
                        placeholder="e.g. Sante Marketplace"
                      />
                    </Field>
                    <Field label="Customer Tagline" hint="Displayed under logos and in footer descriptions">
                      <Input
                        value={form.tagline}
                        onChange={(e) => update('tagline')(e.target.value)}
                        placeholder="e.g. Your local marketplace for everything"
                      />
                    </Field>
                  </div>
                  <Field label="Customer Marketplace Description" hint="Customer about statement and login subtitle">
                    <Input
                      value={form.brandDescription}
                      onChange={(e) => update('brandDescription')(e.target.value)}
                      placeholder="e.g. Your curated marketplace for local creators, artisans, and custom merchandise."
                    />
                  </Field>
                </SectionCard>

                {/* 2. Customer Logos & Assets */}
                <SectionCard
                  icon={ImageIcon}
                  title="Customer Logos & Media Assets"
                  description="Logos and favicon specifically used by the customer storefront"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Primary Customer Logo" hint="SVG, PNG, or WEBP displayed on customer header">
                      <ImageUploadField
                        value={form.logoUrl}
                        folder="branding"
                        onChange={({ url, publicId }) =>
                          updateFields({ logoUrl: url, logoPublicId: publicId })
                        }
                        onRemove={() => updateFields({ logoUrl: '', logoPublicId: '' })}
                      />
                    </Field>

                    <Field label="Customer Favicon" hint="Small icon appearing in customer browser tabs">
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

                {/* 3. Customer Brand Colors */}
                <SectionCard
                  icon={Palette}
                  title="Customer Theme & Brand Colors"
                  description="Primary accents applied across customer buttons, tags, and highlights"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Primary Customer Color" hint="Primary buttons, links, and cart accents">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.primaryColor || '#FF5722'}
                          onChange={(e) => update('primaryColor')(e.target.value)}
                          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
                        />
                        <Input
                          value={form.primaryColor}
                          onChange={(e) => update('primaryColor')(e.target.value)}
                          placeholder="#FF5722"
                          className="font-mono"
                        />
                      </div>
                    </Field>

                    <Field label="Secondary Customer Color" hint="Secondary badges, promo bars, and borders">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={form.secondaryColor || '#0EA5E9'}
                          onChange={(e) => update('secondaryColor')(e.target.value)}
                          className="h-10 w-12 rounded-lg border border-white/10 bg-transparent cursor-pointer p-0.5"
                        />
                        <Input
                          value={form.secondaryColor}
                          onChange={(e) => update('secondaryColor')(e.target.value)}
                          placeholder="#0EA5E9"
                          className="font-mono"
                        />
                      </div>
                    </Field>
                  </div>
                </SectionCard>

                {/* 4. Customer Homepage & Marketing Copy */}
                <SectionCard
                  icon={Type}
                  title="Customer Marketing & Hero Copy"
                  description="Customizable marketing copy appearing on the customer homepage"
                >
                  <div className="space-y-4">
                    <Field label="Hero Badge" hint="Pill badge displayed above the main homepage headline">
                      <Input
                        value={form.heroBadge}
                        onChange={(e) => update('heroBadge')(e.target.value)}
                        placeholder="e.g. The Local Marketplace for Everything"
                      />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Field label="Heading Line 1" hint="e.g. Buy Anything.">
                        <Input
                          value={form.heroHeadingLine1}
                          onChange={(e) => update('heroHeadingLine1')(e.target.value)}
                          placeholder="Buy Anything."
                        />
                      </Field>
                      <Field label="Heading Line 2" hint="e.g. From Anyone.">
                        <Input
                          value={form.heroHeadingLine2}
                          onChange={(e) => update('heroHeadingLine2')(e.target.value)}
                          placeholder="From Anyone."
                        />
                      </Field>
                      <Field label="Heading Line 3" hint="e.g. Near You.">
                        <Input
                          value={form.heroHeadingLine3}
                          onChange={(e) => update('heroHeadingLine3')(e.target.value)}
                          placeholder="Near You."
                        />
                      </Field>
                    </div>

                    <Field label="Hero Sub-Headline / Description">
                      <Input
                        value={form.heroDescription}
                        onChange={(e) => update('heroDescription')(e.target.value)}
                        placeholder="e.g. Sante is your local marketplace for everything..."
                      />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Field label="Search Bar Placeholder">
                        <Input
                          value={form.searchPlaceholder}
                          onChange={(e) => update('searchPlaceholder')(e.target.value)}
                          placeholder="Search products, shops on Marketplace…"
                        />
                      </Field>
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
                    </div>

                    <Field label="Footer Description">
                      <Input
                        value={form.footerDescription}
                        onChange={(e) => update('footerDescription')(e.target.value)}
                        placeholder="Discover local craft creators..."
                      />
                    </Field>
                  </div>
                </SectionCard>

                {/* 5. Customer SEO & Browser Metadata */}
                <SectionCard
                  icon={Globe}
                  title="Customer Application Page Title & SEO"
                  description="Browser tab titles and search engine metadata for customer pages"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Customer Browser Title" hint="Shown in the browser tab title">
                      <Input
                        value={form.browserTitle}
                        onChange={(e) => update('browserTitle')(e.target.value)}
                        placeholder="e.g. Sante Marketplace"
                      />
                    </Field>
                    <Field label="Customer SEO Title" hint="Rendered in og:title and Google search snippet">
                      <Input
                        value={form.seoTitle}
                        onChange={(e) => update('seoTitle')(e.target.value)}
                        placeholder="e.g. Sante Marketplace — Buy Local"
                      />
                    </Field>
                  </div>
                  <Field label="Customer SEO Description" hint="Search engine meta description">
                    <Input
                      value={form.seoDescription}
                      onChange={(e) => update('seoDescription')(e.target.value)}
                      placeholder="Discover local artisans, handcrafted items, and custom products."
                    />
                  </Field>
                </SectionCard>

                {/* 6. Customer Support Contact */}
                <SectionCard
                  icon={Mail}
                  title="Customer Support Contact"
                  description="Support email and telephone displayed to shoppers"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Customer Support Email">
                      <Input
                        type="email"
                        value={form.supportEmail}
                        onChange={(e) => update('supportEmail')(e.target.value)}
                        placeholder="support@marketplace.com"
                      />
                    </Field>
                    <Field label="Customer Support Phone">
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

        {/* Live Customer Header & Storefront Preview Pane */}
        <div className="space-y-6">
          <Card className="border border-white/10 bg-white/[0.01] sticky top-6">
            <CardHeader className="border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-orange-400" />
                <CardTitle className="text-xs font-bold text-white/90">
                  Live Customer Preview
                </CardTitle>
              </div>
              <CardDescription className="text-[11px]">
                Real-time preview of the customer header and storefront banner
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
                <span className="truncate font-medium">{form.browserTitle || effectiveName}</span>
              </div>

              {/* Customer Header Preview */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-orange-400">
                  Customer Header
                </p>
                <div className="p-3.5 rounded-xl border border-white/10 bg-[#07070a] shadow-inner space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    {/* Logo & Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {form.logoUrl ? (
                          <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <ShoppingBag className="h-4 w-4 text-black" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-extrabold text-white text-xs tracking-tight block truncate">
                          {effectiveName}
                        </span>
                        <span className="text-[8px] text-white/40 block truncate">
                          {effectiveTagline}
                        </span>
                      </div>
                    </div>

                    {/* Customer Action Mockup */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="px-2 py-1 text-[9px] font-bold rounded-md text-white shadow-sm"
                        style={{ backgroundColor: form.primaryColor || '#FF5722' }}
                      >
                        Sign In
                      </span>
                    </div>
                  </div>

                  {/* Customer Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-white/30" />
                    <div className="w-full h-7 pl-7 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-[10px] text-white/40 flex items-center truncate">
                      {form.searchPlaceholder || 'Search products, shops on Marketplace…'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Hero Banner Preview */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-orange-400">
                  Customer Hero Preview
                </p>
                <div className="p-4 rounded-xl border border-white/10 bg-[#0b0c10] shadow-inner space-y-3 text-center">
                  {form.heroBadge && (
                    <div className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-semibold bg-white/[0.06] border border-white/10 text-white/80">
                      {form.heroBadge}
                    </div>
                  )}
                  <h3 className="text-base font-extrabold text-white tracking-tight leading-tight">
                    {form.heroHeadingLine1 || 'Buy Anything.'}{' '}
                    <span style={{ color: form.primaryColor || '#FF5722' }}>
                      {form.heroHeadingLine2 || 'From Anyone.'}
                    </span>{' '}
                    {form.heroHeadingLine3 || 'Near You.'}
                  </h3>
                  <p className="text-[10px] text-white/50 line-clamp-2">
                    {form.heroDescription || 'Sante is your local marketplace for everything…'}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <span
                      className="px-2.5 py-1 text-[9px] font-bold rounded-lg text-white"
                      style={{ backgroundColor: form.primaryColor || '#FF5722' }}
                    >
                      {form.exploreShopsButtonText || 'Explore Shops'}
                    </span>
                    <span className="px-2.5 py-1 text-[9px] font-bold rounded-lg border border-white/10 text-white/70">
                      {form.browseProductsButtonText || 'Browse Products'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Independence Notice */}
              <div className="p-3 rounded-xl border border-orange-500/10 bg-orange-500/[0.02] space-y-1.5">
                <div className="flex items-center gap-2 text-orange-400 text-[11px] font-bold">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Independent Customer Scope</span>
                </div>
                <p className="text-[10px] text-white/50 leading-relaxed">
                  Saving this page updates customer-facing branding only. The seller portal retains its own distinct identity, logos, and taglines.
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
          <Icon className="h-4 w-4 text-orange-400" />
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
