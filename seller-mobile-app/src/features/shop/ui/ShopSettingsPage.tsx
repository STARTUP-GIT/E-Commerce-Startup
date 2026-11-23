import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
  Linking,
} from 'react-native';
import * as Location from 'expo-location';
import { useShop } from '../hooks/useShop';
import { shopApi } from '../api/shopApi';
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
import { PackagingCatalogueSection } from './PackagingCatalogueSection';
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
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Eye,
} from 'lucide-react-native';
import axiosInstance from '@/lib/axios/axiosInstance';
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
    updateBankAccount,
    isUpdatingBank,
    deleteBankAccount,
    isDeletingBank,
    setDefaultBankAccount,
    isSettingDefaultBank,
    updateBanner,
    updateLogo,
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

  // Edit Bank Account Dialog
  const [editBankModalOpen, setEditBankModalOpen] = useState(false);
  const [editingBankId, setEditingBankId] = useState('');
  const [editAccountHolder, setEditAccountHolder] = useState('');
  const [editBankName, setEditBankName] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfscCode, setEditIfscCode] = useState('');
  const [editUpiId, setEditUpiId] = useState('');

  // Store Pickup Location & Dispatch Coordinates State
  const [doorNo, setDoorNo] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [street, setStreet] = useState('');
  const [cross, setCross] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pickupCity, setPickupCity] = useState('');
  const [pickupDistrict, setPickupDistrict] = useState('');
  const [pickupState, setPickupState] = useState('');
  const [pickupPostal, setPickupPostal] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<string>('MANUALLY_ENTERED');
  const [hasMissingDoorNo, setHasMissingDoorNo] = useState(false);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);

  // Address search state
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const mobileGeocodeReqId = useRef(0);

  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  useEffect(() => {
    if (shop && shop.defaultPickupAddress) {
      const addr = shop.defaultPickupAddress;
      setDoorNo(addr.doorNo || '');
      setBuildingName(addr.buildingName || '');
      setStreet(addr.street || '');
      setCross(addr.cross || '');
      setArea(addr.area || '');
      setLandmark(addr.landmark || '');
      setPickupCity(addr.city || '');
      setPickupDistrict(addr.district || addr.city || '');
      setPickupState(addr.state || '');
      setPickupPostal(addr.postalCode || '');
      if (addr.latitude !== undefined && addr.latitude !== null) {
        setPickupLat(String(addr.latitude));
      }
      if (addr.longitude !== undefined && addr.longitude !== null) {
        setPickupLng(String(addr.longitude));
      }
      if (addr.accuracyMeters) {
        setAccuracyMeters(addr.accuracyMeters);
      }
      if (addr.locationSource) {
        setLocationSource(addr.locationSource);
      }
      if (!addr.area && addr.addressLine2) {
        setArea(addr.addressLine2);
      }
    }
  }, [shop]);

  const handleDetectPickupLocation = async () => {
    setIsDetectingLocation(true);
    setGpsWarning(null);
    const reqId = ++mobileGeocodeReqId.current;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied. Please enter coordinates or search manually.', 'error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));
      const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
      setPickupLat(String(lat));
      setPickupLng(String(lng));
      setAccuracyMeters(acc);

      if (acc && acc > 30) {
        setLocationSource('GPS_APPROXIMATE');
        setGpsWarning(
          `GPS fix is approximate (±${acc}m). Satellites have placed your pin within ${acc} metres of your actual position. Because riders need your exact storefront entrance, please fine-tune the pin using the micro-adjust buttons below.`
        );
      } else {
        setLocationSource('GPS_DETECTED');
        setGpsWarning(null);
      }

      try {
        const res = await axiosInstance.post('/api/locations/resolve', {
          latitude: lat,
          longitude: lng,
          userRole: 'SELLER',
        });
        if (reqId !== mobileGeocodeReqId.current) return;
        const loc = res.data?.resolvedLocation;
        if (loc) {
          // Preserve manual doorNo and buildingName
          if (loc.doorNo) setDoorNo(loc.doorNo);
          if (loc.buildingName) setBuildingName(loc.buildingName);
          if (loc.street) setStreet(loc.street);
          if (loc.cross) setCross(loc.cross);
          if (loc.area) setArea(loc.area);
          else if (loc.addressLine2) setArea(loc.addressLine2);
          if (loc.landmark) setLandmark(loc.landmark);
          if (loc.city || loc.district) {
            setPickupCity(loc.city || loc.district);
            setPickupDistrict(loc.district || loc.city);
          }
          if (loc.state) setPickupState(loc.state);
          if (loc.postalCode) setPickupPostal(loc.postalCode);

          if (loc.hasMissingDoorNo || (!loc.doorNo && !doorNo)) {
            setHasMissingDoorNo(true);
            showToast('GPS detected street & area. Please enter your Door / Shop number.', 'info');
          } else {
            setHasMissingDoorNo(false);
            showToast('High-accuracy GPS address populated. Review before saving.', 'success');
          }
        } else {
          setHasMissingDoorNo(true);
          showToast('GPS coordinates captured. Please enter your shop address.', 'success');
        }
      } catch {
        if (reqId === mobileGeocodeReqId.current) {
          setHasMissingDoorNo(true);
          showToast('GPS coordinates captured. Please enter address details manually.', 'info');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to detect current location', 'error');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSearchAddress = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      showToast('Please type at least 3 characters to search', 'error');
      return;
    }
    setIsSearching(true);
    try {
      const results = await shopApi.searchAddresses(searchQuery.trim(), pickupCity || undefined);
      setSearchResults(results || []);
      if (!results || results.length === 0) {
        showToast('No matching locations found. Try different keywords.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to search address', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    if (result.doorNo) setDoorNo(result.doorNo);
    if (result.buildingName) setBuildingName(result.buildingName);
    if (result.street) setStreet(result.street);
    if (result.cross) setCross(result.cross);
    if (result.area) setArea(result.area);
    if (result.landmark) setLandmark(result.landmark);
    if (result.city) setPickupCity(result.city);
    if (result.district) setPickupDistrict(result.district);
    if (result.state) setPickupState(result.state);
    if (result.postalCode) setPickupPostal(result.postalCode);
    if (result.latitude) setPickupLat(String(result.latitude));
    if (result.longitude) setPickupLng(String(result.longitude));
    setLocationSource('ADDRESS_SEARCHED');
    setAccuracyMeters(result.accuracyMeters || 15);
    setSearchModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);

    if (result.hasMissingDoorNo || !result.doorNo) {
      setHasMissingDoorNo(true);
      showToast('Location selected. Please add your Door / Shop number.', 'info');
    } else {
      setHasMissingDoorNo(false);
      showToast('Address populated from search. Review before saving.', 'success');
    }
  };

  const resolveMobileCoordinates = async (lat: number, lng: number) => {
    const reqId = ++mobileGeocodeReqId.current;
    try {
      const res = await axiosInstance.post('/api/locations/resolve', {
        latitude: lat,
        longitude: lng,
        userRole: 'SELLER',
      });
      if (reqId !== mobileGeocodeReqId.current) return;
      const loc = res.data?.resolvedLocation;
      if (loc) {
        // Crucial: preserve manual doorNo and buildingName
        if (loc.doorNo) setDoorNo(loc.doorNo);
        if (loc.buildingName) setBuildingName(loc.buildingName);
        if (loc.street) setStreet(loc.street);
        if (loc.cross) setCross(loc.cross);
        if (loc.area) setArea(loc.area);
        else if (loc.addressLine2) setArea(loc.addressLine2);
        if (loc.landmark) setLandmark(loc.landmark);
        if (loc.city || loc.district) {
          setPickupCity(loc.city || loc.district);
          setPickupDistrict(loc.district || loc.city);
        }
        if (loc.state) setPickupState(loc.state);
        if (loc.postalCode) setPickupPostal(loc.postalCode);
      }
    } catch {
      // silently keep coordinates on network error
    }
  };

  const handleNudgeCoordinate = (direction: 'N' | 'S' | 'E' | 'W') => {
    const lat = parseFloat(pickupLat) || 0;
    const lng = parseFloat(pickupLng) || 0;
    if (!lat || !lng) return;
    const step = 0.0001; // ~11 meters
    let newLat = lat;
    let newLng = lng;
    if (direction === 'N') newLat += step;
    if (direction === 'S') newLat -= step;
    if (direction === 'E') newLng += step;
    if (direction === 'W') newLng -= step;
    const finalLat = parseFloat(newLat.toFixed(6));
    const finalLng = parseFloat(newLng.toFixed(6));
    setPickupLat(finalLat.toFixed(6));
    setPickupLng(finalLng.toFixed(6));
    setLocationSource('MAP_PIN_SELECTED');
    resolveMobileCoordinates(finalLat, finalLng);
  };

  const handleOpenInMaps = () => {
    const lat = parseFloat(pickupLat);
    const lng = parseFloat(pickupLng);
    if (lat && lng) {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
    } else {
      showToast('Coordinates not available to preview on map', 'info');
    }
  };

  const handleOpenStreetView = () => {
    const lat = parseFloat(pickupLat);
    const lng = parseFloat(pickupLng);
    if (lat && lng) {
      Linking.openURL(`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`);
    } else {
      showToast('Coordinates not available for Street View preview', 'info');
    }
  };

  const handleConfirmStorefront = () => {
    setLocationSource('STREET_VIEW_CONFIRMED');
    setAccuracyMeters(3);
    setGpsWarning(null);
    showToast('Storefront entrance visually confirmed at this spot!', 'success');
  };

  const handleSavePickupLocation = async () => {
    const dNo = doorNo.trim();
    const st = street.trim();
    const ar = area.trim();
    const ct = pickupCity.trim();
    const stt = pickupState.trim();
    const pin = pickupPostal.trim();

    if (!dNo) {
      showToast('House / Door / Shop number is required', 'error');
      return;
    }
    if (!st) {
      showToast('Street / Road name is required', 'error');
      return;
    }
    if (!ar) {
      showToast('Area / Locality is required', 'error');
      return;
    }
    if (!ct) {
      showToast('City / Town is required', 'error');
      return;
    }
    if (!stt) {
      showToast('State is required', 'error');
      return;
    }
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      showToast('Enter a valid 6-digit Indian PIN code', 'error');
      return;
    }

    const compiledLine1 = [dNo, buildingName.trim(), st].filter(Boolean).join(', ');
    const compiledLine2 = [cross.trim(), ar, landmark.trim()].filter(Boolean).join(', ');

    setIsSavingLocation(true);
    try {
      await updateShop({
        doorNo: dNo,
        buildingName: buildingName.trim() || undefined,
        street: st,
        cross: cross.trim() || undefined,
        area: ar,
        landmark: landmark.trim() || undefined,
        addressLine1: compiledLine1,
        addressLine2: compiledLine2 || undefined,
        city: ct,
        district: pickupDistrict.trim() || ct,
        state: stt,
        postalCode: pin,
        country: 'India',
        latitude: pickupLat ? parseFloat(pickupLat) : undefined,
        longitude: pickupLng ? parseFloat(pickupLng) : undefined,
        locationSource,
        accuracyMeters: accuracyMeters ?? undefined,
      });
      setHasMissingDoorNo(false);
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

  const handleOpenEditBank = (b: any) => {
    setEditingBankId(b.id);
    setEditAccountHolder(b.accountHolderName || '');
    setEditBankName(b.bankName || '');
    setEditAccountNumber(b.accountNumber || '');
    setEditIfscCode(b.ifscCode || '');
    setEditUpiId(b.upiId || '');
    setEditBankModalOpen(true);
  };

  const handleSaveEditBank = async () => {
    if (!editAccountHolder.trim() || !editBankName.trim() || !editAccountNumber.trim() || !editIfscCode.trim()) {
      showToast('All bank account fields are required', 'error');
      return;
    }
    try {
      await updateBankAccount({
        id: editingBankId,
        payload: {
          accountHolderName: editAccountHolder.trim(),
          bankName: editBankName.trim(),
          accountNumber: editAccountNumber.trim(),
          ifscCode: editIfscCode.trim().toUpperCase(),
          upiId: editUpiId.trim() || undefined,
        },
      });
      showToast('Bank account updated successfully', 'success');
      setEditBankModalOpen(false);
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to update bank account', 'error');
    }
  };

  const handleDeleteBank = (id: string) => {
    showConfirm({
      title: 'Remove Bank Account',
      message: 'Are you sure you want to remove this bank account? Historical records will be preserved.',
      confirmText: 'Remove Account',
      onConfirm: async () => {
        try {
          await deleteBankAccount(id);
          showToast('Bank account removed successfully', 'success');
        } catch (err: any) {
          showToast(err.response?.data?.message || err.message || 'Failed to remove bank account', 'error');
        }
      },
    });
  };

  const handleSetDefaultBank = async (id: string) => {
    try {
      await setDefaultBankAccount(id);
      showToast('Default settlement bank account updated', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to update default account', 'error');
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

        {/* Packaging Catalogue Section */}
        <PackagingCatalogueSection />

        {/* Store Pickup Location & Dispatch Coordinates */}
        <Card>
          <CardHeader>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPin size={17} color={Colors.emerald} />
                <CardTitle>Pickup Location &amp; Dispatch Coordinates</CardTitle>
              </View>
              <Badge variant={locationSource === 'STREET_VIEW_CONFIRMED' ? 'success' : locationSource === 'GPS_DETECTED' ? 'success' : locationSource === 'GPS_APPROXIMATE' ? 'warning' : locationSource === 'ADDRESS_SEARCHED' ? 'default' : 'secondary'}>
                {locationSource === 'STREET_VIEW_CONFIRMED'
                  ? 'Street View Confirmed'
                  : locationSource === 'GPS_DETECTED'
                  ? `GPS Fix (±${accuracyMeters || 10}m)`
                  : locationSource === 'GPS_APPROXIMATE'
                  ? `Approx GPS (±${accuracyMeters || 95}m)`
                  : locationSource === 'ADDRESS_SEARCHED'
                  ? 'Address Searched'
                  : locationSource === 'MAP_PIN_SELECTED'
                  ? 'Entrance Pin Set'
                  : 'Manual Entry'}
              </Badge>
            </View>
            <CardDescription>Authoritative merchant pickup location for rider dispatch and customer ETA calculation</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 12 }}>
            {/* Quick Action Buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                onPress={handleDetectPickupLocation}
                disabled={isDetectingLocation}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(16, 185, 129, 0.3)',
                }}
              >
                {isDetectingLocation ? (
                  <ActivityIndicator size="small" color={Colors.emerald} />
                ) : (
                  <>
                    <Crosshair size={14} color={Colors.emerald} />
                    <Text style={{ fontSize: 11, color: Colors.emerald, fontWeight: '700' }}>Use GPS</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSearchModalOpen(true)}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                }}
              >
                <Search size={14} color="#60a5fa" />
                <Text style={{ fontSize: 11, color: '#93c5fd', fontWeight: '700' }}>Search Address</Text>
              </TouchableOpacity>

              {pickupLat && pickupLng ? (
                <>
                  <TouchableOpacity
                    onPress={handleOpenStreetView}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingVertical: 10,
                      paddingHorizontal: 8,
                      borderRadius: 10,
                      backgroundColor: 'rgba(234, 179, 8, 0.15)',
                      borderWidth: 1,
                      borderColor: 'rgba(234, 179, 8, 0.3)',
                    }}
                  >
                    <Eye size={13} color="#fde047" />
                    <Text style={{ fontSize: 11, color: '#fef08a', fontWeight: '700' }}>360° Street</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleOpenInMaps}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 10,
                      borderRadius: 10,
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderWidth: 1,
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ExternalLink size={14} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>

            {/* Street View Storefront Visual Confirmation Banner */}
            {pickupLat && pickupLng ? (
              locationSource === 'STREET_VIEW_CONFIRMED' ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <CheckCircle2 size={16} color="#34d399" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#a7f3d0' }}>Storefront Entrance Confirmed</Text>
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                      Storefront verified for rider dispatch and precise customer navigation.
                    </Text>
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: 10,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>Verify Storefront Entrance</Text>
                    <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                      Check 360° Street View or adjust the pin to face your shop entrance.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleConfirmStorefront}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 6,
                      backgroundColor: 'rgba(16, 185, 129, 0.2)',
                      borderWidth: 1,
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    <Check size={12} color="#34d399" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#34d399' }}>Confirm Spot</Text>
                  </TouchableOpacity>
                </View>
              )
            ) : null}

            {/* Missing Door Number Alert */}
            {hasMissingDoorNo && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <AlertTriangle size={16} color="#fbbf24" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#fef3c7' }}>Door / Shop Number Required</Text>
                  <Text style={{ fontSize: 11, color: '#fde68a', marginTop: 2 }}>
                    GPS/Search identified your street &amp; area, but cannot detect your exact door number. Please specify your Door / Shop number below for delivery dispatch.
                  </Text>
                </View>
              </View>
            )}

            {/* GPS Warning Banner */}
            {gpsWarning && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  padding: 8,
                  borderRadius: 6,
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(59, 130, 246, 0.2)',
                }}
              >
                <AlertTriangle size={14} color="#93c5fd" />
                <Text style={{ fontSize: 10, color: '#bfdbfe', flex: 1 }}>{gpsWarning}</Text>
              </View>
            )}

            {/* Structured Address Fields */}
            <Input
              label="House / Door / Shop No. *"
              placeholder="e.g. Shop #4, Ground Floor"
              value={doorNo}
              onChangeText={setDoorNo}
            />

            <Input
              label="Building / Apartment / Complex Name"
              placeholder="e.g. Phoenix Commercial Complex"
              value={buildingName}
              onChangeText={setBuildingName}
            />

            <Input
              label="Street / Road Name *"
              placeholder="e.g. 5th Main Road, Double Road"
              value={street}
              onChangeText={setStreet}
            />

            <Input
              label="Cross / Main Road (Optional)"
              placeholder="e.g. Near 2nd Cross Junction"
              value={cross}
              onChangeText={setCross}
            />

            <Input
              label="Area / Locality *"
              placeholder="e.g. Saraswathipuram / Indiranagar"
              value={area}
              onChangeText={setArea}
            />

            <Input
              label="Landmark (Optional)"
              placeholder="e.g. Opposite Post Office / Near Bank"
              value={landmark}
              onChangeText={setLandmark}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="City / Town *"
                  placeholder="e.g. Mysuru"
                  value={pickupCity}
                  onChangeText={setPickupCity}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="District *"
                  placeholder="e.g. Mysuru District"
                  value={pickupDistrict}
                  onChangeText={setPickupDistrict}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="State *"
                  placeholder="e.g. Karnataka"
                  value={pickupState}
                  onChangeText={setPickupState}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="PIN Code * (6 digits)"
                  placeholder="e.g. 570001"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={pickupPostal}
                  onChangeText={setPickupPostal}
                />
              </View>
            </View>

            {/* GPS Coordinates & Fine Tuning */}
            <View style={{ gap: 8, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Navigation size={13} color="#60a5fa" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>GPS Dispatch Coordinates</Text>
                </View>
                {accuracyMeters ? (
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Accuracy: ±{accuracyMeters}m</Text>
                ) : null}
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

              {/* Nudge Buttons for Fine Tuning */}
              {pickupLat && pickupLng ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' }}>
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>Micro-adjust dispatch pin (~11m):</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['N', 'S', 'W', 'E'] as const).map((dir) => (
                      <TouchableOpacity
                        key={dir}
                        onPress={() => handleNudgeCoordinate(dir)}
                        style={{
                          width: 28,
                          height: 24,
                          borderRadius: 6,
                          backgroundColor: 'rgba(255,255,255,0.06)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#ffffff' }}>{dir}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
            </View>

            {/* Assembled Pickup Address Summary Card */}
            {(doorNo || street || area || pickupCity) ? (
              <View style={{ padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={13} color={Colors.emerald} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>Dispatch Address Preview</Text>
                </View>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 16 }}>
                  {[
                    [doorNo, buildingName].filter(Boolean).join(', '),
                    [street, cross].filter(Boolean).join(', '),
                    [area, landmark].filter(Boolean).join(', '),
                    [pickupCity, pickupDistrict].filter(Boolean).join(', '),
                    [pickupState, pickupPostal].filter(Boolean).join(' - '),
                    'India',
                  ]
                    .filter((part) => part.trim().length > 0)
                    .join('\n')}
                </Text>
                {pickupLat && pickupLng ? (
                  <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                    Coordinates: {pickupLat}, {pickupLng}
                  </Text>
                ) : null}
              </View>
            ) : null}

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
                      A/C: {b.accountNumber?.includes('•') ? b.accountNumber : `••••${b.accountNumber?.slice(-4)}`} • IFSC: {b.ifscCode}
                    </Text>
                    <Text style={styles.holderName}>{b.accountHolderName}</Text>
                    {b.upiId ? (
                      <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2 }}>
                        UPI: {b.upiId}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    {b.isDefault ? (
                      <Badge variant="success">Default</Badge>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleSetDefaultBank(b.id)}
                        disabled={isSettingDefaultBank}
                        style={{ paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, backgroundColor: 'rgba(168, 85, 247, 0.15)' }}
                      >
                        <Text style={{ fontSize: 10, color: Colors.purpleLight, fontWeight: '700' }}>Make Default</Text>
                      </TouchableOpacity>
                    )}
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                      <TouchableOpacity onPress={() => handleOpenEditBank(b)} style={{ padding: 4 }}>
                        <Pencil size={15} color="rgba(255, 255, 255, 0.7)" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteBank(b.id)} disabled={isDeletingBank} style={{ padding: 4 }}>
                        <Trash2 size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 8 }}>
                <View style={{ height: 44, width: 44, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={22} color="rgba(255, 255, 255, 0.35)" />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>No Bank Accounts Linked</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255, 255, 255, 0.45)', textAlign: 'center', maxWidth: 260 }}>
                  You currently have no settlement account linked. You can add one anytime below to receive payouts.
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setBankModalOpen(true)}
                  icon={<Plus size={13} color="#ffffff" />}
                  style={{ marginTop: 6 }}
                >
                  Add Bank Account
                </Button>
              </View>
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

        {/* Edit Bank Dialog */}
        <Dialog
          open={editBankModalOpen}
          onClose={() => setEditBankModalOpen(false)}
          title="Edit Settlement Bank"
          description="Update account details. Changing account number or IFSC resets verification status."
        >
          <View style={{ gap: 10 }}>
            <Input
              label="Account Holder Name"
              placeholder="As printed on passbook"
              value={editAccountHolder}
              onChangeText={setEditAccountHolder}
            />
            <Input
              label="Bank Name"
              placeholder="HDFC Bank, State Bank of India, etc."
              value={editBankName}
              onChangeText={setEditBankName}
            />
            <Input
              label="Account Number"
              placeholder="Enter account number or keep existing"
              value={editAccountNumber}
              onChangeText={setEditAccountNumber}
            />
            <Input
              label="IFSC Code"
              placeholder="HDFC0001234"
              autoCapitalize="characters"
              value={editIfscCode}
              onChangeText={setEditIfscCode}
            />
            <Input
              label="UPI ID (Optional)"
              placeholder="merchant@okhdfcbank"
              autoCapitalize="none"
              value={editUpiId}
              onChangeText={setEditUpiId}
            />
            <Button
              variant="default"
              loading={isUpdatingBank}
              onPress={handleSaveEditBank}
              style={{ marginTop: 10 }}
            >
              Save Bank Changes
            </Button>
          </View>
        </Dialog>

        {/* Address Search Dialog */}
        <Dialog
          open={searchModalOpen}
          onClose={() => setSearchModalOpen(false)}
          title="Search Address or Landmark"
          description="Type shop, building, street or locality name to auto-fill address"
        >
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Input
                  placeholder="e.g. Indiranagar 100ft Road, MG Road..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={handleSearchAddress}
                  returnKeyType="search"
                />
              </View>
              <Button
                variant="default"
                size="sm"
                loading={isSearching}
                onPress={handleSearchAddress}
                icon={<Search size={14} color="#000000" />}
              >
                Search
              </Button>
            </View>

            {searchResults.length > 0 ? (
              <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
                <View style={{ gap: 8 }}>
                  {searchResults.map((item, idx) => (
                    <TouchableOpacity
                      key={item.placeId || `${item.latitude}-${item.longitude}-${idx}`}
                      onPress={() => handleSelectSearchResult(item)}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        gap: 2,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MapPin size={13} color={Colors.emerald} />
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                          {item.formattedAddress.split(',')[0]}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.55)', paddingLeft: 19 }}>
                        {item.formattedAddress}
                      </Text>
                      {item.hasMissingDoorNo && (
                        <Text style={{ fontSize: 9, color: '#fbbf24', paddingLeft: 19, marginTop: 2 }}>
                          * Door number will need manual entry
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            ) : null}
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
