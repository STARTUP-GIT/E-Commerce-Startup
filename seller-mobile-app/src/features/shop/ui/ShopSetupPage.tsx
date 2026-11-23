import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useShop } from '../hooks/useShop';
import { shopApi } from '../api/shopApi';
import { shopService } from '../services/shopService';
import { useLocationStore } from '@/lib/store/locationStore';
import { useUIStore } from '@/lib/store/uiStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Store, ChevronDown, Check, MapPin, Crosshair, AlertTriangle } from 'lucide-react-native';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Colors } from '@/theme/colors';

interface ShopSetupPageProps {
  navigation: any;
}

export function ShopSetupPage({ navigation }: ShopSetupPageProps) {
  const { createShop, isCreatingShop } = useShop();
  const showToast = useUIStore((s) => s.showToast);
  const setComingSoon = useLocationStore((s) => s.setComingSoon);

  const [shopName, setShopName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [doorNo, setDoorNo] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [street, setStreet] = useState('');
  const [cross, setCross] = useState('');
  const [area, setArea] = useState('');
  const [landmark, setLandmark] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [locationSource, setLocationSource] = useState<string>('MANUALLY_ENTERED');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [hasMissingDoorNo, setHasMissingDoorNo] = useState(false);
  const [gstRegistered, setGstRegistered] = useState(false);
  const [gstNumber, setGstNumber] = useState('');

  // Location config
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [cityModalOpen, setCityModalOpen] = useState(false);

  const { data: locationsConfig } = useQuery({
    queryKey: ['locations-config'],
    queryFn: shopApi.getLocationsStates,
    staleTime: 10 * 60 * 1000,
  });

  const allStates = locationsConfig?.allStates ?? [];
  const districtRequired = locationsConfig?.districtRequired !== false;

  const { data: districtsData } = useQuery({
    queryKey: ['locations-districts', selectedState],
    queryFn: () => shopApi.getLocationsDistricts(selectedState),
    enabled: !!selectedState,
    staleTime: 10 * 60 * 1000,
  });

  const districts = districtsData?.allDistricts ?? [];

  const handleNameChange = (val: string) => {
    setShopName(val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(autoSlug);
  };

  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showToast('Location permission denied. Please enter address manually.', 'error');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));
      const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
      setLatitude(lat);
      setLongitude(lng);
      setAccuracyMeters(acc);
      if (acc && acc > 15) {
        setLocationSource('GPS_APPROXIMATE');
      } else {
        setLocationSource('GPS_DETECTED');
      }

      try {
        const res = await axiosInstance.post('/api/locations/resolve', {
          latitude: lat,
          longitude: lng,
          userRole: 'SELLER',
        });
        const loc = res.data?.resolvedLocation;
        if (loc) {
          if (loc.doorNo) setDoorNo(loc.doorNo);
          if (loc.buildingName) setBuildingName(loc.buildingName);
          if (loc.street) setStreet(loc.street);
          if (loc.cross) setCross(loc.cross);
          if (loc.area) setArea(loc.area);
          else if (loc.addressLine2) setArea(loc.addressLine2);
          if (loc.landmark) setLandmark(loc.landmark);
          if (loc.postalCode) setPostalCode(loc.postalCode);

          if (loc.state) {
            const matchedState = allStates.find((s) => s.name.toLowerCase() === loc.state.toLowerCase());
            if (matchedState) {
              setSelectedState(matchedState.name);
            } else {
              setSelectedState(loc.state);
            }
          }
          if (loc.city || loc.district) {
            setSelectedCity(loc.city || loc.district);
          }

          if (loc.hasMissingDoorNo || !loc.doorNo) {
            setHasMissingDoorNo(true);
            showToast('GPS detected area. Please enter your exact Door / Shop number.', 'info');
          } else {
            setHasMissingDoorNo(false);
            showToast('Location and address detected via GPS.', 'success');
          }
        } else {
          setHasMissingDoorNo(true);
          showToast('GPS coordinates captured. Please enter your shop address.', 'success');
        }
      } catch {
        setHasMissingDoorNo(true);
        showToast('GPS coordinates captured. Please complete address manually.', 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to detect current location', 'error');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handleSelectState = (st: { name: string; isEnabled: boolean }) => {
    setStateModalOpen(false);
    if (!st.isEnabled) {
      setComingSoon(true, st.name);
      return;
    }
    setSelectedState(st.name);
    setSelectedCity('');
  };

  const handleSelectCity = (d: { name: string; isEnabled: boolean }) => {
    setCityModalOpen(false);
    if (!d.isEnabled) {
      setComingSoon(true, selectedState, d.name);
      return;
    }
    setSelectedCity(d.name);
  };

  const handleSubmit = async () => {
    const compiledLine1 = [doorNo.trim(), buildingName.trim(), street.trim()].filter(Boolean).join(', ') || addressLine1.trim();
    const compiledLine2 = [cross.trim(), area.trim(), landmark.trim()].filter(Boolean).join(', ') || addressLine2.trim();

    const validation = shopService.validateShopSetup(
      {
        shopName,
        slug,
        description,
        phone,
        doorNo: doorNo.trim(),
        buildingName: buildingName.trim() || undefined,
        street: street.trim(),
        cross: cross.trim() || undefined,
        area: area.trim(),
        landmark: landmark.trim() || undefined,
        addressLine1: compiledLine1,
        addressLine2: compiledLine2 || undefined,
        city: selectedCity,
        district: selectedCity,
        state: selectedState,
        postalCode: postalCode.trim(),
        country: 'India',
        latitude,
        longitude,
      },
      districtRequired
    );

    if (!validation.valid) {
      showToast(validation.error || 'Please fill in required fields', 'error');
      return;
    }

    try {
      await createShop({
        shopName: shopName.trim(),
        slug: slug.trim(),
        description: description.trim(),
        phone: phone.trim(),
        doorNo: doorNo.trim() || undefined,
        buildingName: buildingName.trim() || undefined,
        street: street.trim() || undefined,
        cross: cross.trim() || undefined,
        area: area.trim() || undefined,
        landmark: landmark.trim() || undefined,
        addressLine1: compiledLine1,
        addressLine2: compiledLine2 || undefined,
        city: selectedCity.trim(),
        district: selectedCity.trim(),
        state: selectedState.trim(),
        postalCode: postalCode.trim(),
        country: 'India',
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        locationSource,
        accuracyMeters: accuracyMeters ?? undefined,
        gstRegistered,
        gstNumber: gstRegistered ? gstNumber.trim() : undefined,
      });
      showToast('Storefront created successfully! Awaiting approval.', 'success');
      navigation.navigate('Dashboard');
    } catch (err: any) {
      showToast(err.message || 'Failed to create storefront', 'error');
    }
  };

  return (
    <DashboardLayout title="Create Shop" navigation={navigation} currentRoute="/shop">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Store Profile</Text>
          <Text style={styles.subtitle}>Configure your merchant storefront and dispatch location</Text>
        </View>

        <Card>
          <CardHeader>
            <View style={styles.cardHeaderIcon}>
              <Store size={18} color={Colors.purpleLight} />
              <CardTitle>Store Identity</CardTitle>
            </View>
            <CardDescription>Public name, slug, and description</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 8 }}>
            <Input
              label="Store Name"
              placeholder="e.g. Artisans Studio"
              value={shopName}
              onChangeText={handleNameChange}
            />
            <Input
              label="Store Handle / Slug"
              placeholder="artisans-studio"
              autoCapitalize="none"
              value={slug}
              onChangeText={setSlug}
            />
            <Input
              label="Store Description"
              placeholder="Tell buyers about your handmade crafts, prints, and specialty goods…"
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </CardContent>
        </Card>

        {/* Pickup Dispatch Address */}
        <Card>
          <CardHeader>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} color={Colors.purpleLight} />
                <CardTitle>Pickup Dispatch Address</CardTitle>
              </View>
              <TouchableOpacity
                onPress={handleDetectLocation}
                disabled={isDetectingLocation}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                  backgroundColor: 'rgba(168, 85, 247, 0.15)',
                }}
              >
                {isDetectingLocation ? (
                  <ActivityIndicator size="small" color={Colors.purpleLight} />
                ) : (
                  <>
                    <Crosshair size={12} color={Colors.purpleLight} />
                    <Text style={{ fontSize: 10, color: Colors.purpleLight, fontWeight: '700' }}>Use GPS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            <CardDescription>Address where platform couriers collect merchant orders for dispatch</CardDescription>
          </CardHeader>
          <CardContent style={{ gap: 8 }}>
            {hasMissingDoorNo && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 6,
                  padding: 8,
                  borderRadius: 6,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <AlertTriangle size={14} color="#fbbf24" style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 10, color: '#fde68a', flex: 1 }}>
                  GPS detected area &amp; street, but cannot detect door number. Please specify your Door / Shop number.
                </Text>
              </View>
            )}

            <Input
              label="House / Door / Shop No. *"
              placeholder="e.g. Shop #12, Ground Floor"
              value={doorNo}
              onChangeText={setDoorNo}
            />

            <Input
              label="Building / Complex Name (Optional)"
              placeholder="e.g. Orion Avenue"
              value={buildingName}
              onChangeText={setBuildingName}
            />

            <Input
              label="Street / Road Name *"
              placeholder="e.g. 1st Main Road"
              value={street}
              onChangeText={setStreet}
            />

            <Input
              label="Cross / Main Road (Optional)"
              placeholder="e.g. Near 4th Cross"
              value={cross}
              onChangeText={setCross}
            />

            <Input
              label="Area / Locality *"
              placeholder="e.g. Indiranagar"
              value={area}
              onChangeText={setArea}
            />

            <Input
              label="Landmark (Optional)"
              placeholder="e.g. Opp Metro Station"
              value={landmark}
              onChangeText={setLandmark}
            />

            {/* State Picker Button */}
            <Text style={styles.inputLabel}>State / Region *</Text>
            <TouchableOpacity
              onPress={() => setStateModalOpen(true)}
              style={styles.pickerBtn}
            >
              <Text style={selectedState ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {selectedState || 'Select State'}
              </Text>
              <ChevronDown size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>

            {/* District Picker Button */}
            <Text style={styles.inputLabel}>City / District *</Text>
            <TouchableOpacity
              onPress={() => {
                if (!selectedState) {
                  showToast('Please select state first', 'error');
                  return;
                }
                setCityModalOpen(true);
              }}
              style={styles.pickerBtn}
            >
              <Text style={selectedCity ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                {selectedCity || 'Select District'}
              </Text>
              <ChevronDown size={16} color="rgba(255, 255, 255, 0.5)" />
            </TouchableOpacity>

            <Input
              label="Postal Code (PIN) * (6 digits)"
              placeholder="560001"
              keyboardType="number-pad"
              maxLength={6}
              value={postalCode}
              onChangeText={setPostalCode}
            />
          </CardContent>
        </Card>

        {/* GST Registration */}
        <Card>
          <CardHeader>
            <CardTitle>GST Registration</CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 10 }}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Are you GST Registered?</Text>
              <Switch
                value={gstRegistered}
                onValueChange={setGstRegistered}
                trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.purple }}
                thumbColor="#ffffff"
              />
            </View>
            {gstRegistered && (
              <Input
                label="GSTIN Number"
                placeholder="22AAAAA0000A1Z5"
                autoCapitalize="characters"
                value={gstNumber}
                onChangeText={setGstNumber}
              />
            )}
          </CardContent>
        </Card>

        <Button
          variant="default"
          loading={isCreatingShop}
          onPress={handleSubmit}
          style={{ marginBottom: 24 }}
        >
          Submit Store Application
        </Button>

        {/* State Modal */}
        <Dialog
          open={stateModalOpen}
          onClose={() => setStateModalOpen(false)}
          title="Select State"
        >
          <View style={{ gap: 6 }}>
            {allStates.map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => handleSelectState(st)}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownItemText}>{st.name}</Text>
                {!st.isEnabled && (
                  <Text style={styles.comingSoonTag}>Coming Soon</Text>
                )}
                {selectedState === st.name && <Check size={16} color={Colors.purpleLight} />}
              </TouchableOpacity>
            ))}
          </View>
        </Dialog>

        {/* City Modal */}
        <Dialog
          open={cityModalOpen}
          onClose={() => setCityModalOpen(false)}
          title={`Select District in ${selectedState}`}
        >
          <View style={{ gap: 6 }}>
            {districts.map((d) => (
              <TouchableOpacity
                key={d.id}
                onPress={() => handleSelectCity(d)}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownItemText}>{d.name}</Text>
                {!d.isEnabled && (
                  <Text style={styles.comingSoonTag}>Coming Soon</Text>
                )}
                {selectedCity === d.name && <Check size={16} color={Colors.purpleLight} />}
              </TouchableOpacity>
            ))}
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
  cardHeaderIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
    marginLeft: 2,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  pickerBtnText: {
    fontSize: 13,
    color: '#ffffff',
  },
  pickerBtnPlaceholder: {
    fontSize: 13,
    color: Colors.textFaint,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#ffffff',
  },
  comingSoonTag: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.yellow,
    backgroundColor: Colors.yellowBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
