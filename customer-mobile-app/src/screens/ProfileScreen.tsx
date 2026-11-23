import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  User,
  MapPin,
  LogOut,
  Pencil,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  Lock,
  Crosshair,
} from 'lucide-react-native';
import * as Location from 'expo-location';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useLocation } from '../context/LocationContext';
import { locationService, Address } from '../services/location.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, isAuthenticated, logout, deleteAccount, editProfile, refreshProfile } = useAuth();
  const { activeStates, setLocation } = useLocation();

  const [activeTab, setActiveTab] = useState<'info' | 'addresses' | 'settings'>('info');

  // Edit Info State
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingInfo, setIsUpdatingInfo] = useState(false);

  // Addresses State
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);

  // Address Form State
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('Karnataka');
  const [addrPostalCode, setAddrPostalCode] = useState('');
  const [addrLatitude, setAddrLatitude] = useState<number | null>(null);
  const [addrLongitude, setAddrLongitude] = useState<number | null>(null);
  const [addrAccuracy, setAddrAccuracy] = useState<number | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const handleDetectCustomerLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please enable location permission or enter address manually.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const lat = parseFloat(pos.coords.latitude.toFixed(6));
      const lng = parseFloat(pos.coords.longitude.toFixed(6));
      const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;
      setAddrLatitude(lat);
      setAddrLongitude(lng);
      setAddrAccuracy(acc);

      try {
        const res = await locationService.resolveCoordinates(lat, lng);
        const loc = res?.resolvedLocation;
        if (loc) {
          if (loc.addressLine1) setAddrLine1(loc.addressLine1);
          else if (loc.street) setAddrLine1(loc.street);
          if (loc.city || loc.district) setAddrCity(loc.city || loc.district);
          if (loc.state) setAddrState(loc.state);
          if (loc.postalCode) setAddrPostalCode(loc.postalCode);
        }
      } catch {
        // Keep coordinates
      }

      if (acc && acc > 30) {
        Alert.alert('GPS Approximate', `Satellites placed location within ±${acc}m. Please review flat and street details.`);
      } else {
        Alert.alert('GPS Detected', `High-accuracy location retrieved (±${acc || 10}m).`);
      }
    } catch (err: any) {
      Alert.alert('GPS Error', err.message || 'Could not retrieve GPS location');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const loadAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const res = await locationService.getAddresses();
      setAddresses(res);
    } catch {
      // Ignore
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAddresses();
    }
  }, [isAuthenticated]);

  const handleUpdateInfo = async () => {
    setIsUpdatingInfo(true);
    try {
      await editProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      Alert.alert('Profile Updated', 'Your profile details have been saved.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not update profile');
    } finally {
      setIsUpdatingInfo(false);
    }
  };

  const handleCreateAddress = async () => {
    if (!addrFullName.trim() || !addrPhone.trim() || !addrLine1.trim() || !addrCity.trim() || !addrPostalCode.trim()) {
      Alert.alert('Required Fields', 'Please complete all address fields.');
      return;
    }

    setIsSavingAddress(true);
    try {
      await locationService.createAddress({
        fullName: addrFullName.trim(),
        phone: addrPhone.trim(),
        addressLine1: addrLine1.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        postalCode: addrPostalCode.trim(),
        latitude: addrLatitude ?? undefined,
        longitude: addrLongitude ?? undefined,
        isDefault: addresses.length === 0,
      });
      setShowAddAddressModal(false);
      setAddrFullName('');
      setAddrPhone('');
      setAddrLine1('');
      setAddrCity('');
      setAddrPostalCode('');
      setAddrLatitude(null);
      setAddrLongitude(null);
      setAddrAccuracy(null);
      loadAddresses();
      Alert.alert('Success', 'Address added successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not save address');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id: string, state: string, city: string) => {
    try {
      await locationService.setDefaultAddress(id);
      setLocation(id, state, city);
      loadAddresses();
    } catch {
      // Ignore
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await locationService.deleteAddress(id);
      loadAddresses();
    } catch {
      // Ignore
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone and will delete your profile data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert('Account Deleted', 'Your account has been deleted successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Header />
        <View style={styles.unauthContainer}>
          <User size={64} color={colors.foregroundDim} />
          <Text style={styles.unauthTitle}>Sign in to AtlasBasket</Text>
          <Text style={styles.unauthSub}>
            Sign in to track orders, manage delivery addresses, access customer support, and keep track of your wishlist.
          </Text>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.signInBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Signup')}
            style={styles.signUpBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.signUpBtnText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {`${(user?.firstName || 'A')[0]}${(user?.lastName || 'B')[0]}`.toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>
              {user?.firstName} {user?.lastName}
            </Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {user?.phone ? <Text style={styles.userPhone}>{user.phone}</Text> : null}
          </View>
        </View>

        {/* Tab Controls */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab('info')}
            style={[styles.tabBtn, activeTab === 'info' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'info' && styles.tabBtnTextActive]}>
              Personal Info
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('addresses')}
            style={[styles.tabBtn, activeTab === 'addresses' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'addresses' && styles.tabBtnTextActive]}>
              Addresses ({addresses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('settings')}
            style={[styles.tabBtn, activeTab === 'settings' && styles.tabBtnActive]}
          >
            <Text style={[styles.tabBtnText, activeTab === 'settings' && styles.tabBtnTextActive]}>
              Settings
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Personal Info */}
        {activeTab === 'info' && (
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />

            <TouchableOpacity
              onPress={handleUpdateInfo}
              disabled={isUpdatingInfo}
              style={styles.saveBtn}
            >
              {isUpdatingInfo ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 2: Saved Addresses */}
        {activeTab === 'addresses' && (
          <View style={styles.sectionWrap}>
            <TouchableOpacity
              onPress={() => setShowAddAddressModal(true)}
              style={styles.addAddrBtn}
            >
              <Plus size={16} color={colors.primaryForeground} />
              <Text style={styles.addAddrText}>Add New Address</Text>
            </TouchableOpacity>

            {isLoadingAddresses ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
            ) : addresses.length > 0 ? (
              addresses.map((addr) => (
                <View key={addr.id} style={styles.addressCard}>
                  <View style={styles.addrHeader}>
                    <Text style={styles.addrCardName}>{addr.fullName}</Text>
                    {addr.isDefault && (
                      <View style={styles.defBadge}>
                        <Text style={styles.defText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.addrCardText}>
                    {addr.addressLine1}, {addr.city}, {addr.state} - {addr.postalCode}
                  </Text>
                  <Text style={styles.addrCardPhone}>Phone: {addr.phone}</Text>

                  <View style={styles.addrActions}>
                    {!addr.isDefault && (
                      <TouchableOpacity
                        onPress={() => handleSetDefaultAddress(addr.id, addr.state, addr.city)}
                        style={styles.setDefBtn}
                      >
                        <Text style={styles.setDefText}>Set as Default</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => handleDeleteAddress(addr.id)}
                      style={styles.deleteAddrBtn}
                    >
                      <Trash2 size={15} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNotice}>No delivery addresses saved.</Text>
            )}
          </View>
        )}

        {/* Tab 3: Settings */}
        {activeTab === 'settings' && (
          <View style={styles.formCard}>
            <TouchableOpacity
              onPress={() => navigation.navigate('OrderHistory')}
              style={styles.settingsRow}
            >
              <Text style={styles.settingsLabel}>My Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Wishlist')}
              style={styles.settingsRow}
            >
              <Text style={styles.settingsLabel}>My Wishlist</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('CustomOrders')}
              style={styles.settingsRow}
            >
              <Text style={styles.settingsLabel}>Custom Orders & 3D Prints</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('SupportChat')}
              style={styles.settingsRow}
            >
              <Text style={styles.settingsLabel}>Support Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://atlasbasket.com/privacy-policy')}
              style={styles.settingsRow}
            >
              <Text style={styles.settingsLabel}>Privacy Policy & Terms</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <LogOut size={16} color={colors.destructive} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDeleteAccount} style={[styles.logoutBtn, styles.deleteAccountBtn]}>
              <Trash2 size={16} color="#ef4444" />
              <Text style={[styles.logoutText, { color: '#ef4444' }]}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add Address Modal */}
      <Modal
        visible={showAddAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Delivery Address</Text>
              <TouchableOpacity onPress={() => setShowAddAddressModal(false)} style={{ padding: 6 }}>
                <X size={20} color={colors.foregroundMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Quick Action: Use Current Location */}
              <TouchableOpacity
                onPress={handleDetectCustomerLocation}
                disabled={isDetectingLocation}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  backgroundColor: 'rgba(147, 51, 234, 0.15)',
                  borderWidth: 1,
                  borderColor: 'rgba(147, 51, 234, 0.3)',
                  marginBottom: 14,
                }}
              >
                {isDetectingLocation ? (
                  <ActivityIndicator size="small" color="#c084fc" />
                ) : (
                  <>
                    <Crosshair size={16} color="#c084fc" />
                    <Text style={{ fontSize: 13, color: '#e9d5ff', fontWeight: '700' }}>
                      {addrLatitude ? `GPS: ${addrLatitude}, ${addrLongitude} (±${addrAccuracy || 10}m)` : 'Use Current Location'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>Recipient Full Name</Text>
              <TextInput
                value={addrFullName}
                onChangeText={setAddrFullName}
                placeholder="Full Name"
                placeholderTextColor={colors.foregroundDim}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                value={addrPhone}
                onChangeText={setAddrPhone}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.foregroundDim}
                keyboardType="phone-pad"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Street Address / House No.</Text>
              <TextInput
                value={addrLine1}
                onChangeText={setAddrLine1}
                placeholder="Flat / Building / Area"
                placeholderTextColor={colors.foregroundDim}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>City / District</Text>
              <TextInput
                value={addrCity}
                onChangeText={setAddrCity}
                placeholder="e.g. Mysuru"
                placeholderTextColor={colors.foregroundDim}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>State</Text>
              <TextInput
                value={addrState}
                onChangeText={setAddrState}
                placeholder="State"
                placeholderTextColor={colors.foregroundDim}
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Postal Code / Pincode</Text>
              <TextInput
                value={addrPostalCode}
                onChangeText={setAddrPostalCode}
                placeholder="6-digit pincode"
                placeholderTextColor={colors.foregroundDim}
                keyboardType="numeric"
                style={styles.input}
              />

              <TouchableOpacity
                onPress={handleCreateAddress}
                disabled={isSavingAddress}
                style={styles.saveBtn}
              >
                {isSavingAddress ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={styles.saveBtnText}>Save Address</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  unauthContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 24,
    gap: 12,
  },
  unauthTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 8,
  },
  unauthSub: {
    color: colors.foregroundMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  signInBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  signInBtnText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '800',
  },
  signUpBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  signUpBtnText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '700',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.primaryForeground,
    fontSize: 18,
    fontWeight: '900',
  },
  userName: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  userEmail: {
    color: colors.foregroundMuted,
    fontSize: 12,
    marginTop: 2,
  },
  userPhone: {
    color: colors.foregroundDim,
    fontSize: 11,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabBtnText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  tabBtnTextActive: {
    color: colors.foreground,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
  },
  fieldLabel: {
    color: colors.foregroundMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderRadius: 12,
    backgroundColor: colors.glassInputBg,
    borderWidth: 1,
    borderColor: colors.glassInputBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 13,
  },
  saveBtn: {
    marginTop: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveBtnText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionWrap: {
    gap: 12,
  },
  addAddrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  addAddrText: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontWeight: '800',
  },
  addressCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    gap: 4,
  },
  addrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addrCardName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '800',
  },
  defBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  defText: {
    color: colors.foreground,
    fontSize: 9,
    fontWeight: '700',
  },
  addrCardText: {
    color: colors.foregroundMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  addrCardPhone: {
    color: colors.foregroundDim,
    fontSize: 10,
  },
  addrActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  setDefBtn: {
    paddingVertical: 4,
  },
  setDefText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  deleteAddrBtn: {
    padding: 6,
  },
  emptyNotice: {
    color: colors.foregroundDim,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
  settingsRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  settingsLabel: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutText: {
    color: colors.destructive,
    fontSize: 13,
    fontWeight: '700',
  },
  deleteAccountBtn: {
    marginTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
    paddingTop: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
});
