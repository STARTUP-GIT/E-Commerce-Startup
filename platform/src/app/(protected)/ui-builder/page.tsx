"use client";

import React, { useState, useEffect } from "react";
import { Layout, GripVertical, Save, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, MoveUp, MoveDown, LayoutTemplate, Compass, LayoutDashboard, PanelLeft } from "lucide-react";
import { api } from "@/lib/api/client";
import { UiBuilderLayout, UiLayoutItem } from "@/types/platform";

type TabType = "homepage" | "navbar" | "seller-widgets" | "seller-sidebar";

const DEFAULT_LAYOUT: UiBuilderLayout = {
  customerHomepageSections: [
    { id: "hero-banner", name: "Hero Banner", enabled: true },
    { id: "featured-products", name: "Featured Products", enabled: true },
    { id: "trending-categories", name: "Trending Categories", enabled: true },
    { id: "flash-sales", name: "Flash Sales", enabled: true },
    { id: "promotional-banners", name: "Promotional Banners", enabled: true },
    { id: "customer-testimonials", name: "Customer Testimonials", enabled: true },
  ],
  customerNavbar: [
    { id: "nav-home", name: "Home", path: "/" },
    { id: "nav-categories", name: "Categories", path: "/categories" },
    { id: "nav-deals", name: "Deals", path: "/deals" },
    { id: "nav-wishlist", name: "Wishlist", path: "/wishlist" },
    { id: "nav-orders", name: "Orders", path: "/orders" },
    { id: "nav-support", name: "Support", path: "/support" },
  ],
  sellerDashboardWidgets: [
    { id: "widget-revenue", name: "Revenue Overview" },
    { id: "widget-orders", name: "Recent Orders" },
    { id: "widget-inventory", name: "Inventory Health" },
    { id: "widget-actions", name: "Quick Actions" },
    { id: "widget-analytics", name: "Performance Insights" },
  ],
  sellerSidebar: [
    { id: "side-dashboard", name: "Dashboard", path: "/seller/dashboard" },
    { id: "side-products", name: "Products", path: "/seller/products" },
    { id: "side-orders", name: "Orders", path: "/seller/orders" },
    { id: "side-analytics", name: "Analytics", path: "/seller/analytics" },
    { id: "side-coupons", name: "Coupons", path: "/seller/coupons" },
    { id: "side-settings", name: "Settings", path: "/seller/settings" },
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
      if (res.data?.settings?.uiLayout) {
        setLayout({
          customerHomepageSections: res.data.settings.uiLayout.customerHomepageSections || DEFAULT_LAYOUT.customerHomepageSections,
          customerNavbar: res.data.settings.uiLayout.customerNavbar || DEFAULT_LAYOUT.customerNavbar,
          sellerDashboardWidgets: res.data.settings.uiLayout.sellerDashboardWidgets || DEFAULT_LAYOUT.sellerDashboardWidgets,
          sellerSidebar: res.data.settings.uiLayout.sellerSidebar || DEFAULT_LAYOUT.sellerSidebar,
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
      const res = await api.patch("/api/platform/settings/ui-layout", layout);
      if (res.status === 200 || res.status === 201) {
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
    if (activeTab !== "homepage") return;
    const updated = layout.customerHomepageSections.map((item) =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setLayout((prev) => ({ ...prev, customerHomepageSections: updated }));
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
    { id: "navbar", label: "Customer Navbar", icon: Compass, desc: "Reorder main customer navigation items" },
    { id: "seller-widgets", label: "Seller Widgets", icon: LayoutDashboard, desc: "Reorder seller dashboard widgets" },
    { id: "seller-sidebar", label: "Seller Sidebar", icon: PanelLeft, desc: "Reorder seller navigation menu items" },
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
              Drag and drop to reorder elements and manage homepage section visibility.
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
              Drag elements up or down using the handle to change display order.
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
                {/* Enable / Disable toggle for Homepage Sections */}
                {activeTab === "homepage" && (
                  <button
                    onClick={() => toggleSectionEnabled(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      item.enabled !== false
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-white/5 border-white/10 text-white/40"
                    }`}
                  >
                    {item.enabled !== false ? (
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
                )}

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
