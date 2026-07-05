'use client';

import React, { useState } from 'react';
import { useCheckout } from '../hooks/useCheckout';
import { useProfile } from '@/features/auth/profile/hooks/useProfile';
import { usePayment } from '@/features/payments/hooks/usePayment';
import { useSession } from 'next-auth/react';
import { productListService } from '../../products/product-list/services/productListService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { MapPin, Ticket, ShieldCheck, ShieldAlert, CreditCard, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/features/auth/profile/api/profileApi';
import { useLocationStore } from '@/lib/store/locationStore';
import { useSearchParams } from 'next/navigation';

export function CheckoutPage() {
  const { data: session } = useSession();
  const { profile, isLoading: profileLoading } = useProfile();
  const searchParams = useSearchParams();
  const isBuyNow = searchParams.get('buyNow') === 'true';
  const buyNowParams = isBuyNow ? {
    productId: searchParams.get('productId') || '',
    productVariantId: searchParams.get('variantId') || undefined,
    quantity: parseInt(searchParams.get('quantity') || '1', 10)
  } : undefined;

  const {
    summary,
    isLoading: checkoutLoading,
    validation,
    applyCoupon,
    isApplyingCoupon,
    removeCoupon,
    couponCode,
  } = useCheckout(buyNowParams);

  const { processPayment, isProcessing: paymentLoading, error: paymentError } = usePayment();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [couponInput, setCouponInput] = useState('');

  const { data: locationsConfig } = useQuery({
    queryKey: ['locations-config'],
    queryFn: profileApi.getLocationsStates,
    staleTime: 10 * 60 * 1000,
  });

  const addresses = profile?.addresses || [];
  const activeAddress = addresses.find((a) => a.id === selectedAddressId) || addresses.find((a) => a.isDefault) || addresses[0];

  // Fetch active districts for selected address state
  const { data: addrDistrictsData } = useQuery({
    queryKey: ['locations-districts', activeAddress?.state],
    queryFn: () => profileApi.getLocationsDistricts(activeAddress?.state || ''),
    enabled: !!activeAddress?.state,
    staleTime: 10 * 60 * 1000,
  });

  const setComingSoon = useLocationStore((state) => state.setComingSoon);

  React.useEffect(() => {
    if (activeAddress && locationsConfig?.allStates && addrDistrictsData?.allDistricts) {
      const stateObj = locationsConfig.allStates.find(
        (st: any) => st.name.toLowerCase() === activeAddress.state.toLowerCase()
      );
      if (stateObj && !stateObj.isEnabled) {
        setComingSoon(true, stateObj.name);
        return;
      }

      const districtObj = addrDistrictsData.allDistricts.find(
        (d: any) => d.name.toLowerCase() === activeAddress.city.toLowerCase()
      );
      if (districtObj && !districtObj.isEnabled) {
        setComingSoon(true, activeAddress.state, districtObj.name);
      }
    }
  }, [activeAddress, locationsConfig, addrDistrictsData, setComingSoon]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    applyCoupon(couponInput.trim());
  };

  const handleAddressSelect = (addr: any) => {
    setSelectedAddressId(addr.id);
  };

  const handlePlaceOrder = () => {
    const addr = activeAddress;
    if (!addr) {
      return;
    }

    if (locationsConfig?.allStates && addrDistrictsData?.allDistricts) {
      const stateObj = locationsConfig.allStates.find(
        (st: any) => st.name.toLowerCase() === addr.state.toLowerCase()
      );
      if (stateObj && !stateObj.isEnabled) {
        setComingSoon(true, stateObj.name);
        return;
      }

      const districtObj = addrDistrictsData.allDistricts.find(
        (d: any) => d.name.toLowerCase() === addr.city.toLowerCase()
      );
      if (districtObj && !districtObj.isEnabled) {
        setComingSoon(true, addr.state, districtObj.name);
        return;
      }
    }

    processPayment({
      shippingAddressId: addr.id,
      couponCode: couponCode || undefined,
      userEmail: session?.user?.email || '',
      userName: session?.user?.name || 'Customer',
      buyNow: buyNowParams,
    });
  };

  if (profileLoading || checkoutLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <Skeleton className="h-10 w-1/4" />
        <div className="grid lg:grid-cols-[1fr_380px] gap-8">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }



  const subtotal = summary?.subtotal || 0;
  const shippingTotal = summary?.shippingTotal || 0;
  const discountTotal = summary?.discountTotal || 0;
  const taxTotal = summary?.taxTotal || 0;
  const grandTotal = summary?.grandTotal || 0;
  const items = summary?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Title */}
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-zinc-400 bg-clip-text text-transparent">
          Secure Checkout
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review your items, choose shipping, and complete your payment securely.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        {/* Left Column: Address and Coupons */}
        <div className="space-y-6">
          {/* Address select */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Shipping Destination
              </CardTitle>
              <CardDescription>Select where your order should be delivered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {addresses.length > 0 ? (
                <div className="grid gap-3">
                  {addresses.map((addr) => {
                    const isSelected = activeAddress?.id === addr.id;
                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleAddressSelect(addr)}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/[0.03]'
                            : 'border-border bg-zinc-950/20 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">{addr.fullName}</span>
                          <Badge variant="secondary">{addr.type}</Badge>
                          {addr.isDefault && <Badge variant="default">Default</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{addr.addressLine1}</p>
                        <p className="text-xs text-muted-foreground">
                          {addr.city}, {addr.state} {addr.postalCode}, {addr.country}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium pt-1">Phone: {addr.phone}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-border rounded-xl space-y-3">
                  <p className="text-sm text-muted-foreground">No saved addresses found.</p>
                  <Link href="/profile">
                    <Button size="sm">Add Address in Profile</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation details */}
          {validation && !validation.isValid && (
            <div className="p-4 text-xs font-semibold text-destructive bg-destructive/10 rounded-xl border border-destructive/20 flex items-start gap-2">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Delivery Conflict</p>
                <p className="mt-1 text-muted-foreground leading-relaxed">{validation.message}</p>
                <p className="mt-2 text-[10px] uppercase tracking-wider text-destructive font-bold">
                  Tip: All items in your cart must belong to vendors located in your shipping city.
                </p>
              </div>
            </div>
          )}

          {/* Coupon promotions */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  Apply Coupon
                </CardTitle>
                <CardDescription>Enter a voucher code to claim discounts.</CardDescription>
              </CardHeader>
              <CardContent>
                {couponCode ? (
                  <div className="flex items-center justify-between p-3 border border-emerald-500/20 bg-emerald-500/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {couponCode} Applied!
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCoupon(couponCode)}
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-transparent"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <Input
                      placeholder="e.g. SAVE20"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                    />
                    <Button type="submit" isLoading={isApplyingCoupon}>
                      Apply
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Summary breakdown */}
        <div className="space-y-6">
          <Card className="border-border shadow-xl">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Items listing */}
              <div className="max-h-48 overflow-y-auto space-y-3 pr-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs gap-3">
                    <div className="flex-1">
                      <span className="font-semibold text-foreground block line-clamp-1">{item.name}</span>
                      {item.variantName && (
                        <span className="text-[10px] text-muted-foreground">Option: {item.variantName}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground block">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-bold text-foreground">
                      {productListService.formatPrice(item.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold text-foreground">
                    {productListService.formatPrice(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-semibold text-foreground">
                    {shippingTotal > 0 ? productListService.formatPrice(shippingTotal) : 'Free'}
                  </span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-{productListService.formatPrice(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%)</span>
                  <span className="font-semibold text-foreground">
                    {productListService.formatPrice(taxTotal)}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4 flex justify-between items-center">
                <span className="text-sm font-bold text-foreground">Total Amount</span>
                <span className="text-xl font-extrabold text-foreground bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  {productListService.formatPrice(grandTotal)}
                </span>
              </div>

              {paymentError && (
                <div className="p-3 text-xs font-semibold text-destructive bg-destructive/10 rounded-lg border border-destructive/20 mt-4">
                  {paymentError}
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-zinc-950/40 p-6">
              <Button
                onClick={handlePlaceOrder}
                isLoading={paymentLoading}
                disabled={items.length === 0 || !activeAddress || (validation && !validation.isValid)}
                className="w-full flex items-center justify-center gap-2 py-6 text-sm font-bold cursor-pointer"
              >
                <CreditCard className="h-4.5 w-4.5" />
                Pay Securely
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
