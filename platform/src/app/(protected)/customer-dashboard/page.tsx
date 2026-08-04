"use client";

import React, { useState, useEffect } from "react";
import { Users, ShieldCheck, ShoppingBag, MessageSquare, RefreshCw, ToggleLeft, ToggleRight, Info } from "lucide-react";
import { api } from "@/lib/api/client";
import { FeatureFlag } from "@/types/platform";

interface CategoryGroup {
  name: string;
  description: string;
  icon: React.ElementType;
  keys: string[];
}

const CUSTOMER_CATEGORIES: CategoryGroup[] = [
  {
    name: "Authentication & Login",
    description: "Manage customer login methods and authentication providers.",
    icon: ShieldCheck,
    keys: ["GOOGLE_LOGIN", "OTP_LOGIN", "EMAIL_LOGIN"],
  },
  {
    name: "Shopping & Checkout",
    description: "Core shopping experience, cart, wishlist, and promotional features.",
    icon: ShoppingBag,
    keys: ["BUY_NOW", "WISHLIST", "CART", "COUPONS", "REVIEWS", "CUSTOM_PRINTING"],
  },
  {
    name: "Discovery & Support",
    description: "Product discovery, search functionality, and direct support chat.",
    icon: MessageSquare,
    keys: ["SEARCH", "CHAT"],
  },
];

export default function CustomerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomerFeatures();
  }, []);

  const fetchCustomerFeatures = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/platform/feature-flags?application=CUSTOMER");
      if (res.data?.features) {
        setFeatures(res.data.features);
      }
    } catch (err) {
      console.error("Failed to load customer features", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (feature: FeatureFlag) => {
    setTogglingId(feature.id);
    const nextState = !feature.enabled;

    // Optimistic UI update
    setFeatures((prev) =>
      prev.map((f) => (f.id === feature.id ? { ...f, enabled: nextState } : f))
    );

    try {
      await api.patch(`/api/platform/feature-flags/${feature.id}/toggle`, { enabled: nextState });
    } catch (err) {
      console.error("Failed to toggle feature", err);
      // Revert optimistic update on failure
      setFeatures((prev) =>
        prev.map((f) => (f.id === feature.id ? { ...f, enabled: feature.enabled } : f))
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-white/40 animate-spin" />
        <p className="text-sm font-medium text-white/50">Loading customer features...</p>
      </div>
    );
  }

  // Helper to match category features or uncategorized ones
  const getFeaturesByKeys = (keys: string[]) => {
    return features.filter((f) => keys.includes(f.featureKey));
  };

  const knownKeys = CUSTOMER_CATEGORIES.flatMap((c) => c.keys);
  const otherFeatures = features.filter((f) => !knownKeys.includes(f.featureKey));

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Customer Dashboard Features</h1>
            <p className="text-xs text-white/50 font-medium">
              Enable or disable customer features deployed by the engineering team.
            </p>
          </div>
        </div>
        <button
          onClick={fetchCustomerFeatures}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold text-white/80 transition-all w-fit cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Sync Features</span>
        </button>
      </div>

      {/* Deployment Banner */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 text-xs text-blue-200">
        <Info className="h-5 w-5 shrink-0 text-blue-400 mt-0.5" />
        <div>
          <span className="font-bold block text-blue-300">Backend Auto-Registration</span>
          Features are automatically registered by the backend upon code deployment. Platform administrators can only enable or disable deployed features.
        </div>
      </div>

      {/* Feature Groups */}
      <div className="space-y-6">
        {CUSTOMER_CATEGORIES.map((cat) => {
          const CategoryIcon = cat.icon;
          const categoryFeatures = getFeaturesByKeys(cat.keys);
          if (categoryFeatures.length === 0) return null;

          return (
            <div
              key={cat.name}
              className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4"
            >
              <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
                <CategoryIcon className="h-4 w-4 text-white/60" />
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">{cat.name}</h2>
                  <p className="text-[11px] text-white/40">{cat.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {categoryFeatures.map((feature) => (
                  <div
                    key={feature.id}
                    className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between transition-all hover:border-white/15"
                  >
                    <div>
                      <span className="font-bold text-white text-sm block">{feature.displayName}</span>
                      <span className="text-[10px] font-mono text-white/40 uppercase tracking-wide">
                        {feature.featureKey}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggle(feature)}
                      disabled={togglingId === feature.id}
                      className="flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                    >
                      {feature.enabled ? (
                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                          <span>ENABLED</span>
                          <ToggleRight className="h-7 w-7 text-emerald-400" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-white/40 font-bold text-xs">
                          <span>DISABLED</span>
                          <ToggleLeft className="h-7 w-7 text-white/30" />
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Other Deployed Features (if any exist) */}
        {otherFeatures.length > 0 && (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/5">
              <Users className="h-4 w-4 text-white/60" />
              <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Additional Deployed Features</h2>
                <p className="text-[11px] text-white/40">Other customer features registered in code.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {otherFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between transition-all hover:border-white/15"
                >
                  <div>
                    <span className="font-bold text-white text-sm block">{feature.displayName}</span>
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-wide">
                      {feature.featureKey}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggle(feature)}
                    disabled={togglingId === feature.id}
                    className="flex items-center gap-2 transition-transform active:scale-95 cursor-pointer"
                  >
                    {feature.enabled ? (
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                        <span>ENABLED</span>
                        <ToggleRight className="h-7 w-7 text-emerald-400" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-white/40 font-bold text-xs">
                        <span>DISABLED</span>
                        <ToggleLeft className="h-7 w-7 text-white/30" />
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
