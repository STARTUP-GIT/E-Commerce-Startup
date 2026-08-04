"use client";

import React, { useState, useEffect } from "react";
import { Layout, GripVertical, Save, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, MoveUp, MoveDown, LayoutTemplate, Compass, LayoutDashboard, PanelLeft } from "lucide-react";
import { api } from "@/lib/api/client";
import { UiBuilderLayout, UiLayoutItem } from "@/types/platform";

type TabType = "homepage" | "navbar" | "seller-widgets" | "seller-sidebar";

const DEFAULT_LAYOUT: UiBuilderLayout = {
  customerHomepageSections: [
    { id: "hero-banner", name: "Hero Banner", enabled: true, visibility: true, order: 1, section: "customerHomepageSections" },
    { id: "trending-categories", name: "Trending Categories", enabled: true, visibility: true, order: 2, section: "customerHomepageSections" },
    { id: "featured-shops", name: "Featured Creators", enabled: true, visibility: true, order: 3, section: "customerHomepageSections" },
    { id: "custom-prints", name: "Custom Prints CTA", enabled: true, visibility: true, featureKey: "CUSTOM_PRINTING", order: 4, section: "customerHomepageSections" },
    { id: "value-props", name: "Value Props", enabled: true, visibility: true, order: 5, section: "customerHomepageSections" },
    { id: "guest-signup", name: "Guest Sign-up Banner", enabled: true, visibility: true, order: 6, section: "customerHomepageSections" },
  ],
  customerNavbar: [
    { id: "nav-home", name: "Home", path: "/", enabled: true, visibility: true, order: 1, section: "customerNavbar" },
    { id: "nav-categories", name: "Categories", path: "/categories", enabled: true, visibility: true, order: 2, section: "customerNavbar" },
    { id: "nav-shops", name: "Shops", path: "/shops", enabled: true, visibility: true, order: 3, section: "customerNavbar" },
    { id: "nav-products", name: "Products", path: "/products", enabled: true, visibility: true, order: 4, section: "customerNavbar" },
    { id: "nav-orders", name: "Orders", path: "/orders", enabled: true, visibility: true, order: 5, section: "customerNavbar" },
    { id: "nav-wishlist", name: "Wishlist", path: "/wishlist", featureKey: "WISHLIST", enabled: true, visibility: true, order: 6, section: "customerNavbar" },
    { id: "nav-custom-orders", name: "Custom Orders", path: "/custom-orders", featureKey: "CUSTOM_PRINTING", enabled: true, visibility: true, order: 7, section: "customerNavbar" },
  ],
  sellerDashboardWidgets: [
    { id: "widget-revenue", name: "Revenue Summary", enabled: true, visibility: true, order: 1, section: "sellerDashboardWidgets" },
    { id: "widget-orders", name: "Recent Incoming Orders", enabled: true, visibility: true, order: 2, section: "sellerDashboardWidgets" },
  ],
  sellerSidebar: [
    { id: "side-dashboard", name: "Dashboard", path: "/dashboard", enabled: true, visibility: true, order: 1, section: "sellerSidebar" },
    { id: "side-products", name: "Products", path: "/products", featureKey: "PRODUCT_UPLOAD", enabled: true, visibility: true, order: 2, section: "sellerSidebar" },
    { id: "side-orders", name: "Orders", path: "/orders", enabled: true, visibility: true, order: 3, section: "sellerSidebar" },
    { id: "side-custom-orders", name: "Custom Requests", path: "/custom-orders", featureKey: "CUSTOM_PRINTING", enabled: true, visibility: true, order: 4, section: "sellerSidebar" },
    { id: "side-analytics", name: "Analytics", path: "/analytics", featureKey: "ANALYTICS", enabled: true, visibility: true, order: 5, section: "sellerSidebar" },
    { id: "side-payouts", name: "Payouts", path: "/payouts", featureKey: "PAYMENTS", enabled: true, visibility: true, order: 6, section: "sellerSidebar" },
    { id: "side-reviews", name: "Reviews", path: "/reviews", featureKey: "REVIEWS", enabled: true, visibility: true, order: 7, section: "sellerSidebar" },
    { id: "side-profile", name: "Seller Profile", path: "/profile", enabled: true, visibility: true, order: 8, section: "sellerSidebar" },
    { id: "side-shop", name: "Shop & Bank", path: "/shop", featureKey: "BANK_ACCOUNT", enabled: true, visibility: true, order: 9, section: "sellerSidebar" },
    { id: "side-settings", name: "Settings", path: "/settings", enabled: true, visibility: true, order: 10, section: "sellerSidebar" },
  ],
};

export default function UiBuilderPage() {
  const [activeTab, setActiveTab] = useState<TabType>("homepage");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [layout, setLayout] = useState<UiBuilderLayout>(DEFAULT_LAYOUT);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchLayout();
  }, []);

  const fetchLayout = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/platform/settings");
      const ui = res.data?.settings?.uiLayout || res.data?.uiLayout;
      if (ui) {
        const mergeItems = (saved: UiLayoutItem[] | undefined, defaults: UiLayoutItem[], sectionName: string) => {
          if (!saved || !Array.isArray(saved) || saved.length === 0) return defaults;
          const savedIds = new Set(saved.map((i) => i.id));
          const missingDefaults = defaults.filter((d) => !savedIds.has(d.id));
          const combined = [...saved, ...missingDefaults];
          return combined.map((item, index) => {
            const isEnabled = item.enabled !== false && item.visibility !== false;
            return {
              ...item,
              section: sectionName,
              order: index + 1,
              enabled: isEnabled,
              visibility: isEnabled,
            };
          });
        };

        setLayout({
          ...DEFAULT_LAYOUT,
          ...ui,
          customerHomepageSections: mergeItems(ui.customerHomepageSections, DEFAULT_LAYOUT.customerHomepageSections, "customerHomepageSections"),
          customerNavbar: mergeItems(ui.customerNavbar, DEFAULT_LAYOUT.customerNavbar, "customerNavbar"),
          sellerDashboardWidgets: mergeItems(ui.sellerDashboardWidgets, DEFAULT_LAYOUT.sellerDashboardWidgets, "sellerDashboardWidgets"),
          sellerSidebar: mergeItems(ui.sellerSidebar, DEFAULT_LAYOUT.sellerSidebar, "sellerSidebar"),
        });
      }
    } catch (err) {
      console.error("Failed to load UI layout settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const normalizeList = (items: UiLayoutItem[], sectionName: string) =>
        items.map((item, index) => {
          const isEnabled = item.enabled !== false && item.visibility !== false;
          return {
            ...item,
            section: sectionName,
            order: index + 1,
            enabled: isEnabled,
            visibility: isEnabled,
          };
        });

      const updatedLayout: UiBuilderLayout = {
        ...layout,
        customerHomepageSections: normalizeList(layout.customerHomepageSections, "customerHomepageSections"),
        customerNavbar: normalizeList(layout.customerNavbar, "customerNavbar"),
        sellerDashboardWidgets: normalizeList(layout.sellerDashboardWidgets, "sellerDashboardWidgets"),
        sellerSidebar: normalizeList(layout.sellerSidebar, "sellerSidebar"),
        synced: true,
        syncedAt: new Date().toISOString(),
      };

      const res = await api.patch("/api/platform/settings/ui-layout", updatedLayout);
      if (res.status === 200 || res.status === 201) {
        setLayout(updatedLayout);
        setMessage({ type: "success", text: "UI Layout configurations saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save UI layout." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.message || "Failed to update UI layout." });
    } finally {
      setSaving(false);
    }
  };

  const getActiveList = (): UiLayoutItem[] => {
    switch (activeTab) {
      case "homepage":
        return layout.customerHomepageSections;
      case "navbar":
        return layout.customerNavbar;
      case "seller-widgets":
        return layout.sellerDashboardWidgets;
      case "seller-sidebar":
        return layout.sellerSidebar;
    }
  };

  const setActiveList = (newList: UiLayoutItem[]) => {
    setLayout((prev) => {
      switch (activeTab) {
        case "homepage":
          return { ...prev, customerHomepageSections: newList };
        case "navbar":
          return { ...prev, customerNavbar: newList };
        case "seller-widgets":
          return { ...prev, sellerDashboardWidgets: newList };
        case "seller-sidebar":
          return { ...prev, sellerSidebar: newList };
      }
    });
  };

  const moveItem = (fromIndex: number, toIndex: number) => {
    const currentList = [...getActiveList()];
    if (toIndex < 0 || toIndex >= currentList.length) return;
    const [movedItem] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, movedItem);
    setActiveList(currentList);
  };

  const toggleSectionEnabled = (id: string) => {
    const currentList = getActiveList();
    const updated = currentList.map((item) => {
      if (item.id === id) {
        const nextState = item.enabled === false || item.visibility === false ? true : false;
        return { ...item, enabled: nextState, visibility: nextState };
      }
      return item;
    });
    setActiveList(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    moveItem(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-white/40 animate-spin" />
        <p className="text-sm font-medium text-white/50">Loading UI Builder...</p>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ElementType; desc: string }[] = [
    { id: "homepage", label: "Customer Homepage", icon: LayoutTemplate, desc: "Reorder & toggle homepage sections" },
    { id: "navbar", label: "Customer Navbar", icon: Compass, desc: "Reorder & toggle customer navigation items" },
    { id: "seller-widgets", label: "Seller Widgets", icon: LayoutDashboard, desc: "Reorder & toggle seller dashboard widgets" },
    { id: "seller-sidebar", label: "Seller Sidebar", icon: PanelLeft, desc: "Reorder & toggle seller navigation menu items" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg">
            <Layout className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">UI Layout Builder</h1>
            <p className="text-xs text-white/50 font-medium">
              Drag and drop to reorder elements and manage visibility across Customer and Seller apps.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all shadow-lg hover:shadow-white/10 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{saving ? "Saving Layout..." : "Save Layout"}</span>
        </button>
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

      {/* Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setDraggedIndex(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                isActive
                  ? "bg-white/10 border-white/30 shadow-lg text-white"
                  : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon className={`h-5 w-5 mb-2 ${isActive ? "text-white" : "text-white/40"}`} />
              <span className="font-bold text-sm block tracking-tight">{tab.label}</span>
              <span className="text-[10px] text-white/40 font-medium block truncate mt-0.5">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* Builder List Container */}
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {tabs.find((t) => t.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-white/40">
              Drag elements up or down using the handle to change display order, or toggle visibility.
            </p>
          </div>
          <span className="text-xs font-mono text-white/40">{getActiveList().length} items</span>
        </div>

        {/* Drag and Drop List */}
        <div className="space-y-3 pt-2">
          {getActiveList().map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all select-none ${
                draggedIndex === index
                  ? "bg-white/15 border-white/40 shadow-2xl scale-[1.01] z-10"
                  : "bg-black/40 border-white/5 hover:border-white/20"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
                  <GripVertical className="h-5 w-5" />
                </div>
                <div className="h-6 w-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold font-mono text-white/50">
                  {index + 1}
                </div>
                <div>
                  <span className="font-bold text-white text-sm block">{item.name}</span>
                  {item.path && (
                    <span className="text-[10px] font-mono text-white/40 block">{item.path}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Enable / Disable toggle for all layout items */}
                <button
                  onClick={() => toggleSectionEnabled(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    item.enabled !== false && item.visibility !== false
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-white/5 border-white/10 text-white/40"
                  }`}
                >
                  {item.enabled !== false && item.visibility !== false ? (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Visible</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Hidden</span>
                    </>
                  )}
                </button>

                {/* Manual Move Up / Move Down accessibility buttons */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => moveItem(index, index - 1)}
                    disabled={index === 0}
                    title="Move Up"
                    className="p-1 text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                  >
                    <MoveUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveItem(index, index + 1)}
                    disabled={index === getActiveList().length - 1}
                    title="Move Down"
                    className="p-1 text-white/40 hover:text-white disabled:opacity-20 cursor-pointer"
                  >
                    <MoveDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
