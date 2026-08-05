"use client";

import React, { useState, useEffect } from "react";
import { Store, Image as ImageIcon, Globe, Save, CheckCircle2, AlertCircle, RefreshCw, Type, TextCursorInput, FileText } from "lucide-react";
import { api } from "@/lib/api/client";
import { BrandingConfig } from "@/types/platform";

const DEFAULT_STATE: BrandingConfig = {
  name: "Marketplace",
  marketplaceName: "Marketplace",
  logo: "",
  favicon: "",
  tagline: "Your local marketplace for everything",
  shortName: "Marketplace",
  heroBadge: "The Local Marketplace for Everything",
  heroHeadingLine1: "Buy Anything.",
  heroHeadingLine2: "From Anyone.",
  heroHeadingLine3: "Near You.",
  heroDescription: "Marketplace is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond. Discover creators. Support neighbours.",
  searchPlaceholder: "Search products, shops on Marketplace…",
  exploreShopsButtonText: "Explore Shops",
  browseProductsButtonText: "Browse Products",
  footerDescription: "Discover local craft creators, purchase unique handmade items, and order custom-made 3D prints directly from makers on Marketplace.",
  seoTitle: "Marketplace",
  seoDescription: "Discover local artisans, handcrafted items, and custom products.",
  browserTitle: "Marketplace",
};

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_STATE);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/platform/branding");
      const data = res.data;
      if (data) {
        setBranding({
          ...DEFAULT_STATE,
          name: data.name || data.marketplaceName || "Marketplace",
          marketplaceName: data.name || data.marketplaceName || "Marketplace",
          logo: data.logoUrl || data.logo || "",
          favicon: data.faviconUrl || data.favicon || "",
          tagline: data.tagline || DEFAULT_STATE.tagline,
          shortName: data.shortName || data.name || data.marketplaceName || "Marketplace",
          heroBadge: data.heroBadge || DEFAULT_STATE.heroBadge,
          heroHeadingLine1: data.heroHeadingLine1 || DEFAULT_STATE.heroHeadingLine1,
          heroHeadingLine2: data.heroHeadingLine2 || DEFAULT_STATE.heroHeadingLine2,
          heroHeadingLine3: data.heroHeadingLine3 || DEFAULT_STATE.heroHeadingLine3,
          heroDescription: data.heroDescription || DEFAULT_STATE.heroDescription,
          searchPlaceholder: data.searchPlaceholder || DEFAULT_STATE.searchPlaceholder,
          exploreShopsButtonText: data.exploreShopsButtonText || DEFAULT_STATE.exploreShopsButtonText,
          browseProductsButtonText: data.browseProductsButtonText || DEFAULT_STATE.browseProductsButtonText,
          footerDescription: data.footerDescription || DEFAULT_STATE.footerDescription,
          seoTitle: data.seoTitle || DEFAULT_STATE.seoTitle,
          seoDescription: data.seoDescription || DEFAULT_STATE.seoDescription,
          browserTitle: data.browserTitle || DEFAULT_STATE.browserTitle,
        });
      }
    } catch (err: unknown) {
      console.error("Failed to load branding settings", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await api.put("/api/platform/branding", {
        name: branding.name,
        marketplaceName: branding.name,
        logoUrl: branding.logo,
        faviconUrl: branding.favicon,
        logo: branding.logo,
        favicon: branding.favicon,
        tagline: branding.tagline,
        shortName: branding.shortName,
        heroBadge: branding.heroBadge,
        heroHeadingLine1: branding.heroHeadingLine1,
        heroHeadingLine2: branding.heroHeadingLine2,
        heroHeadingLine3: branding.heroHeadingLine3,
        heroDescription: branding.heroDescription,
        searchPlaceholder: branding.searchPlaceholder,
        exploreShopsButtonText: branding.exploreShopsButtonText,
        browseProductsButtonText: branding.browseProductsButtonText,
        footerDescription: branding.footerDescription,
        seoTitle: branding.seoTitle,
        seoDescription: branding.seoDescription,
        browserTitle: branding.browserTitle,
      });
      if (res.status === 200 || res.status === 201) {
        setMessage({ type: "success", text: "Branding configurations saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save branding configurations." });
      }
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string } } };
      setMessage({ type: "error", text: apiErr?.response?.data?.message || "Failed to update branding settings." });
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-white/30 transition-all";
  const labelClass = "text-[10px] font-bold text-white/40 uppercase tracking-wider block";

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-white/40 animate-spin" />
        <p className="text-sm font-medium text-white/50">Loading branding configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Platform Branding (Single Source of Truth)</h1>
            <p className="text-xs text-white/50 font-medium">
              Configure core visual identity, name, tagline, logo, favicon, hero content, SEO, and browser title across all Customer, Seller, and Admin frontends.
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-medium ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/20 text-rose-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Brand Name & Short Name */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-white/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Brand Name & Abbreviation</h2>
          </div>
          <p className="text-xs text-white/40">
            The single source of truth brand title used across headers, footers, invoices, and document titles.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Marketplace Name</label>
              <input
                type="text"
                required
                value={branding.name}
                onChange={(e) => setBranding({ ...branding, name: e.target.value, marketplaceName: e.target.value })}
                placeholder="e.g. Your Marketplace Name"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Short Name / Abbreviation</label>
              <input
                type="text"
                value={branding.shortName || ""}
                onChange={(e) => setBranding({ ...branding, shortName: e.target.value })}
                placeholder="e.g. Your Name"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-white/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Tagline & Motto</h2>
          </div>
          <p className="text-xs text-white/40">
            Rendered across customer footer, and public catalog pages.
          </p>
          <input
            type="text"
            value={branding.tagline || ""}
            onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
            placeholder="e.g. Your local marketplace for verified sellers"
            className={inputClass}
          />
        </div>

        {/* Logo */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-white/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Logo Image (Optional)</h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">Optional</span>
          </div>
          <p className="text-xs text-white/40">
            Provide the image URL for the primary logo displayed on headers and invoices. Leave blank to show dynamic brand name.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <input
              type="text"
              value={branding.logo}
              onChange={(e) => setBranding({ ...branding, logo: e.target.value })}
              placeholder="https://example.com/logo.png or leave blank for dynamic brand name"
              className={inputClass}
            />
            {branding.logo ? (
              <div className="flex items-center gap-2">
                <div className="h-12 w-24 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={branding.logo}
                    alt="Logo Preview"
                    className="max-h-8 max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setBranding({ ...branding, logo: "" })}
                  className="text-xs text-rose-400 hover:underline px-2 py-1"
                >
                  Clear Logo
                </button>
              </div>
            ) : (
              <div className="text-xs text-white/40 italic">Using dynamic brand text</div>
            )}
          </div>
        </div>

        {/* Favicon */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-white/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Favicon Icon (Optional)</h2>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/10 text-white/60">Optional</span>
          </div>
          <p className="text-xs text-white/40">
            Provide the icon URL for the browser tab favicon (.ico or .png). Leave blank for default.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <input
              type="text"
              value={branding.favicon}
              onChange={(e) => setBranding({ ...branding, favicon: e.target.value })}
              placeholder="https://example.com/favicon.ico or leave blank for default"
              className={inputClass}
            />
            {branding.favicon ? (
              <div className="flex items-center gap-2">
                <div className="h-12 w-12 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                  <img
                    src={branding.favicon}
                    alt="Favicon Preview"
                    className="h-6 w-6 object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setBranding({ ...branding, favicon: "" })}
                  className="text-xs text-rose-400 hover:underline px-2 py-1"
                >
                  Clear Favicon
                </button>
              </div>
            ) : (
              <div className="text-xs text-white/40 italic">Using default favicon</div>
            )}
          </div>
        </div>

        {/* Hero & Homepage Content */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <Type className="h-4 w-4 text-white/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Hero & Homepage Content</h2>
          </div>
          <p className="text-xs text-white/40">
            Rendered on the customer homepage hero. Clearing a field restores its default value.
          </p>
          <div className="space-y-1.5">
            <label className={labelClass}>Hero Badge</label>
            <input
              type="text"
              value={branding.heroBadge || ""}
              onChange={(e) => setBranding({ ...branding, heroBadge: e.target.value })}
              placeholder="e.g. The Local Marketplace for Everything"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Hero Heading Line 1</label>
              <input
                type="text"
                value={branding.heroHeadingLine1 || ""}
                onChange={(e) => setBranding({ ...branding, heroHeadingLine1: e.target.value })}
                placeholder="e.g. Buy Anything."
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Hero Heading Line 2</label>
              <input
                type="text"
                value={branding.heroHeadingLine2 || ""}
                onChange={(e) => setBranding({ ...branding, heroHeadingLine2: e.target.value })}
                placeholder="e.g. From Anyone."
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Hero Heading Line 3</label>
              <input
                type="text"
                value={branding.heroHeadingLine3 || ""}
                onChange={(e) => setBranding({ ...branding, heroHeadingLine3: e.target.value })}
                placeholder="e.g. Near You."
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Hero Description</label>
            <textarea
              rows={3}
              value={branding.heroDescription || ""}
              onChange={(e) => setBranding({ ...branding, heroDescription: e.target.value })}
              placeholder="e.g. Marketplace is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond."
              className={`${inputClass} resize-none`}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Search Placeholder</label>
            <input
              type="text"
              value={branding.searchPlaceholder || ""}
              onChange={(e) => setBranding({ ...branding, searchPlaceholder: e.target.value })}
              placeholder="e.g. Search products, shops on Marketplace…"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>Explore Shops Button Text</label>
              <input
                type="text"
                value={branding.exploreShopsButtonText || ""}
                onChange={(e) => setBranding({ ...branding, exploreShopsButtonText: e.target.value })}
                placeholder="e.g. Explore Shops"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Browse Products Button Text</label>
              <input
                type="text"
                value={branding.browseProductsButtonText || ""}
                onChange={(e) => setBranding({ ...branding, browseProductsButtonText: e.target.value })}
                placeholder="e.g. Browse Products"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <TextCursorInput className="h-4 w-4 text-white/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Customer Footer</h2>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Footer Description</label>
            <textarea
              rows={3}
              value={branding.footerDescription || ""}
              onChange={(e) => setBranding({ ...branding, footerDescription: e.target.value })}
              placeholder="e.g. Discover local craft creators, purchase unique handmade items, and order custom-made 3D prints directly from makers."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* SEO & Browser */}
        <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-white/60" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">SEO & Browser Title</h2>
          </div>
          <p className="text-xs text-white/40">
            Used for search-engine metadata and the browser tab title across all frontends.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className={labelClass}>SEO Title</label>
              <input
                type="text"
                value={branding.seoTitle || ""}
                onChange={(e) => setBranding({ ...branding, seoTitle: e.target.value })}
                placeholder="e.g. Marketplace"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className={labelClass}>Browser Title</label>
              <input
                type="text"
                value={branding.browserTitle || ""}
                onChange={(e) => setBranding({ ...branding, browserTitle: e.target.value })}
                placeholder="e.g. Marketplace"
                className={inputClass}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>SEO Description</label>
            <textarea
              rows={2}
              value={branding.seoDescription || ""}
              onChange={(e) => setBranding({ ...branding, seoDescription: e.target.value })}
              placeholder="e.g. Discover local artisans, handcrafted items, and custom products."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/10 backdrop-blur-md space-y-3">
          <div className="text-xs font-bold text-white/50 uppercase tracking-widest">Live Brand Preview Across Frontends</div>
          <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {branding.logo ? (
                  <img src={branding.logo} alt="Brand Logo" className="h-7 max-w-[120px] object-contain" />
                ) : (
                  <div className="h-7 w-7 rounded bg-white/20 flex items-center justify-center font-bold text-xs text-black">
                    {branding.name?.[0] || "M"}
                  </div>
                )}
                <div>
                  <span className="font-bold text-white text-sm block">{branding.name || "Marketplace"}</span>
                  <span className="text-[10px] text-white/50 block">{branding.tagline}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-white/70 font-mono">
                {branding.favicon ? (
                  <img src={branding.favicon} alt="Favicon" className="h-4 w-4" />
                ) : (
                  <Globe className="h-3.5 w-3.5" />
                )}
                <span>{branding.browserTitle || branding.name} | Browser Title</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all shadow-lg hover:shadow-white/10 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? "Saving Changes..." : "Save Branding Configuration"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
