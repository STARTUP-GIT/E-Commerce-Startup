import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useShop } from '../hooks/useShop';
import { shopService } from '../services/shopService';
import { productService } from '@/features/products/services/productService';
import { useFileUpload } from '@/features/storage/hooks/useFileUpload';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { SellerAgreementBanner } from './SellerAgreementBanner';
import {
  Store,
  CreditCard,
  Building2,
  Upload,
  Plus,
  Package,
  MapPin,
  Crosshair,
  Check,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface ShopSettingsPageProps {
  navigation: any;
}

export function ShopSettingsPage({ navigation }: ShopSettingsPageProps) {
  const {
    shop,
    bankAccounts,
    isLoadingBank,
    addBankAccount,
    isAddingBank,
    updateBanner,
    updateLogo,
    requestPackingFeeApproval,
    togglePackingFee,
    isRequestingPackingFee,
    isTogglingPackingFee,
    updateShop,
    isUpdatingShop,
  } = useShop();

  const showToast = useUIStore((s) => s.showToast);
  const showConfirm = useConfirmStore((s) => s.showConfirm);

  // File upload hooks
  const { pickAndUpload: uploadLogo, isUploading: isUploadingLogo } = useFileUpload({ folder: 'shop-logo' });
  const { pickAndUpload: uploadBanner, isUploading: isUploadingBanner } = useFileUpload({ folder: 'shop-banner' });

  // Bank Account Dialog
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Packaging Fee State
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [requestedMaxFee, setRequestedMaxFee] = useState('');
  const [feeReason, setFeeReason] = useState('');
  const [feeNotes, setFeeNotes] = useState('');
  const [isPackingEnabled, setIsPackingEnabled] = useState(false);
  const [packingFeeAmount, setPackingFeeAmount] = useState('0');
  const [isSavingFee, setIsSavingFee] = useState(false);

  // Store Pickup Location & Dispatch Coordinates State
  const [pickupLine1, setPickupLine1] = useState('');
  const [pickupLine2, setPickupLine2] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupPostal, setPickupPostal] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  useEffect(() => {
    if (shop) {
      setIsPackingEnabled(Boolean(shop.packingFeeEnabled));
      setPackingFeeAmount(String(shop.packingFeeAmount ?? '0'));
      if (shop.defaultPickupAddress) {
        setPickupLine1(shop.defaultPickupAddress.addressLine1 || '');
        setPickupLine2(shop.defaultPickupAddress.addressLine2 || '');
        setPickupCity(shop.defaultPickupAddress.city || '');
        setPickupState(shop.defaultPickupAddress.state || '');
        setPickupPostal(shop.defaultPickupAddress.postalCode || '');
        if (shop.defaultPickupAddress.latitude) {
          setPickupLat(String(shop.defaultPickupAddress.latitude));
        }
        if (shop.defaultPickupAddress.longitude) {
          setPickupLng(String(shop.defaultPickupAddress.longitude));
        }
      }
    }
  }, [shop]);

  const handleSavePackingFeeSettings = async () => {
    const amountNum = parseFloat(packingFeeAmount);
    if (isPackingEnabled) {
      const maxCeiling =
        shop?.packingFeeApprovedMaxAmount !== null && shop?.packingFeeApprovedMaxAmount !== undefined
          ? Number(shop.packingFeeApprovedMaxAmount)
          : 500;
      if (isNaN(amountNum) || amountNum < 0 || amountNum > maxCeiling) {
        showToast(`Fee must be a valid number between ₹0 and ₹${maxCeiling.toFixed(2)}`, 'error');
        return;
      }
    }
    setIsSavingFee(true);
    try {
      await togglePackingFee({
        enabled: isPackingEnabled,
        amount: isPackingEnabled ? amountNum : 0,
      });
      showToast('Packaging fee settings saved successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save packaging fee settings', 'error');
    } finally {
      setIsSavingFee(false);
    }
  };

  const handleDetectPickupLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied. Please enter coordinates manually.', 'error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPickupLat(pos.coords.latitude.toFixed(6));
      setPickupLng(pos.coords.longitude.toFixed(6));
      showToast('GPS coordinates captured from current device location', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to detect current location', 'error');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSavePickupLocation = async () => {
    if (!pickupLine1.trim() || !pickupCity.trim() || !pickupState.trim() || !pickupPostal.trim()) {
      showToast('Address line 1, city, state, and postal code are required', 'error');
      return;
    }
    setIsSavingLocation(true);
    try {
      await updateShop({
        addressLine1: pickupLine1.trim(),
        addressLine2: pickupLine2.trim() || undefined,
        city: pickupCity.trim(),
        district: pickupCity.trim(),
        state: pickupState.trim(),
        postalCode: pickupPostal.trim(),
        country: 'India',
        latitude: pickupLat ? parseFloat(pickupLat) : undefined,
        longitude: pickupLng ? parseFloat(pickupLng) : undefined,
      });
      showToast('Store pickup location and coordinates updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update pickup location', 'error');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleLogoUpload = async () => {
    const res = await uploadLogo();
    if (res?.url) {
      await updateLogo(res.url);
      showToast('Store logo updated', 'success');
    }
  };

  const handleBannerUpload = async () => {
    const res = await uploadBanner();
    if (res?.url) {
      await updateBanner(res.url);
      showToast('Store banner updated', 'success');
    }
  };

  const handleAddBank = async () => {
    const validation = shopService.validateBankDetails({
      accountHolderName: accountHolder,
      bankName,
      accountNumber,
      ifscCode,
      upiId,
    });

    if (!validation.valid) {
      showToast(validation.error || 'Please fill in bank details', 'error');
      return;
    }

    try {
      await addBankAccount({
        accountHolderName: accountHolder.trim(),
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim(),
        upiId: upiId.trim() || undefined,
      });
      showToast('Settlement bank linked successfully', 'success');
      setBankModalOpen(false);
      setAccountHolder('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setUpiId('');
    } catch (err: any) {
      showToast(err.message || 'Failed to link bank account', 'error');
    }
  };

  const handleRequestPackingFee = async () => {
    const feeNum = parseFloat(requestedMaxFee);
    if (isNaN(feeNum) || feeNum <= 0) {
      showToast('Please enter a positive fee amount', 'error');
      return;
    }
    if (feeReason.trim().length < 10) {
      showToast('Reason must be at least 10 characters', 'error');
      return;
    }

    try {
      await requestPackingFeeApproval({
        requestedMaxFee: feeNum,
        reason: feeReason.trim(),
        supportingNotes: feeNotes.trim() || undefined,
      });
      showToast('Packaging fee authorization requested', 'success');
      setFeeModalOpen(false);
      setRequestedMaxFee('');
      setFeeReason('');
      setFeeNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit packaging fee request', 'error');
    }
  };

  return (
    <DashboardLayout title="Shop & Bank" navigation={navigation} currentRoute="/shop">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Shop &amp; Bank Settings</Text>
          <Text style={styles.subtitle}>Manage your storefront branding, payout bank, and packaging policies.</Text>
        </View>

        {shop && <SellerAgreementBanner shopStatus={shop.status} />}

        {/* Store Branding Card */}
        <Card>
          <CardHeader>
            <CardTitle>Store Branding &amp; Visuals</CardTitle>
            <CardDescription>Custom logo and header banner</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 14 }}>
            {/* Banner preview */}
            <View style={styles.bannerContainer}>
              {shop?.bannerUrl ? (
                <Image source={{ uri: shop.bannerUrl }} style={styles.bannerImg} />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <Text style={styles.bannerPlaceholderText}>No Store Banner Uploaded</Text>
                </View>
              )}
              <Button
                variant="outline"
                size="sm"
                loading={isUploadingBanner}
                onPress={handleBannerUpload}
                icon={<Upload size={13} color="#ffffff" />}
                style={styles.bannerUploadBtn}
              >
                Change Banner
              </Button>
            </View>

            {/* Logo preview */}
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                {shop?.logoUrl ? (
                  <Image source={{ uri: shop.logoUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Store size={26} color="rgba(255, 255, 255, 0.4)" />
                )}
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={styles.shopTitleText}>{shop?.name || 'My Store'}</Text>
                <Text style={styles.slugText}>atlasbasket.com/shop/{shop?.slug || 'slug'}</Text>
                <Button
                  variant="outline"
                  size="sm"
                  loading={isUploadingLogo}
                  onPress={handleLogoUpload}
                  icon={<Upload size={12} color="#ffffff" />}
                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                >
                  Upload Logo
                </Button>
              </View>
            </View>
          </CardContent>
        </Card>

        {/* Packaging Fee Setting */}
        <Card>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Package size={17} color={Colors.purpleLight} />
              <CardTitle>Packaging &amp; Delivery Fee Policy</CardTitle>
            </View>
            <CardDescription>Configure packaging add-ons under admin authorization</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 12 }}>
            <View style={styles.feeStatusRow}>
              <Text style={styles.feeLabel}>Admin Authorization Status:</Text>
              <Badge
                variant={
                  shop?.packingFeeApprovalStatus === 'APPROVED'
                    ? 'success'
                    : shop?.packingFeeApprovalStatus === 'REJECTED'
                    ? 'destructive'
                    : 'default'
                }
              >
                {shop?.packingFeeApprovalStatus || 'NOT REQUESTED'}
              </Badge>
            </View>

            {shop?.packingFeeApprovalStatus === 'APPROVED' ? (
              <View style={{ gap: 12 }}>
                <View style={styles.feeToggleRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.toggleText}>Enable Customer Packaging Fee</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.5)', marginTop: 2 }}>
                      Approved Ceiling: ₹{Number(shop.packingFeeApprovedMaxAmount || 500).toFixed(2)}
                    </Text>
                  </View>
                  <Switch
                    value={Boolean(isPackingEnabled)}
                    onValueChange={(val) => setIsPackingEnabled(val)}
                    trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.purple }}
                    thumbColor="#ffffff"
                  />
                </View>

                {isPackingEnabled && (
                  <View style={{ gap: 8 }}>
                    <Input
                      label={`Packaging Fee Amount (₹)`}
                      placeholder="e.g. 20.00"
                      keyboardType="numeric"
                      value={packingFeeAmount}
                      onChangeText={setPackingFeeAmount}
                    />
                    <Button
                      variant="default"
                      size="sm"
                      loading={isSavingFee || isTogglingPackingFee}
                      onPress={handleSavePackingFeeSettings}
                    >
                      Save Packaging Fee
                    </Button>
                  </View>
                )}
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.6)', lineHeight: 16 }}>
                  You are currently not authorized to charge customers packaging or delivery fees. Administration approval is required.
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setFeeModalOpen(true)}
                >
                  Request Packaging Fee Approval
                </Button>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Store Pickup Location & Dispatch Coordinates */}
        <Card>
          <CardHeader>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin size={17} color={Colors.emerald} />
              <CardTitle>Pickup Location &amp; Dispatch Coordinates</CardTitle>
            </View>
            <CardDescription>Authoritative merchant location for rider pickup and delivery routing</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 10 }}>
            <Input
              label="Address Line 1 *"
              placeholder="Building, street, door no."
              value={pickupLine1}
              onChangeText={setPickupLine1}
            />
            <Input
              label="Address Line 2 (Optional)"
              placeholder="Area, landmark"
              value={pickupLine2}
              onChangeText={setPickupLine2}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="City / District *"
                  placeholder="e.g. Mysuru"
                  value={pickupCity}
                  onChangeText={setPickupCity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="State *"
                  placeholder="e.g. Karnataka"
                  value={pickupState}
                  onChangeText={setPickupState}
                />
              </View>
            </View>
            <Input
              label="Postal Code *"
              placeholder="e.g. 570001"
              keyboardType="number-pad"
              maxLength={6}
              value={pickupPostal}
              onChangeText={setPickupPostal}
            />

            {/* GPS Coordinates */}
            <View style={{ marginTop: 4, gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>GPS Coordinates</Text>
                <TouchableOpacity
                  onPress={handleDetectPickupLocation}
                  disabled={isDetectingLocation}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(59,130,246,0.15)' }}
                >
                  {isDetectingLocation ? (
                    <ActivityIndicator size="small" color="#60a5fa" />
                  ) : (
                    <>
                      <Crosshair size={12} color="#60a5fa" />
                      <Text style={{ fontSize: 10, color: '#93c5fd', fontWeight: '700' }}>Use Current GPS</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Latitude"
                    placeholder="12.3000"
                    keyboardType="numeric"
                    value={pickupLat}
                    onChangeText={setPickupLat}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Longitude"
                    placeholder="76.6500"
                    keyboardType="numeric"
                    value={pickupLng}
                    onChangeText={setPickupLng}
                  />
                </View>
              </View>
            </View>

            <Button
              variant="default"
              size="sm"
              loading={isSavingLocation || isUpdatingShop}
              onPress={handleSavePickupLocation}
              style={{ marginTop: 4 }}
            >
              Save Store Pickup Location
            </Button>
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        <Card>
          <CardHeader>
            <View style={styles.bankHeaderRow}>
              <View>
                <CardTitle>Settlement Bank Accounts</CardTitle>
                <CardDescription>Bank accounts for automated payouts</CardDescription>
              </View>
              <Button
                variant="default"
                size="sm"
                onPress={() => setBankModalOpen(true)}
                icon={<Plus size={14} color="#000000" />}
              >
                Add Bank
              </Button>
            </View>
          </CardHeader>
          <CardContent style={{ padding: 12 }}>
            {isLoadingBank ? (
              <Skeleton height={70} />
            ) : bankAccounts.length > 0 ? (
              bankAccounts.map((b) => (
                <View key={b.id} style={styles.bankItem}>
                  <View style={styles.bankIconBox}>
                    <Building2 size={20} color={Colors.emerald} />
                  </View>
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.bankName}>{b.bankName}</Text>
                    <Text style={styles.bankAccountNum}>
                      A/C: ••••{b.accountNumber.slice(-4)} • IFSC: {b.ifscCode}
                    </Text>
                    <Text style={styles.holderName}>{b.accountHolderName}</Text>
                  </View>
                  {b.isDefault && <Badge variant="success">Default</Badge>}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No bank account linked. Add one to receive payouts.</Text>
            )}
          </CardContent>
        </Card>

        {/* Add Bank Dialog */}
        <Dialog
          open={bankModalOpen}
          onClose={() => setBankModalOpen(false)}
          title="Link Settlement Bank"
          description="Enter direct deposit account details for automated payouts"
        >
          <View style={{ gap: 10 }}>
            <Input
              label="Account Holder Name"
              placeholder="As printed on passbook"
              value={accountHolder}
              onChangeText={setAccountHolder}
            />
            <Input
              label="Bank Name"
              placeholder="HDFC Bank, State Bank of India, etc."
              value={bankName}
              onChangeText={setBankName}
            />
            <Input
              label="Account Number"
              placeholder="012345678901"
              keyboardType="number-pad"
              value={accountNumber}
              onChangeText={setAccountNumber}
            />
            <Input
              label="IFSC Code"
              placeholder="HDFC0001234"
              autoCapitalize="characters"
              value={ifscCode}
              onChangeText={setIfscCode}
            />
            <Input
              label="UPI ID (Optional)"
              placeholder="merchant@okhdfcbank"
              autoCapitalize="none"
              value={upiId}
              onChangeText={setUpiId}
            />
            <Button
              variant="default"
              loading={isAddingBank}
              onPress={handleAddBank}
              style={{ marginTop: 10 }}
            >
              Verify &amp; Link Account
            </Button>
          </View>
        </Dialog>

        {/* Packaging Fee Request Dialog */}
        <Dialog
          open={feeModalOpen}
          onClose={() => setFeeModalOpen(false)}
          title="Packaging Fee Authorization"
          description="Request marketplace permission to charge customer packaging fees"
        >
          <View style={{ gap: 10 }}>
            <Input
              label="Requested Max Fee (₹)"
              placeholder="40.00"
              keyboardType="decimal-pad"
              value={requestedMaxFee}
              onChangeText={setRequestedMaxFee}
            />
            <Input
              label="Reason for Packaging Fee"
              placeholder="Custom bubble wrap, wooden crate protection, fragile ceramic packing…"
              multiline
              numberOfLines={3}
              value={feeReason}
              onChangeText={setFeeReason}
            />
            <Button
              variant="default"
              loading={isRequestingPackingFee}
              onPress={handleRequestPackingFee}
              style={{ marginTop: 10 }}
            >
              Submit Authorization Request
            </Button>
          </View>
        </Dialog>
      </ScrollView>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    marginTop: 2,
  },
  bannerContainer: {
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    alignItems: 'center',
  },
  bannerPlaceholderText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  bannerUploadBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    height: 60,
    width: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopTitleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  slugText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 1,
  },
  feeStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  feeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  bankHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  bankIconBox: {
    height: 42,
    width: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  bankAccountNum: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
  },
  holderName: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.35)',
  },
  emptyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    paddingVertical: 14,
  },
});
