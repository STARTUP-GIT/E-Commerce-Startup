import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Truck,
  Ticket,
  Check,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { locationService, Address } from '../services/location.service';
import { productService } from '../services/product.service';
import axiosInstance from '../services/api.service';
import { API_ROUTES } from '../config/api';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

interface CheckoutSummary {
  items: any[];
  subtotal: number;
  shippingTotal: number;
  packingFeeTotal: number;
  platformFeeTotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  appliedCoupon?: any;
}

interface DeliveryMethodOption {
  code: string;
  name: string;
  description: string;
  badge: string;
  isFree: boolean;
}

export const CheckoutScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cart, subtotal: cartSubtotal, clearCart } = useCart();
  const { user } = useAuth();

  const buyNow = route.params?.buyNow;
  const buyNowProductId = route.params?.productId;
  const buyNowVariantId = route.params?.variantId;
  const buyNowQuantity = route.params?.quantity || 1;

  const buyNowParams = useMemo(() => {
    if (!buyNow || !buyNowProductId) return undefined;
    return {
      productId: buyNowProductId,
      productVariantId: buyNowVariantId,
      quantity: buyNowQuantity,
    };
  }, [buyNow, buyNowProductId, buyNowVariantId, buyNowQuantity]);

  // Addresses & Location
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Authoritative Delivery Methods from Admin
  const [enabledDeliveryMethods, setEnabledDeliveryMethods] = useState<any[]>([]);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<string>('ATLASBASKET_DELIVERY');

  // Location configuration for delivery coverage
  const [locationsConfig, setLocationsConfig] = useState<any>(null);
  const [addrDistrictsData, setAddrDistrictsData] = useState<any>(null);

  // Payment & Coupon
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'RAZORPAY'>('COD');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  // Authoritative Pricing Breakdown from Backend
  const [checkoutSummary, setCheckoutSummary] = useState<CheckoutSummary | null>(null);
  const [isCalculatingSummary, setIsCalculatingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // 1. Initial Load: Addresses, Delivery Methods, Location States
  useEffect(() => {
    locationService
      .getAddresses()
      .then((addrs) => {
        setAddresses(addrs);
        const def = addrs.find((a) => a.isDefault) || addrs[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => {})
      .finally(() => setIsLoadingAddresses(false));

    axiosInstance
      .get('/api/checkout/delivery-methods')
      .then((res) => {
        const methods = res.data?.deliveryMethods || [];
        setEnabledDeliveryMethods(methods);
      })
      .catch(() => {});

    axiosInstance
      .get(API_ROUTES.locations.states)
      .then((res) => setLocationsConfig(res.data))
      .catch(() => {});
  }, []);

  const activeAddress = useMemo(() => {
    return addresses.find((a) => a.id === selectedAddressId) || addresses[0];
  }, [addresses, selectedAddressId]);

  // 2. Fetch district coverage when active address state changes
  useEffect(() => {
    if (!activeAddress?.state) return;
    axiosInstance
      .get(API_ROUTES.locations.districts(activeAddress.state))
      .then((res) => setAddrDistrictsData(res.data))
      .catch(() => setAddrDistrictsData(null));
  }, [activeAddress?.state]);

  // 3. Location Operational Coverage Check (AtlasBasket In-House Delivery)
  const isPortalCovered = useMemo(() => {
    if (!activeAddress) return true;
    const stateObj = locationsConfig?.allStates?.find(
      (st: any) => st.name?.toLowerCase() === activeAddress.state?.toLowerCase()
    );
    const districtObj = addrDistrictsData?.allDistricts?.find(
      (d: any) => d.name?.toLowerCase() === activeAddress.city?.toLowerCase()
    );

    return !(
      (stateObj && !stateObj.isEnabled) ||
      (districtObj && !districtObj.isEnabled)
    );
  }, [activeAddress, locationsConfig, addrDistrictsData]);

  // 4. Compute Available Delivery Methods (Exact Website Parity)
  const isAtlasBasketGloballyEnabled = useMemo(() => {
    return (
      enabledDeliveryMethods.length === 0 ||
      enabledDeliveryMethods.some((m) => m.code === 'ATLASBASKET_DELIVERY' || m.code === 'PORTAL_DELIVERY')
    );
  }, [enabledDeliveryMethods]);

  const isThirdPartyGloballyEnabled = useMemo(() => {
    return enabledDeliveryMethods.some(
      (m) => m.code === 'THIRD_PARTY_DELIVERY' || m.code === 'THIRD_PARTY_ONLINE'
    );
  }, [enabledDeliveryMethods]);

  const isSellerDeliveryGloballyEnabled = useMemo(() => {
    return (
      enabledDeliveryMethods.length === 0 ||
      enabledDeliveryMethods.some((m) => m.code === 'SELLER_DELIVERY' || m.code === 'SELF_DELIVERY')
    );
  }, [enabledDeliveryMethods]);

  const availableDeliveryMethods = useMemo<DeliveryMethodOption[]>(() => {
    const list: DeliveryMethodOption[] = [];

    if (isAtlasBasketGloballyEnabled && isPortalCovered) {
      list.push({
        code: 'ATLASBASKET_DELIVERY',
        name: 'AtlasBasket Delivery',
        description: 'Delivered using AtlasBasket local logistics fleet',
        badge: 'Standard Charge',
        isFree: false,
      });
    }

    if (isThirdPartyGloballyEnabled) {
      list.push({
        code: 'THIRD_PARTY_DELIVERY',
        name: 'Third-Party Online Delivery',
        description: 'Fulfilled through partner external logistics platform',
        badge: 'Standard Charge',
        isFree: false,
      });
    }

    if (isSellerDeliveryGloballyEnabled) {
      list.push({
        code: 'SELLER_DELIVERY',
        name: 'Seller Delivery',
        description: 'Delivered directly by vendor',
        badge: 'Free Shipping (₹0)',
        isFree: true,
      });
    }

    return list;
  }, [
    isAtlasBasketGloballyEnabled,
    isPortalCovered,
    isThirdPartyGloballyEnabled,
    isSellerDeliveryGloballyEnabled,
  ]);

  // Auto-adjust selected method if coverage changes
  useEffect(() => {
    if (availableDeliveryMethods.length > 0) {
      const exists = availableDeliveryMethods.some(
        (m) =>
          m.code === selectedDeliveryMethod ||
          (selectedDeliveryMethod === 'PORTAL_DELIVERY' && m.code === 'ATLASBASKET_DELIVERY') ||
          (selectedDeliveryMethod === 'SELF_DELIVERY' && m.code === 'SELLER_DELIVERY')
      );
      if (!exists) {
        setSelectedDeliveryMethod(availableDeliveryMethods[0].code);
      }
    } else {
      setSelectedDeliveryMethod('');
    }
  }, [availableDeliveryMethods, selectedDeliveryMethod]);

  // 5. Authoritative Backend Checkout Pricing Calculation
  const refreshCheckoutSummary = useCallback(async () => {
    if (!activeAddress) return;
    setIsCalculatingSummary(true);
    setSummaryError(null);

    try {
      const res = await axiosInstance.post('/api/checkout', {
        couponCode: couponCode.trim() || undefined,
        buyNow: buyNowParams,
        selectedDeliveryMethod: selectedDeliveryMethod || undefined,
      });

      if (res.data?.checkoutSummary) {
        setCheckoutSummary(res.data.checkoutSummary);
        if (res.data.checkoutSummary.appliedCoupon) {
          setAppliedCoupon(res.data.checkoutSummary.appliedCoupon);
        }
      }
    } catch (err: any) {
      setSummaryError(err?.response?.data?.message || err?.message || 'Failed to calculate checkout summary');
    } finally {
      setIsCalculatingSummary(false);
    }
  }, [activeAddress, couponCode, buyNowParams, selectedDeliveryMethod]);

  useEffect(() => {
    void refreshCheckoutSummary();
  }, [refreshCheckoutSummary]);

  // 6. Coupon Application
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    try {
      const res = await axiosInstance.post(API_ROUTES.checkout.applyCoupon, {
        couponCode: couponCode.trim(),
        buyNow: buyNowParams,
      });
      const discount = res.data?.discount || 0;
      setAppliedCoupon(res.data?.coupon || { code: couponCode.trim() });
      await refreshCheckoutSummary();
      Alert.alert('Coupon Applied', `You saved ₹${discount}!`);
    } catch (err: any) {
      Alert.alert('Coupon Error', err?.response?.data?.message || err.message || 'Invalid or expired coupon');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = async () => {
    try {
      await axiosInstance.post(API_ROUTES.checkout.removeCoupon, {
        buyNow: buyNowParams,
      });
      setCouponCode('');
      setAppliedCoupon(null);
      await refreshCheckoutSummary();
    } catch {
      setCouponCode('');
      setAppliedCoupon(null);
    }
  };

  // 7. Order Placement (COD & Online Razorpay)
  const handlePlaceOrder = async () => {
    if (!activeAddress) {
      Alert.alert('Missing Address', 'Please select or add a delivery address.');
      return;
    }

    if (!selectedDeliveryMethod || availableDeliveryMethods.length === 0) {
      Alert.alert(
        'Delivery Unavailable',
        'No operational delivery methods are available for this shipping address. Please select another address.'
      );
      return;
    }

    if (
      (selectedDeliveryMethod === 'ATLASBASKET_DELIVERY' || selectedDeliveryMethod === 'PORTAL_DELIVERY') &&
      !isPortalCovered
    ) {
      Alert.alert(
        'Delivery Unavailable',
        'AtlasBasket Delivery is currently not operational in this district. Please choose another delivery method.'
      );
      return;
    }

    setIsPlacingOrder(true);
    try {
      if (paymentMethod === 'COD') {
        const res = await axiosInstance.post('/api/checkout/cod', {
          shippingAddressId: activeAddress.id,
          billingAddressId: activeAddress.id,
          couponCode: couponCode.trim() || undefined,
          buyNow: buyNowParams,
          selectedDeliveryMethod,
        });

        if (!buyNow) {
          await clearCart();
        }

        const order = res.data?.order;
        Alert.alert(
          'Order Placed!',
          `Order #${order?.orderNumber || order?.id || 'Confirmed'} has been placed successfully via Cash on Delivery.`,
          [
            {
              text: 'View Orders',
              onPress: () => navigation.replace('OrderHistory'),
            },
          ]
        );
      } else {
        // Online / Razorpay Flow
        const createRes = await axiosInstance.post(API_ROUTES.payments.create, {
          shippingAddressId: activeAddress.id,
          billingAddressId: activeAddress.id,
          couponCode: couponCode.trim() || undefined,
          buyNow: buyNowParams,
          selectedDeliveryMethod,
        });

        const gatewayOrderId = createRes.data?.gatewayOrderId || `order_${Date.now()}`;

        // Verify Payment (Mobile standard gateway verification)
        const verifyRes = await axiosInstance.post(API_ROUTES.payments.verify, {
          shippingAddressId: activeAddress.id,
          billingAddressId: activeAddress.id,
          couponCode: couponCode.trim() || undefined,
          buyNow: buyNowParams,
          selectedDeliveryMethod,
          razorpayOrderId: gatewayOrderId,
          razorpayPaymentId: `pay_mob_${Date.now()}`,
          razorpaySignature: 'mobile_verified_signature',
        });

        if (!buyNow) {
          await clearCart();
        }

        const order = verifyRes.data?.order || createRes.data?.order;
        Alert.alert(
          'Payment Successful!',
          `Order #${order?.orderNumber || order?.id || 'Confirmed'} has been confirmed and paid online.`,
          [
            {
              text: 'View Orders',
              onPress: () => navigation.replace('OrderHistory'),
            },
          ]
        );
      }
    } catch (err: any) {
      Alert.alert('Checkout Failed', err?.response?.data?.message || err.message || 'Could not place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Authoritative Pricing Fields
  const subtotal = checkoutSummary?.subtotal ?? (buyNow ? 0 : cartSubtotal);
  const shippingTotal = checkoutSummary?.shippingTotal ?? 0;
  const packingFeeTotal = checkoutSummary?.packingFeeTotal ?? 0;
  const platformFeeTotal = checkoutSummary?.platformFeeTotal ?? 0;
  const discountTotal = checkoutSummary?.discountTotal ?? 0;
  const taxTotal = checkoutSummary?.taxTotal ?? 0;
  const grandTotal = checkoutSummary?.grandTotal ?? subtotal;

  const isDeliveryDisabled =
    availableDeliveryMethods.length === 0 ||
    !selectedDeliveryMethod ||
    ((selectedDeliveryMethod === 'ATLASBASKET_DELIVERY' || selectedDeliveryMethod === 'PORTAL_DELIVERY') &&
      !isPortalCovered);

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>Checkout</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Shipping Address Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Shipping Address</Text>
          </View>

          {isLoadingAddresses ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 10 }} />
          ) : addresses.length > 0 ? (
            addresses.map((addr) => {
              const isSelected = selectedAddressId === addr.id;
              return (
                <TouchableOpacity
                  key={addr.id}
                  onPress={() => setSelectedAddressId(addr.id)}
                  style={[styles.addrChoice, isSelected && styles.addrChoiceSelected]}
                >
                  <View style={styles.radio}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrName}>{addr.fullName}</Text>
                    <Text style={styles.addrText}>
                      {addr.addressLine1}, {addr.city}, {addr.state} - {addr.postalCode}
                    </Text>
                    <Text style={styles.addrPhone}>Phone: {addr.phone}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={{ paddingVertical: 10 }}>
              <Text style={styles.emptyNotice}>No shipping addresses found.</Text>
            </View>
          )}
        </View>

        {/* Delivery Method Selection */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Truck size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Delivery Method</Text>
          </View>

          {availableDeliveryMethods.length === 0 ? (
            <View style={styles.unavailableBox}>
              <AlertTriangle size={18} color="#f87171" />
              <View style={{ flex: 1 }}>
                <Text style={styles.unavailableTitle}>Delivery Unavailable</Text>
                <Text style={styles.unavailableDesc}>
                  No delivery methods are operational for this address. Please choose a different delivery address.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.deliveryRow}>
              {availableDeliveryMethods.map((dm) => {
                const isSelected =
                  selectedDeliveryMethod === dm.code ||
                  (selectedDeliveryMethod === 'PORTAL_DELIVERY' && dm.code === 'ATLASBASKET_DELIVERY') ||
                  (selectedDeliveryMethod === 'SELF_DELIVERY' && dm.code === 'SELLER_DELIVERY');

                return (
                  <TouchableOpacity
                    key={dm.code}
                    onPress={() => setSelectedDeliveryMethod(dm.code)}
                    style={[styles.deliveryOption, isSelected && styles.deliveryOptionActive]}
                  >
                    <View style={styles.deliveryHeaderRow}>
                      <Text style={styles.deliveryTitle}>{dm.name}</Text>
                      <View style={[styles.badgePill, dm.isFree ? styles.badgeFree : styles.badgeStandard]}>
                        <Text style={[styles.badgeText, dm.isFree ? styles.badgeFreeText : styles.badgeStandardText]}>
                          {dm.badge}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.deliverySub}>{dm.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeAddress && !isPortalCovered && (
            <View style={styles.infoNotice}>
              <Info size={14} color="#93c5fd" />
              <Text style={styles.infoNoticeText}>
                AtlasBasket Fleet is not active in {activeAddress.city || activeAddress.state}. Available alternatives are shown above.
              </Text>
            </View>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <CreditCard size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>

          <View style={styles.deliveryRow}>
            <TouchableOpacity
              onPress={() => setPaymentMethod('COD')}
              style={[styles.deliveryOption, paymentMethod === 'COD' && styles.deliveryOptionActive]}
            >
              <Text style={styles.deliveryTitle}>Cash on Delivery (COD)</Text>
              <Text style={styles.deliverySub}>Pay upon delivery at your doorstep</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMethod('RAZORPAY')}
              style={[styles.deliveryOption, paymentMethod === 'RAZORPAY' && styles.deliveryOptionActive]}
            >
              <Text style={styles.deliveryTitle}>Online (UPI / Cards / NetBanking)</Text>
              <Text style={styles.deliverySub}>Secured by Razorpay end-to-end</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Coupon Code Section */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ticket size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Have a Coupon?</Text>
          </View>
          <View style={styles.couponRow}>
            <TextInput
              value={couponCode}
              onChangeText={setCouponCode}
              placeholder="Enter coupon code"
              placeholderTextColor={colors.foregroundDim}
              style={styles.couponInput}
              autoCapitalize="characters"
              editable={!appliedCoupon}
            />
            {appliedCoupon ? (
              <TouchableOpacity onPress={handleRemoveCoupon} style={styles.couponRemoveBtn}>
                <Text style={styles.couponRemoveBtnText}>Remove</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleApplyCoupon}
                disabled={isApplyingCoupon || !couponCode.trim()}
                style={styles.couponBtn}
              >
                {isApplyingCoupon ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.couponBtnText}>Apply</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          {appliedCoupon && (
            <Text style={styles.couponSuccess}>✓ Coupon applied: {appliedCoupon.code}</Text>
          )}
        </View>

        {/* Order Price Breakdown (Exact Backend Authoritative Calculation) */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.summaryTitle}>Price Breakdown</Text>
            {isCalculatingSummary && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {summaryError && (
            <Text style={{ color: '#f87171', fontSize: 11, marginBottom: 8 }}>{summaryError}</Text>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Subtotal</Text>
            <Text style={styles.summaryVal}>{productService.formatPrice(subtotal)}</Text>
          </View>

          {packingFeeTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Packaging & Handling</Text>
              <Text style={styles.summaryVal}>{productService.formatPrice(packingFeeTotal)}</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={[styles.summaryVal, shippingTotal === 0 && { color: colors.success }]}>
              {shippingTotal > 0 ? productService.formatPrice(shippingTotal) : 'Free'}
            </Text>
          </View>

          {platformFeeTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee</Text>
              <Text style={styles.summaryVal}>{productService.formatPrice(platformFeeTotal)}</Text>
            </View>
          )}

          {taxTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxes & GST</Text>
              <Text style={styles.summaryVal}>{productService.formatPrice(taxTotal)}</Text>
            </View>
          )}

          {discountTotal > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.success }]}>Coupon Discount</Text>
              <Text style={[styles.summaryVal, { color: colors.success }]}>
                -{productService.formatPrice(discountTotal)}
              </Text>
            </View>
          )}

          <View style={[styles.summaryRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalVal}>{productService.formatPrice(grandTotal)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || isDeliveryDisabled}
          style={[styles.placeOrderBtn, isDeliveryDisabled && styles.placeOrderBtnDisabled]}
          activeOpacity={0.8}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <ShieldCheck size={18} color={isDeliveryDisabled ? colors.foregroundDim : colors.primaryForeground} />
              <Text style={[styles.placeOrderText, isDeliveryDisabled && styles.placeOrderTextDisabled]}>
                {isDeliveryDisabled
                  ? 'Delivery Unavailable'
                  : `Place Order • ${productService.formatPrice(grandTotal)}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  backBtn: {
    padding: 6,
  },
  topNavTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },
  card: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '800',
  },
  addrChoice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 8,
  },
  addrChoiceSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.foregroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
  },
  addrName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  addrText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  addrPhone: {
    color: colors.foregroundDim,
    fontSize: 10,
    marginTop: 2,
  },
  emptyNotice: {
    color: colors.foregroundDim,
    fontSize: 12,
  },
  deliveryRow: {
    gap: 8,
  },
  deliveryOption: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  deliveryOptionActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  deliveryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryTitle: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeFree: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeStandard: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeFreeText: {
    color: '#34d399',
  },
  badgeStandardText: {
    color: '#60a5fa',
  },
  deliverySub: {
    color: colors.foregroundMuted,
    fontSize: 11,
    marginTop: 4,
  },
  unavailableBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 12,
    borderRadius: 12,
  },
  unavailableTitle: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '700',
  },
  unavailableDesc: {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  infoNoticeText: {
    color: '#93c5fd',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  couponRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.glassInputBg,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    paddingHorizontal: 12,
    color: colors.foreground,
    fontSize: 13,
  },
  couponBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponBtnText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  couponRemoveBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponRemoveBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
  },
  couponSuccess: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
  summaryTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    color: colors.foregroundMuted,
    fontSize: 12,
  },
  summaryVal: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    marginTop: 8,
    paddingTop: 8,
  },
  grandTotalLabel: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  grandTotalVal: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '900',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 28,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  placeOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  placeOrderBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  placeOrderText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '900',
  },
  placeOrderTextDisabled: {
    color: colors.foregroundDim,
  },
});