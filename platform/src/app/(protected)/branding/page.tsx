"use client";

import React, { useState, useEffect } from "react";
import { Store, Image as ImageIcon, Globe, Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api/client";
import { BrandingConfig } from "@/types/platform";

export default function BrandingPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [branding, setBranding] = useState<BrandingConfig>({
    name: "Marketplace",
    marketplaceName: "Marketplace",
    logo: "",
    favicon: "",
    tagline: "Your local marketplace for everything",
    shortName: "Marketplace",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/platform/branding");
      const data = res.data;
      if (data) {
        setBranding({
          name: data.name || data.marketplaceName || "Marketplace",
          marketplaceName: data.name || data.marketplaceName || "Marketplace",
          logo: data.logoUrl || data.logo || "",
          favicon: data.faviconUrl || data.favicon || "",
          tagline: data.tagline || "Your local marketplace for everything",
          shortName: data.shortName || data.name || data.marketplaceName || "Marketplace",
        });
      }
    } catch (err: any) {
      console.error("Failed to load branding settings", err);
    } finally {
      setLoading(false);
    }
  };

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
      });
      if (res.status === 200 || res.status === 201) {
        setMessage({ type: "success", text: "Branding configurations saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save branding configurations." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update branding settings." });
    } finally {
      setSaving(false);
    }
  };


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
              Configure core visual identity, name, tagline, logo, and favicon across all Customer, Seller, and Admin frontends.
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
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Full Brand Name</label>
              <input
                type="text"
                required
                value={branding.name}
                onChange={(e) => setBranding({ ...branding, name: e.target.value, marketplaceName: e.target.value })}
                placeholder="e.g. Your Marketplace Name"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-white/30 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Short Name / Abbreviation</label>
              <input
                type="text"
                value={branding.shortName || ""}
                onChange={(e) => setBranding({ ...branding, shortName: e.target.value })}
                placeholder="e.g. Your Name"
                className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-white/30 transition-all"
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
            Rendered across hero section, customer footer, and public catalog pages.
          </p>
          <input
            type="text"
            value={branding.tagline || ""}
            onChange={(e) => setBranding({ ...branding, tagline: e.target.value })}
            placeholder="e.g. Your local marketplace for verified sellers"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-white/30 transition-all"
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
              className="flex-1 w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-white/30 transition-all"
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
              className="flex-1 w-full px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/20 text-sm font-medium focus:outline-none focus:border-white/30 transition-all"
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
                <span>{branding.name} | Browser Title</span>
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
