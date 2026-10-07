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
import { Eye, Image as ImageIcon, Lock, Monitor, Palette, Save, ShieldAlert, Store } from 'lucide-react';

interface BrandingFormState {
  brandName: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  logoPublicId: string;
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

const EMPTY_FORM: BrandingFormState = {
  brandName: '',
  shortName: '',
  tagline: '',
  logoUrl: '',
  logoPublicId: '',
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

export function BrandingPage() {
  const { can } = usePermissions();
  const { showToast } = useUIStore();
  const [selectedApp, setSelectedApp] = useState<BrandingApp>('customer');
  const app = selectedApp;
  const { branding, isLoading } = useAdminBranding(app);
  const { branding: publicBranding, isLoading: publicLoading } = useBranding(app);
  const updateMutation = useUpdateBranding(app);

  const canView = can('branding.view');
  const canManage = can('branding.manage');

  const [forms, setForms] = useState<Partial<Record<BrandingApp, BrandingFormState>>>({});
  const form = forms[app] ?? EMPTY_FORM;

  useEffect(() => {
    if (!branding) return;

    setForms((current) => ({
      ...current,
      [app]: {
        brandName: branding.brandName ?? branding.name ?? '',
        shortName: branding.shortName ?? '',
        tagline: branding.tagline ?? '',
        logoUrl: branding.logoUrl ?? '',
        logoPublicId: branding.logoPublicId ?? '',
        faviconUrl: branding.faviconUrl ?? '',
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
      },
    }));
  }, [app, branding]);

  const update = (key: keyof BrandingFormState) => (value: string) =>
    setForms((current) => ({
      ...current,
      [app]: { ...(current[app] ?? EMPTY_FORM), [key]: value },
    }));
  const updateFields = (fields: Partial<BrandingFormState>) =>
    setForms((current) => ({
      ...current,
      [app]: { ...(current[app] ?? EMPTY_FORM), ...fields },
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync(form);
      showToast('Branding updated', 'success');
    } catch {
      showToast('Unable to save branding. Please try again.', 'error');
    }
  };

  if (!canView) {
    return <NoPermission title="Branding" />;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Branding</h1>
          <p className="text-xs text-white/45 mt-1">
            {app === 'customer'
              ? 'Customise your customer marketplace identity, SEO, and storefront hero content'
              : 'Customise your seller portal identity, SEO, and browser presentation'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!canManage && (
            <span className="text-[10px] text-white/40 flex items-center gap-1"><Lock className="h-3 w-3" /> View only</span>
          )}
          <Button type="submit" form="branding-form" size="sm" disabled={!canManage || isLoading || !branding || !forms[app]} isLoading={updateMutation.isPending}>
            <Save className="mr-2 h-3.5 w-3.5" /> {updateMutation.isPending ? 'Saving…' : 'Save Branding'}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['customer', 'seller'] as BrandingApp[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSelectedApp(option)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
              app === option
                ? 'border-orange-400/60 bg-orange-500/10 text-orange-100'
                : 'border-white/10 bg-white/[0.02] text-white/60 hover:text-white/80'
            }`}
          >
            {option === 'customer' ? 'Customer Branding' : 'Seller Branding'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form id="branding-form" onSubmit={handleSubmit} className="space-y-6">
            {isLoading || !branding || !forms[app] ? (
              <Card className="border border-white/5">
                <CardContent className="p-6 space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                <SectionCard icon={ImageIcon} title="Identity" description="The core name and logos used across the marketplace">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Brand name">
                      <Input value={form.brandName} onChange={(e) => update('brandName')(e.target.value)} placeholder="My Marketplace" />
                    </Field>
                    <Field label="Short name">
                      <Input value={form.shortName} onChange={(e) => update('shortName')(e.target.value)} placeholder="Marketplace" />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Tagline">
                        <Input value={form.tagline} onChange={(e) => update('tagline')(e.target.value)} placeholder="Your local marketplace for everything" />
                      </Field>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Logo" hint="Shown in headers and the storefront preview">
                      <ImageUploadField
                        folder="branding"
                        value={form.logoUrl}
                        onChange={(r: UploadResult) => updateFields({ logoUrl: r.url, logoPublicId: r.publicId })}
                        onRemove={() => updateFields({ logoUrl: '/images/logo.png', logoPublicId: '' })}
                        maxBytes={2 * 1024 * 1024}
                        disabled={!canManage}
                      />
                    </Field>
                    <Field label="Favicon" hint="Leaving favicon empty falls back to your logo">
                      <ImageUploadField
                        folder="branding"
                        value={form.faviconUrl}
                        onChange={(r: UploadResult) => updateFields({ faviconUrl: r.url, faviconPublicId: r.publicId })}
                        onRemove={() => updateFields({ faviconUrl: '', faviconPublicId: '' })}
                        maxBytes={1 * 1024 * 1024}
                        disabled={!canManage}
                      />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard icon={Monitor} title="Browser & SEO" description="What shows in the browser tab and search engine results">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Browser title">
                      <Input value={form.browserTitle} onChange={(e) => update('browserTitle')(e.target.value)} placeholder="Browser tab title" />
                    </Field>
                    <Field label="SEO title">
                      <Input value={form.seoTitle} onChange={(e) => update('seoTitle')(e.target.value)} placeholder="SEO meta title" />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="SEO description">
                        <textarea value={form.seoDescription} onChange={(e) => update('seoDescription')(e.target.value)} rows={3} placeholder="Meta description for search engines" className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none" />
                      </Field>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={Palette} title="Colours & contact" description="Brand colours and public support contact details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Primary colour">
                      <div className="flex gap-2">
                        <input type="color" value={form.primaryColor} onChange={(e) => update('primaryColor')(e.target.value)} className="h-10 w-12 rounded-xl border border-white/10 bg-white/5 cursor-pointer" />
                        <Input value={form.primaryColor} onChange={(e) => update('primaryColor')(e.target.value)} placeholder="#FF5722" className="font-mono" />
                      </div>
                    </Field>
                    <Field label="Secondary colour">
                      <div className="flex gap-2">
                        <input type="color" value={form.secondaryColor} onChange={(e) => update('secondaryColor')(e.target.value)} className="h-10 w-12 rounded-xl border border-white/10 bg-white/5 cursor-pointer" />
                        <Input value={form.secondaryColor} onChange={(e) => update('secondaryColor')(e.target.value)} placeholder="#0EA5E9" className="font-mono" />
                      </div>
                    </Field>
                    <Field label="Support email">
                      <Input value={form.supportEmail} onChange={(e) => update('supportEmail')(e.target.value)} placeholder="support@example.com" />
                    </Field>
                    <Field label="Support phone">
                      <Input value={form.supportPhone} onChange={(e) => update('supportPhone')(e.target.value)} placeholder="+1 555 555 5555" />
                    </Field>
                  </div>
                </SectionCard>

                {app === 'customer' && <SectionCard icon={Store} title="Hero content" description="Text displayed on the customer storefront landing page">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Field label="Hero badge">
                        <Input value={form.heroBadge} onChange={(e) => update('heroBadge')(e.target.value)} placeholder="The Local Marketplace for Everything" />
                      </Field>
                    </div>
                    <Field label="Heading line 1">
                      <Input value={form.heroHeadingLine1} onChange={(e) => update('heroHeadingLine1')(e.target.value)} placeholder="Buy Anything." />
                    </Field>
                    <Field label="Heading line 2">
                      <Input value={form.heroHeadingLine2} onChange={(e) => update('heroHeadingLine2')(e.target.value)} placeholder="From Anyone." />
                    </Field>
                    <Field label="Heading line 3">
                      <Input value={form.heroHeadingLine3} onChange={(e) => update('heroHeadingLine3')(e.target.value)} placeholder="Near You." />
                    </Field>
                    <Field label="Search placeholder">
                      <Input value={form.searchPlaceholder} onChange={(e) => update('searchPlaceholder')(e.target.value)} placeholder="Search products, shops…" />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Hero description">
                        <textarea value={form.heroDescription} onChange={(e) => update('heroDescription')(e.target.value)} rows={3} placeholder="Short paragraph under the hero heading" className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none" />
                      </Field>
                    </div>
                    <Field label="Explore shops button text">
                      <Input value={form.exploreShopsButtonText} onChange={(e) => update('exploreShopsButtonText')(e.target.value)} placeholder="Explore Shops" />
                    </Field>
                    <Field label="Browse products button text">
                      <Input value={form.browseProductsButtonText} onChange={(e) => update('browseProductsButtonText')(e.target.value)} placeholder="Browse Products" />
                    </Field>
                    <div className="md:col-span-2">
                      <Field label="Footer description">
                        <textarea value={form.footerDescription} onChange={(e) => update('footerDescription')(e.target.value)} rows={3} placeholder="Text shown in the storefront footer" className="glass-input w-full rounded-xl px-3 py-2 text-sm text-white resize-none" />
                      </Field>
                    </div>
                  </div>
                </SectionCard>}
              </div>
            )}
          </form>
        </div>

        <div className="space-y-6">
          <StorefrontPreview app={app} publicBranding={publicBranding} publicLoading={publicLoading} />
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

function SectionCard({ icon: Icon, title, description, children }: { icon: React.ElementType; title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="border border-white/5">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white/60" />
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

function PreviewImage({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2">
      {src ? (
        <img src={src} alt={label} loading="lazy" className="h-10 w-10 rounded-lg object-cover border border-white/10 bg-white/5" />
      ) : (
        <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          <ImageIcon className="h-4 w-4 text-white/25" />
        </div>
      )}
      <span className="text-[10px] text-white/35">{label}</span>
    </div>
  );
}

function StorefrontPreview({ app, publicBranding, publicLoading }: { app: BrandingApp; publicBranding: BrandingConfig; publicLoading: boolean }) {
  const name = publicBranding?.name || 'Marketplace';
  const logo = publicBranding?.logo || '';
  return (
    <Card className="border border-white/5">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-white/60" />
          <CardTitle className="text-xs font-bold text-white/90">
            What the {app === 'customer' ? 'storefront' : 'seller portal'} shows
          </CardTitle>
        </div>
        <CardDescription className="text-[11px]">Public display branding (read-only)</CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {publicLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              {logo ? (
                <img src={logo} alt="logo" loading="lazy" className="h-10 w-10 rounded-xl object-cover border border-white/10 bg-white/5" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Store className="h-5 w-5 text-white/40" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-white/90 truncate">{name}</p>
                <p className="text-[11px] text-white/40 truncate">{publicBranding?.marketplaceName || name}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Browser title</p>
              <p className="text-sm text-white/80 truncate">{publicBranding?.browserTitle || name}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">
                {app === 'customer' ? 'Hero' : 'Tagline'}
              </p>
              {app === 'customer' ? (
                <>
                  <p className="text-xs text-white/60 line-clamp-2">{publicBranding?.heroBadge || '—'}</p>
                  <p className="text-xs text-white/60 truncate">{(publicBranding?.exploreShopsButtonText || 'Explore Shops') + ' · ' + (publicBranding?.browseProductsButtonText || 'Browse Products')}</p>
                </>
              ) : (
                <p className="text-xs text-white/60 line-clamp-2">{publicBranding?.tagline || '—'}</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}