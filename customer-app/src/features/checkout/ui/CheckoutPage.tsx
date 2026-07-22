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
import { MapPin, Ticket, ShieldCheck, ShieldAlert, CreditCard, ChevronRight, Truck } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { profileApi } from '@/features/auth/profile/api/profileApi';
import { useLocationStore } from '@/lib/store/locationStore';
import { useSearchParams } from 'next/navigation';

import { checkoutApi } from '../api/checkoutApi';

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

  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<'PORTAL_DELIVERY' | 'SELF_DELIVERY'>('PORTAL_DELIVERY');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');

  const {
    summary,
    isLoading: checkoutLoading,
    validation,
    applyCoupon,
    isApplyingCoupon,
    removeCoupon,
    couponCode,
  } = useCheckout(buyNowParams, selectedDeliveryMethod);

  const { processPayment, processCodPayment, isProcessing: paymentLoading, error: paymentError } = usePayment();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [couponInput, setCouponInput] = useState('');

  // Fetch enabled payment methods
  const { data: paymentMethodsData } = useQuery({
    queryKey: ['enabled-payment-methods'],
    queryFn: checkoutApi.getPaymentMethods,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch enabled delivery methods
  const { data: deliveryMethodsData } = useQuery({
    queryKey: ['enabled-delivery-methods-checkout'],
    queryFn: checkoutApi.getDeliveryMethods,
    staleTime: 5 * 60 * 1000,
  });

  const enabledMethods = paymentMethodsData?.paymentMethods || [];

  const enabledDeliveryMethods = deliveryMethodsData?.deliveryMethods || [];
  const isPortalDeliveryGloballyEnabled = enabledDeliveryMethods.length === 0 || enabledDeliveryMethods.some((m) => m.code === 'PORTAL_DELIVERY');
  const isSellerDeliveryGloballyEnabled = enabledDeliveryMethods.length === 0 || enabledDeliveryMethods.some((m) => m.code === 'SELLER_DELIVERY' || m.code === 'SELF_DELIVERY');

  React.useEffect(() => {
    if (!isPortalDeliveryGloballyEnabled && isSellerDeliveryGloballyEnabled) {
      setSelectedDeliveryMethod('SELF_DELIVERY');
    } else if (isPortalDeliveryGloballyEnabled && !isSellerDeliveryGloballyEnabled) {
      setSelectedDeliveryMethod('PORTAL_DELIVERY');
    }
  }, [isPortalDeliveryGloballyEnabled, isSellerDeliveryGloballyEnabled]);

  React.useEffect(() => {
    if (enabledMethods.length > 0 && !selectedPaymentMethod) {
      const defaultMethod = enabledMethods[0]?.code;
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    }
  }, [enabledMethods, selectedPaymentMethod]);

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

  const stateObj = locationsConfig?.allStates?.find(
    (st: any) => st.name.toLowerCase() === activeAddress?.state?.toLowerCase()
  );
  const districtObj = addrDistrictsData?.allDistricts?.find(
    (d: any) => d.name.toLowerCase() === activeAddress?.city?.toLowerCase()
  );

  const isPortalCovered = !(
    (stateObj && !stateObj.isEnabled) ||
    (districtObj && !districtObj.isEnabled)
  );

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
    if (!addr) return;

    if (selectedDeliveryMethod === 'PORTAL_DELIVERY' && !isPortalCovered) {
      return;
    }

    if (selectedPaymentMethod === 'COD') {
      processCodPayment({
        shippingAddressId: addr.id,
        couponCode: couponCode || undefined,
        buyNow: buyNowParams,
        selectedDeliveryMethod,
      });
    } else {
      processPayment({
        shippingAddressId: addr.id,
        couponCode: couponCode || undefined,
        userEmail: session?.user?.email || '',
        userName: session?.user?.name || 'Customer',
        buyNow: buyNowParams,
      });
    }
  };

  if (profileLoading || checkoutLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <Skeleton className="h-8 sm:h-10 w-1/3 sm:w-1/4" />
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 sm:gap-8">
          <Skeleton className="h-80 sm:h-96 w-full" />
          <Skeleton className="h-[350px] sm:h-[400px] w-full" />
        </div>
      </div>
    );
  }



  const subtotal = summary?.subtotal || 0;
  const shippingTotal = summary?.shippingTotal || 0;
  const packingFeeTotal = summary?.packingFeeTotal || 0;
  const platformFeeTotal = summary?.platformFeeTotal || 0;
  const discountTotal = summary?.discountTotal || 0;
  const taxTotal = summary?.taxTotal || 0;
  const grandTotal = summary?.grandTotal || 0;
  const items = summary?.items || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Title */}
      <div className="border-b border-border pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-zinc-400 bg-clip-text text-transparent">
          Secure Checkout
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Review your items, choose shipping, and complete your payment securely.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1fr_380px] gap-6 sm:gap-8 items-start">
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
                        className={`p-3 sm:p-4 border rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/[0.03]'
                            : 'border-border bg-zinc-950/20 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                          <span className="font-semibold text-xs sm:text-sm">{addr.fullName}</span>
                          <Badge variant="secondary" className="text-[9px] sm:text-xs">{addr.type}</Badge>
                          {addr.isDefault && <Badge variant="default" className="text-[9px] sm:text-xs">Default</Badge>}
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">{addr.addressLine1}</p>
                        <p className="text-[11px] sm:text-xs text-muted-foreground">
                          {addr.city}, {addr.state} {addr.postalCode}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground font-medium pt-1">Phone: {addr.phone}</p>
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

          {/* Delivered By Options (Read-Only Information Card) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-bold">
                <Truck className="h-4 w-4 text-primary" />
                <span>Delivered By</span>
              </CardTitle>
              <CardDescription className="text-xs">Fulfillment method configured by seller.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDeliveryMethod === 'SELF_DELIVERY' ? (
                <div className="p-3.5 border border-border/80 bg-muted/20 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground text-xs sm:text-sm">Seller Delivery</span>
                    <Badge variant="success" className="text-[10px]">Free Shipping (₹0)</Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">Seller delivers directly.</p>
                </div>
              ) : (selectedDeliveryMethod as string) === 'BOTH' ? (
                <div className="p-3.5 border border-border/80 bg-muted/20 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground text-xs sm:text-sm">Both</span>
                    <Badge variant="outline" className="text-[10px]">Flexible Delivery</Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">Portal Delivery or Seller Delivery options available.</p>
                </div>
              ) : (
                <div className="p-3.5 border border-border/80 bg-muted/20 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground text-xs sm:text-sm">Portal Delivery</span>
                    <Badge variant="outline" className="text-[10px]">Standard Charge</Badge>
                  </div>
                  <p className="text-muted-foreground text-[11px]">Aura Marketplace logistics handles delivery.</p>
                </div>
              )}

              {/* Portal Coverage Warning */}
              {selectedDeliveryMethod === 'PORTAL_DELIVERY' && isPortalDeliveryGloballyEnabled && activeAddress && !isPortalCovered && (
                <div className="p-3 text-xs font-medium text-amber-400 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-start gap-2 mt-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold block">Portal Delivery Unavailable</span>
                    <span>Portal Delivery is unavailable in {activeAddress.city}, {activeAddress.state}.</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Method Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment Mode
              </CardTitle>
              <CardDescription>Select your preferred payment method.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {enabledMethods.length === 0 ? (
                <p className="text-xs text-muted-foreground">Loading available payment methods...</p>
              ) : (
                enabledMethods.map((pm) => {
                  const isSelected = selectedPaymentMethod === pm.code;
                  return (
                    <div
                      key={pm.id}
                      onClick={() => setSelectedPaymentMethod(pm.code)}
                      className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/[0.03]'
                          : 'border-border bg-zinc-950/20 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-xs sm:text-sm block">{pm.name}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {pm.code === 'COD'
                              ? 'Pay with cash upon package delivery'
                              : pm.description || 'Fast & secure online gateway'}
                          </span>
                        </div>
                        {isSelected && <Badge variant="default" className="text-[10px]">Selected</Badge>}
                      </div>
                    </div>
                  );
                })
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
                {packingFeeTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Packing Fee</span>
                    <span className="font-semibold text-foreground">
                      {productListService.formatPrice(packingFeeTotal)}
                    </span>
                  </div>
                )}
                {platformFeeTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee</span>
                    <span className="font-semibold text-foreground">
                      {productListService.formatPrice(platformFeeTotal)}
                    </span>
                  </div>
                )}
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-500 font-semibold">
                    <span>Coupon Discount</span>
                    <span>-{productListService.formatPrice(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes</span>
                  <span className="font-semibold text-foreground">
                    {productListService.formatPrice(taxTotal)}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-3 sm:pt-4 flex justify-between items-center">
                <span className="text-xs sm:text-sm font-bold text-foreground">Total Amount</span>
                <span className="text-base sm:text-xl font-extrabold text-foreground bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
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
                disabled={
                  items.length === 0 ||
                  !activeAddress ||
                  (validation && !validation.isValid) ||
                  (selectedDeliveryMethod === 'PORTAL_DELIVERY' && !isPortalCovered)
                }
                className="w-full flex items-center justify-center gap-2 py-6 text-sm font-bold cursor-pointer"
              >
                <CreditCard className="h-4.5 w-4.5" />
                {selectedPaymentMethod === 'COD' ? 'Place Order (Cash on Delivery)' : 'Pay Securely (Razorpay)'}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
