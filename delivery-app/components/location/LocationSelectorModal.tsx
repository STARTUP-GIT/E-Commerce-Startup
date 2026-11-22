"use client";

import React, { useState, useEffect } from "react";
import { useLocation } from "./LocationContext";
import { apiClient } from "@/lib/apiClient";
import {
  MapPin,
  Crosshair,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export function LocationSelectorModal() {
  const {
    isSelectorOpen,
    closeSelectorModal,
    catalogue,
    selectLocation,
    detectGpsLocation,
    isDetecting,
  } = useLocation();

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedTownId, setSelectedTownId] = useState("");
  const [selectedServiceAreaId, setSelectedServiceAreaId] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  useEffect(() => {
    if (catalogue?.states?.length && !selectedState) {
      setSelectedState(catalogue.states[0].name);
    }
  }, [catalogue, selectedState]);

  // Filter districts by selected state
  const availableDistricts = catalogue?.districts?.filter(
    (d) => !selectedState || d.state.toLowerCase() === selectedState.toLowerCase()
  ) || [];

  const currentDistrict = availableDistricts.find((d) => d.id === selectedDistrictId);
  const availableTowns = currentDistrict?.towns || [];
  const availableAreas = currentDistrict?.serviceAreas?.filter(
    (a) => !selectedTownId || !a.cityTownId || a.cityTownId === selectedTownId
  ) || [];

  // Live validate whenever selection changes
  useEffect(() => {
    if (!selectedDistrictId && !postalCode) {
      setCheckResult(null);
      return;
    }

    let isMounted = true;
    setChecking(true);

    const timer = setTimeout(async () => {
      try {
        const payload: any = {};
        if (selectedDistrictId) payload.districtId = selectedDistrictId;
        if (selectedTownId) payload.townId = selectedTownId;
        if (selectedServiceAreaId) payload.serviceAreaId = selectedServiceAreaId;
        if (postalCode.trim().length >= 6) payload.postalCode = postalCode.trim();

        const res = await apiClient.post("/api/delivery/serviceability/check", payload);
        if (isMounted) {
          setCheckResult(res.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setCheckResult({
            isDeliveryEligible: false,
            status: "ERROR",
            message: err.response?.data?.message || "Could not check location serviceability.",
          });
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedDistrictId, selectedTownId, selectedServiceAreaId, postalCode]);

  if (!isSelectorOpen) return null;

  const handleApply = () => {
    if (!currentDistrict && !checkResult?.resolvedLocation?.district) return;

    const chosenTown = availableTowns.find((t) => t.id === selectedTownId);
    const chosenArea = availableAreas.find((a) => a.id === selectedServiceAreaId);

    selectLocation({
      state: selectedState || checkResult?.resolvedLocation?.state,
      district: currentDistrict?.displayName || currentDistrict?.name || checkResult?.resolvedLocation?.district,
      districtId: currentDistrict?.id || checkResult?.resolvedLocation?.districtId,
      town: chosenTown?.displayName || chosenTown?.name || checkResult?.resolvedLocation?.town,
      townId: chosenTown?.id || checkResult?.resolvedLocation?.townId,
      serviceArea: chosenArea?.name || checkResult?.resolvedLocation?.serviceArea,
      serviceAreaId: chosenArea?.id || checkResult?.resolvedLocation?.serviceAreaId,
      postalCode: postalCode || (chosenArea?.postalCodes ? chosenArea.postalCodes[0] : checkResult?.resolvedLocation?.postalCode),
      formattedAddress: checkResult?.resolvedLocation?.formattedAddress,
      isEligible: checkResult?.isDeliveryEligible,
      status: checkResult?.status,
      message: checkResult?.message,
      comingSoonMessage: checkResult?.comingSoonMessage,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0f0f13] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Select Delivery Location</h3>
              <p className="text-[11px] text-zinc-400">Choose your locality or detect via GPS</p>
            </div>
          </div>
          <button
            onClick={closeSelectorModal}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Quick Auto-Detect Button */}
          <button
            onClick={() => {
              detectGpsLocation();
              closeSelectorModal();
            }}
            disabled={isDetecting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-all disabled:opacity-50"
          >
            <Crosshair className={`h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
            <span>{isDetecting ? "Detecting GPS Location..." : "Use Current GPS Location"}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Or Browse Catalogue</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form Selectors */}
          <div className="space-y-3">
            {/* State */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">State</label>
              <select
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrictId("");
                  setSelectedTownId("");
                  setSelectedServiceAreaId("");
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              >
                <option value="" className="bg-[#18181b] text-white">Select State</option>
                {catalogue?.states?.map((st) => (
                  <option key={st.id} value={st.name} className="bg-[#18181b] text-white">
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">Operational District *</label>
              <select
                value={selectedDistrictId}
                onChange={(e) => {
                  setSelectedDistrictId(e.target.value);
                  setSelectedTownId("");
                  setSelectedServiceAreaId("");
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
              >
                <option value="" className="bg-[#18181b] text-white">Select District</option>
                {availableDistricts.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#18181b] text-white">
                    {d.displayName || d.name} {!d.isDeliveryEnabled ? "(Coming Soon)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Town (Optional) */}
            {availableTowns.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Town / City</label>
                <select
                  value={selectedTownId}
                  onChange={(e) => {
                    setSelectedTownId(e.target.value);
                    setSelectedServiceAreaId("");
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                >
                  <option value="" className="bg-[#18181b] text-white">All Towns in District</option>
                  {availableTowns.map((t) => (
                    <option key={t.id} value={t.id} className="bg-[#18181b] text-white">
                      {t.displayName || t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Service Area / Locality */}
            {availableAreas.length > 0 && (
              <div>
                <label className="block text-[11px] font-medium text-zinc-300 mb-1">Service Area / Locality</label>
                <select
                  value={selectedServiceAreaId}
                  onChange={(e) => setSelectedServiceAreaId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                >
                  <option value="" className="bg-[#18181b] text-white">Select Locality</option>
                  {availableAreas.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#18181b] text-white">
                      {a.name} {a.postalCodes?.length ? `(${a.postalCodes.join(", ")})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Pincode Search */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-300 mb-1">PIN / Postal Code</label>
              <input
                type="text"
                placeholder="e.g. 570001"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 font-mono"
              />
            </div>
          </div>

          {/* Live Serviceability Status Feedback */}
          {checking && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 text-xs text-zinc-400">
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Checking operational coverage...</span>
            </div>
          )}

          {!checking && checkResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                checkResult.isDeliveryEligible
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : checkResult.status === "MAINTENANCE"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-sky-500/10 border-sky-500/30 text-sky-300"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold">
                {checkResult.isDeliveryEligible ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : checkResult.status === "MAINTENANCE" ? (
                  <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-sky-400 shrink-0" />
                )}
                <span>
                  {checkResult.isDeliveryEligible
                    ? "Service Operational"
                    : checkResult.status === "MAINTENANCE"
                    ? "Service Maintenance"
                    : "Coming Soon"}
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">{checkResult.message}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3 bg-white/[0.02]">
          <button
            onClick={closeSelectorModal}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={!selectedDistrictId && !postalCode}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition-colors disabled:opacity-40"
          >
            Set Location
          </button>
        </div>
      </div>
    </div>
  );
}
