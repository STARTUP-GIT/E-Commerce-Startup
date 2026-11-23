"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryMethodApi, DeliveryMethodSetting } from '../api/deliveryMethodApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Truck,
  Store,
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  MapPin,
  ArrowRight,
} from 'lucide-react';

interface CanonicalDeliveryMethodDefinition {
  canonicalCode: string;
  aliases: string[];
  title: string;
  category: string;
  defaultDescription: string;
  icon: React.ReactNode;
}

const CANONICAL_METHODS: CanonicalDeliveryMethodDefinition[] = [
  {
    canonicalCode: 'THIRD_PARTY_DELIVERY',
    aliases: ['THIRD_PARTY_ONLINE', 'EXTERNAL_DELIVERY'],
    title: 'Third-Party Online Delivery',
    category: 'External Platform / Partner Logistics',
    defaultDescription: 'Delivery fulfilled through an external delivery platform or delivery partner.',
    icon: <Globe className="h-5 w-5 text-sky-400" />,
  },
  {
    canonicalCode: 'ATLASBASKET_DELIVERY',
    aliases: ['PORTAL_DELIVERY', 'INTERNAL_DELIVERY'],
    title: 'AtlasBasket Delivery',
    category: 'In-House Fleet & Dispatch Engine',
    defaultDescription: 'Deliveries fulfilled by our own AtlasBasket rider network.',
    icon: <Truck className="h-5 w-5 text-emerald-400" />,
  },
  {
    canonicalCode: 'SELLER_DELIVERY',
    aliases: ['SELF_DELIVERY', 'MERCHANT_DELIVERY'],
    title: 'Seller Delivery',
    category: 'Direct Seller Self-Fulfilment',
    defaultDescription: 'The seller handles delivery independently.',
    icon: <Store className="h-5 w-5 text-amber-400" />,
  },
];

export function DeliveryMethodsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['delivery-methods-admin'],
    queryFn: async () => {
      const result = await deliveryMethodApi.getDeliveryMethods();
      return result;
    },
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  });

  const dbMethods: DeliveryMethodSetting[] = data?.deliveryMethods || [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, allowed }: { id: string; allowed: boolean }) => {
      return deliveryMethodApi.toggleStatus(id, allowed);
    },
    onMutate: async ({ id, allowed }) => {
      await queryClient.cancelQueries({ queryKey: ['delivery-methods-admin'] });

      const previousData = queryClient.getQueryData<{ deliveryMethods: DeliveryMethodSetting[] }>(['delivery-methods-admin']);

      if (previousData?.deliveryMethods) {
        queryClient.setQueryData(['delivery-methods-admin'], {
          ...previousData,
          deliveryMethods: previousData.deliveryMethods.map((m) =>
            m.id === id ? { ...m, enabled: allowed } : m
          ),
        });
      }

      return { previousData };
    },
    onSuccess: (res: any) => {
      showToast(res?.message || 'Delivery method status updated successfully.', 'success');
      setTogglingId(null);
    },
    onError: (err: any, _variables, context) => {
      console.error('[DeliveryMethods] Toggle failed:', err?.message ?? err);
      showToast(err.message || 'Failed to update delivery method status.', 'error');
      setTogglingId(null);
      if (context?.previousData) {
        queryClient.setQueryData(['delivery-methods-admin'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
    },
  });

  // Resolve the 3 canonical methods against DB records
  const resolvedCards = CANONICAL_METHODS.map((def) => {
    const validCodes = [def.canonicalCode, ...def.aliases].map((c) => c.toUpperCase());
    const matched = dbMethods.find((m) => validCodes.includes(m.code.toUpperCase()));

    const isEnabled = matched ? matched.enabled : false;
    const isConfigured = matched?.isConfigured ?? (def.canonicalCode !== 'THIRD_PARTY_DELIVERY');
    const isOperational = matched?.isOperational ?? (isEnabled && isConfigured);

    return {
      def,
      record: matched,
      id: matched?.id,
      isEnabled,
      isConfigured,
      isOperational,
      statusNote: matched?.statusNote,
      coverageSummary: matched?.coverageSummary,
    };
  });

  const enabledCount = resolvedCards.filter((c) => c.isEnabled).length;
  const disabledCount = resolvedCards.length - enabledCount;
  const operationalCount = resolvedCards.filter((c) => c.isEnabled && c.isOperational).length;

  return (
    <div className="space-y-6 animate-fade-up max-w-7xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
              <Truck className="h-6 w-6 text-zinc-300" />
              Delivery Methods Management
            </h1>
            <Badge variant="outline" className="border-white/10 bg-white/[0.04] text-zinc-300 text-xs">
              Marketplace Fulfillment
            </Badge>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Independently configure and monitor Third-Party Online, AtlasBasket In-House Fleet, and Seller Delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/delivery"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors flex items-center gap-1.5"
          >
            <span>Delivery Fleet Ops</span>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
          </Link>
          <Link
            href="/delivery-branding"
            className="text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors flex items-center gap-1.5"
          >
            <span>Delivery Branding</span>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
          </Link>
        </div>
      </div>

      {/* Auth / fetch error */}
      {isError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-400 font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <span>
            Failed to load delivery methods — {(queryError as any)?.message || 'Check admin session / backend connectivity'}.
          </span>
        </div>
      )}

      {/* Summary counters bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
            Methods Overview:
          </span>
          <Badge variant="success" className="text-[10px] px-2.5 py-0.5 font-bold">
            {enabledCount} Enabled
          </Badge>
          {disabledCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2.5 py-0.5 font-bold">
              {disabledCount} Disabled
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
            {operationalCount} / 3 Operational
          </Badge>
        </div>

        <span className="text-[11px] text-zinc-500">
          Backend authoritative single source of truth • Zero secrets in Admin
        </span>
      </div>

      {/* 3 Delivery Method Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {resolvedCards.map(({ def, record, id, isEnabled, isConfigured, isOperational, statusNote, coverageSummary }) => {
            const isThirdParty = def.canonicalCode === 'THIRD_PARTY_DELIVERY';
            const isAtlasBasket = def.canonicalCode === 'ATLASBASKET_DELIVERY';
            const isSeller = def.canonicalCode === 'SELLER_DELIVERY';

            return (
              <Card
                key={def.canonicalCode}
                className={`flex flex-col justify-between border rounded-2xl transition-all duration-200 ${
                  isEnabled
                    ? 'border-white/10 bg-[#0c0c10]'
                    : 'border-white/5 bg-[#08080b] opacity-75'
                }`}
              >
                <CardHeader className="pb-3">
                  {/* Category and Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 truncate">
                      {def.category}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant={isEnabled ? 'success' : 'secondary'}
                        className="text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide"
                      >
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </Badge>
                    </div>
                  </div>

                  {/* Icon & Method Title */}
                  <div className="flex items-start gap-3">
                    <div className="h-11 w-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                      {def.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                        {record?.name || def.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {record?.description || def.defaultDescription}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1 flex-1 flex flex-col justify-between">
                  {/* Middle: Method-Specific Operational Details */}
                  <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                    {/* Operational State Pill */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">Operational Status:</span>
                      {isEnabled ? (
                        isOperational ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" />
                            Operational
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <AlertTriangle className="h-3 w-3" />
                            {isThirdParty ? 'Integration Inactive' : 'Coverage Inactive'}
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-800 text-zinc-400">
                          <XCircle className="h-3 w-3" />
                          Disabled
                        </span>
                      )}
                    </div>

                    {/* Method Specific Context */}
                    {isThirdParty && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Developer Config:</span>
                          <span className={isConfigured ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                            {isConfigured ? 'Credentials Configured' : 'Pending Server Env'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          {statusNote ||
                            'Integration credentials remain securely managed in server environment variables. Admin controls business activation.'}
                        </p>
                      </div>
                    )}

                    {isAtlasBasket && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Primary Hub:</span>
                          <span className="text-white font-medium flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-emerald-400" />
                            {coverageSummary?.primaryCity || 'Mysuru Hub'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/[0.04] text-[10px] text-zinc-400">
                          <div>
                            <span className="text-zinc-500 block">Districts / Towns:</span>
                            <span className="font-semibold text-zinc-200">
                              {coverageSummary?.totalDistricts ?? 1} Districts • {coverageSummary?.totalTowns ?? 5} Towns
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-500 block">Service Areas:</span>
                            <span className="font-semibold text-zinc-200">
                              {coverageSummary?.totalServiceAreas ?? 10} Areas Active
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed pt-1">
                          Connected directly to the AtlasBasket Delivery Portal, rider app, and dispatch system.
                        </p>
                      </div>
                    )}

                    {isSeller && (
                      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Fulfilment Mode:</span>
                          <span className="text-amber-300 font-medium">Direct Vendor Shipping</span>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">
                          Sellers handle packaging, dispatch, and delivery independently. Free shipping or custom seller rules apply.
                        </p>
                      </div>
                    )}

                    {!id && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
                        Record syncing with database defaults...
                      </div>
                    )}
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={isEnabled ? 'outline' : 'default'}
                        className={`w-full text-xs font-bold h-9 cursor-pointer transition-all ${
                          isEnabled
                            ? 'border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 text-zinc-300'
                            : 'bg-white text-zinc-950 hover:bg-zinc-200'
                        }`}
                        isLoading={toggleMutation.isPending && togglingId === id}
                        disabled={!id || (toggleMutation.isPending && togglingId === id)}
                        onClick={() => {
                          if (id) {
                            setTogglingId(id);
                            toggleMutation.mutate({ id, allowed: !isEnabled });
                          }
                        }}
                      >
                        {isEnabled ? 'Disable Method' : 'Enable Method'}
                      </Button>

                      {isAtlasBasket && (
                        <Link href="/delivery" className="shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 px-3 border-white/10 text-zinc-300 hover:bg-white/5 text-xs font-semibold"
                            title="Open Delivery Operations"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1">
                      <span>Code: <code className="font-mono text-zinc-400">{record?.code || def.canonicalCode}</code></span>
                      <span>Order: #{record?.displayOrder ?? def.canonicalCode}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Guidance Note Box */}
      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
          <Info className="h-4 w-4 text-sky-400" />
          <span>Important Operational Rules</span>
        </div>
        <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside leading-relaxed pl-1">
          <li>
            <strong className="text-zinc-200">Active Deliveries Preserved:</strong> Toggling any delivery method OFF will never cancel or disrupt deliveries already in progress.
          </li>
          <li>
            <strong className="text-zinc-200">Customer Checkout Filtering:</strong> Only enabled and operational methods are presented to buyers during checkout for their specific dropoff address.
          </li>
          <li>
            <strong className="text-zinc-200">Audit Logging:</strong> All toggle actions are recorded in the system audit log with admin ID, timestamp, and previous state.
          </li>
        </ul>
      </div>
    </div>
  );
}
