"use client";

import React, { useState } from "react";
import { useLocation } from "./LocationContext";
import { apiClient } from "@/lib/apiClient";
import { Send, X, CheckCircle2, Sparkles, Building2 } from "lucide-react";

export function LocationRequestModal() {
  const { isRequestModalOpen, closeRequestModal, userLocation } = useLocation();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    district: userLocation?.district || "",
    area: userLocation?.serviceArea || "",
    pincode: userLocation?.postalCode || "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isRequestModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.district && !form.area && !form.pincode) {
      setError("Please specify your district, area, or postal code.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiClient.post("/api/delivery/location-request", {
        customerName: form.name,
        customerPhone: form.phone,
        customerEmail: form.email,
        district: form.district,
        area: form.area,
        pincode: form.pincode,
        notes: form.notes,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not submit location request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f0f13] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <h3 className="text-sm font-semibold text-white">Request Delivery in Your Area</h3>
          </div>
          <button
            onClick={() => {
              closeRequestModal();
              setSubmitted(false);
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6 space-y-3">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-white">Thank You for Your Interest!</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                We have registered your location request for <span className="text-white font-medium">{form.area || form.district || form.pincode || "your area"}</span>. Our operations team reviews demand data when opening new delivery zones.
              </p>
              <button
                onClick={() => {
                  closeRequestModal();
                  setSubmitted(false);
                }}
                className="mt-4 px-5 py-2 rounded-xl text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <p className="text-xs text-zinc-400 leading-relaxed">
                AtlasBasket Delivery is continually expanding. Tell us where you need delivery coverage, and we will notify you as soon as operations launch in your locality.
              </p>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Your Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">District / City *</label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                    placeholder="e.g. Mysuru"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-300 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="e.g. Vijayanagar"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Postal Code (PIN)</label>
                <input
                  type="text"
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  placeholder="6-digit PIN"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="I run a local shop / want to register as a rider..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeRequestModal}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>Submit Request</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
