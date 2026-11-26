import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react-native';
import { useCart } from '../context/CartContext';
import { productService } from '../services/product.service';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { cart, cartCount, subtotal, updateQuantity, removeItem, isLoading } = useCart();

  const hasOfflineItems = cart.items.some((item) => item.product?.shop?.isOnline === false);

  const handleCheckout = () => {
    if (hasOfflineItems) return;
    navigation.navigate('Checkout');
  };

  return (
    <View style={styles.container}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.topNavTitle}>My Cart ({cartCount})</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : cart.items.length > 0 ? (
          cart.items.map((item) => {
            const basePrice = Number(item.product?.price || 0);
            const varDiff = item.variant ? Number(item.variant.priceDifference || 0) : 0;
            const itemPrice = basePrice + varDiff;

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.imageBox}>
                  {item.product?.imageUrl ? (
                    <Image source={{ uri: item.product.imageUrl }} style={styles.itemImg} />
                  ) : (
                    <Package size={24} color={colors.foregroundDim} />
                  )}
                </View>

                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.product?.name}
                  </Text>
                  {item.variant && (
                    <Text style={styles.itemVariant}>Option: {item.variant.name}</Text>
                  )}
                  {item.product?.shop?.isOnline === false && (
                    <View style={styles.itemOfflineBadge}>
                      <AlertTriangle size={11} color="#ef4444" />
                      <Text style={styles.itemOfflineText}>Shop is currently offline</Text>
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: item.product?.fulfilmentType === 'MADE_TO_ORDER' ? '#c084fc' : '#10b981', fontWeight: '700' }}>
                      {item.product?.fulfilmentType === 'MADE_TO_ORDER'
                        ? `Made to Order (${item.product.minPrepDays || 1}–${item.product.maxPrepDays || 1}d)`
                        : 'Ready to Ship'}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {productService.formatPrice(itemPrice)}
                  </Text>

                  <View style={styles.qtyRow}>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                        style={styles.qtyBtn}
                      >
                        <Minus size={12} color={colors.foreground} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                        style={styles.qtyBtn}
                      >
                        <Plus size={12} color={colors.foreground} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      onPress={() => removeItem(item.id)}
                      style={styles.trashBtn}
                    >
                      <Trash2 size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyContainer}>
            <ShoppingCart size={48} color={colors.foregroundDim} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptySub}>Add some items from shops to proceed to checkout.</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {cart.items.length > 0 && (
        <View style={styles.footer}>
          {hasOfflineItems && (
            <View style={styles.offlineWarningBanner}>
              <AlertTriangle size={14} color="#f59e0b" />
              <Text style={styles.offlineWarningText}>
                Some shops in your cart are currently offline. Remove their items to proceed.
              </Text>
            </View>
          )}

          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>{productService.formatPrice(subtotal)}</Text>
          </View>

          <TouchableOpacity
            onPress={handleCheckout}
            disabled={hasOfflineItems}
            style={[styles.checkoutBtn, hasOfflineItems && styles.checkoutBtnDisabled]}
            activeOpacity={0.8}
          >
            <Text style={styles.checkoutText}>
              {hasOfflineItems ? 'Remove Offline Items to Checkout' : 'Proceed to Checkout'}
            </Text>
            {!hasOfflineItems && <ArrowRight size={16} color={colors.primaryForeground} />}
          </TouchableOpacity>
        </View>
      )}
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
    paddingBottom: 100,
  },
  itemCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
    gap: 12,
  },
  imageBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  itemImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  itemName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: '700',
  },
  itemVariant: {
    color: colors.foregroundMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  itemPrice: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: '900',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qtyText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  trashBtn: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 10,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: colors.foregroundMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
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
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtotalLabel: {
    color: colors.foregroundMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  subtotalValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: '900',
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  checkoutBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#3f3f46',
  },
  checkoutText: {
    color: colors.primaryForeground,
    fontSize: 14,
    fontWeight: '800',
  },
  itemOfflineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignSelf: 'flex-start',
  },
  itemOfflineText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
  },
  offlineWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 12,
  },
  offlineWarningText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});
