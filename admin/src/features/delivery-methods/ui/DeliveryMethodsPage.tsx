"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryMethodApi, DeliveryMethodSetting } from '../api/deliveryMethodApi';
import { Card, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { Truck, Store } from 'lucide-react';

interface FixedSystemDeliveryMethod {
  code: string;
  altCodes?: string[];
  name: string;
  description: string;
  icon: React.ReactNode;
}

const SYSTEM_DELIVERY_METHODS: FixedSystemDeliveryMethod[] = [
  {
    code: 'PORTAL_DELIVERY',
    name: 'Portal Delivery',
    description: 'Delivered using Aura Logistics',
    icon: <Truck className="h-5 w-5 text-white/40" />,
  },
  {
    code: 'SELLER_DELIVERY',
    altCodes: ['SELF_DELIVERY'],
    name: 'Seller Delivery',
    description: 'Seller delivers directly',
    icon: <Store className="h-5 w-5 text-white/40" />,
  },
];

export function DeliveryMethodsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-methods-admin'],
    queryFn: deliveryMethodApi.getDeliveryMethods,
    staleTime: 2 * 60 * 1000,
  });

  const dbMethods: DeliveryMethodSetting[] = data?.deliveryMethods || [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      deliveryMethodApi.toggleStatus(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
      showToast('Delivery method status updated.', 'success');
      setTogglingId(null);
    },
    onError: (e: any) => {
      showToast(e.message || 'Failed to update delivery method status.', 'error');
      setTogglingId(null);
    },
  });

  // Calculate Allowed vs Not Allowed counts for the two system methods
  const resolvedMethods = SYSTEM_DELIVERY_METHODS.map((sysItem) => {
    const validCodes = [sysItem.code, ...(sysItem.altCodes || [])].map((c) => c.toUpperCase());
    const found = dbMethods.find((m) => validCodes.includes(m.code.toUpperCase()));
    return {
      sysItem,
      id: found?.id,
      isAllowed: found ? found.enabled : true,
    };
  });

  const allowedCount = resolvedMethods.filter((m) => m.isAllowed).length;
  const notAllowedCount = resolvedMethods.length - allowedCount;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Delivery Methods</h1>
          <p className="text-xs text-white/45 mt-1">
            Globally allow or disallow delivery modes for sellers and customer checkout
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary counters */}
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
              Delivery Methods Summary:
            </span>
            <Badge variant="success" className="text-[8px] px-1.5 py-0.5">
              {allowedCount} Allowed
            </Badge>
            {notAllowedCount > 0 && (
              <Badge variant="secondary" className="text-[8px] px-1.5 py-0.5">
                {notAllowedCount} Not Allowed
              </Badge>
            )}
          </div>

          {/* Grid layout matching District page */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resolvedMethods.map(({ sysItem, id, isAllowed }) => (
              <Card
                key={sysItem.code}
                className={`border glass-hover transition-all ${
                  isAllowed ? 'border-white/8 bg-white/[0.01]' : 'border-white/3 opacity-60 bg-transparent'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        {sysItem.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/95">{sysItem.name}</p>
                        <p className="text-[9px] text-white/40 mt-0.5">{sysItem.description}</p>
                      </div>
                    </div>
                    <Badge
                      variant={isAllowed ? 'success' : 'secondary'}
                      className="text-[8px] shrink-0 font-bold"
                    >
                      {isAllowed ? 'ALLOWED' : 'NOT ALLOWED'}
                    </Badge>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant={isAllowed ? 'outline' : 'default'}
                      className="flex-1 text-[10px] font-bold h-8 cursor-pointer"
                      isLoading={toggleMutation.isPending && togglingId === id}
                      disabled={!id}
                      onClick={() => {
                        if (id) {
                          setTogglingId(id);
                          toggleMutation.mutate({ id, enabled: !isAllowed });
                        }
                      }}
                    >
                      {isAllowed ? 'Not Allowed' : 'Allow'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

