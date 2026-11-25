import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useProducts } from '../hooks/useProducts';
import { productService } from '../services/productService';
import { productApi, Product } from '../api/productApi';
import { useFileUpload } from '@/features/storage/hooks/useFileUpload';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { useUIStore } from '@/lib/store/uiStore';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/shared/components/Button';
import { Card } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  Upload,
  Image as ImageIcon,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

interface ProductListPageProps {
  navigation: any;
}

export function ProductListPage({ navigation }: ProductListPageProps) {
  const { products, isLoading, refetch, createProduct, updateProduct, deleteProduct } = useProducts();
  const showConfirm = useConfirmStore((s) => s.showConfirm);
  const showToast = useUIStore((s) => s.showToast);

  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [fulfilmentType, setFulfilmentType] = useState<'READY_TO_SHIP' | 'MADE_TO_ORDER'>('READY_TO_SHIP');
  const [minPrepDays, setMinPrepDays] = useState('2');
  const [maxPrepDays, setMaxPrepDays] = useState('5');
  const [prepTimeType, setPrepTimeType] = useState<'CALENDAR_DAYS' | 'BUSINESS_DAYS'>('CALENDAR_DAYS');
  const [productionNotes, setProductionNotes] = useState('');
  const [maxConcurrentOrders, setMaxConcurrentOrders] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { pickAndUpload, isUploading } = useFileUpload({ folder: 'products' });

  useEffect(() => {
    productApi.getAllowedCategories()
      .then(setCategories)
      .catch((e) => console.log('Error loading categories:', e));
  }, []);

  const handleUpload = async () => {
    const res = await pickAndUpload();
    if (res?.url) {
      setImageUrl(res.url);
      showToast('Product photo uploaded successfully', 'success');
    }
  };

  const openCreateDialog = () => {
    setName('');
    setQuantity('1');
    setPrice('0');
    setImageUrl('');
    setCategoryId(categories[0]?.id || '');
    setFulfilmentType('READY_TO_SHIP');
    setMinPrepDays('2');
    setMaxPrepDays('5');
    setPrepTimeType('CALENDAR_DAYS');
    setProductionNotes('');
    setMaxConcurrentOrders('');
    setIsCreateOpen(true);
  };

  const openEditDialog = (prod: Product) => {
    setSelectedProduct(prod);
    setQuantity(prod.stockQuantity.toString());
    setPrice(prod.price.toString());
    setImageUrl(prod.imageUrl);
    setCategoryId(prod.categoryId || '');
    setFulfilmentType(prod.fulfilmentType || 'READY_TO_SHIP');
    setMinPrepDays(prod.minPrepDays ? prod.minPrepDays.toString() : '2');
    setMaxPrepDays(prod.maxPrepDays ? prod.maxPrepDays.toString() : '5');
    setPrepTimeType(prod.prepTimeType || 'CALENDAR_DAYS');
    setProductionNotes(prod.productionNotes || '');
    setMaxConcurrentOrders(prod.maxConcurrentOrders ? prod.maxConcurrentOrders.toString() : '');
    setIsEditOpen(true);
  };

  const handleCreateSubmit = async () => {
    const pQuantity = parseInt(quantity, 10) || 0;
    const pPrice = parseFloat(price);
    const pMinPrep = fulfilmentType === 'MADE_TO_ORDER' ? parseInt(minPrepDays, 10) : undefined;
    const pMaxPrep = fulfilmentType === 'MADE_TO_ORDER' ? parseInt(maxPrepDays, 10) : undefined;
    const pMaxCap = maxConcurrentOrders ? parseInt(maxConcurrentOrders, 10) : undefined;

    const validation = productService.validateCreate({
      productname: name,
      productquantity: fulfilmentType === 'READY_TO_SHIP' ? pQuantity : 0,
      productprice: pPrice,
      imageKey: imageUrl,
      categoryId,
      fulfilmentType,
      minPrepDays: pMinPrep,
      maxPrepDays: pMaxPrep,
      prepTimeType: fulfilmentType === 'MADE_TO_ORDER' ? prepTimeType : undefined,
      productionNotes: fulfilmentType === 'MADE_TO_ORDER' ? productionNotes : undefined,
      maxConcurrentOrders: fulfilmentType === 'MADE_TO_ORDER' ? pMaxCap : undefined,
    });

    if (!validation.valid) {
      showToast(validation.error || 'Please fill in product details', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createProduct({
        productname: name.trim(),
        productquantity: fulfilmentType === 'READY_TO_SHIP' ? pQuantity : 0,
        productprice: pPrice,
        imageUrl,
        categoryId: categoryId || undefined,
        fulfilmentType,
        minPrepDays: pMinPrep,
        maxPrepDays: pMaxPrep,
        prepTimeType: fulfilmentType === 'MADE_TO_ORDER' ? prepTimeType : undefined,
        productionNotes: fulfilmentType === 'MADE_TO_ORDER' ? productionNotes.trim() : undefined,
        maxConcurrentOrders: fulfilmentType === 'MADE_TO_ORDER' ? pMaxCap : undefined,
      });
      showToast('Product created successfully', 'success');
      setIsCreateOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to create product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedProduct) return;
    const pQuantity = parseInt(quantity, 10) || 0;
    const pPrice = parseFloat(price);
    const pMinPrep = fulfilmentType === 'MADE_TO_ORDER' ? parseInt(minPrepDays, 10) : undefined;
    const pMaxPrep = fulfilmentType === 'MADE_TO_ORDER' ? parseInt(maxPrepDays, 10) : undefined;
    const pMaxCap = maxConcurrentOrders ? parseInt(maxConcurrentOrders, 10) : undefined;

    const validation = productService.validateEdit({
      productquantity: fulfilmentType === 'READY_TO_SHIP' ? pQuantity : 0,
      productprice: pPrice,
      imageKey: imageUrl,
      categoryId,
      fulfilmentType,
      minPrepDays: pMinPrep,
      maxPrepDays: pMaxPrep,
      prepTimeType: fulfilmentType === 'MADE_TO_ORDER' ? prepTimeType : undefined,
      productionNotes: fulfilmentType === 'MADE_TO_ORDER' ? productionNotes : undefined,
      maxConcurrentOrders: fulfilmentType === 'MADE_TO_ORDER' ? pMaxCap : undefined,
    });

    if (!validation.valid) {
      showToast(validation.error || 'Please fill in product details', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await updateProduct({
        id: selectedProduct.id,
        payload: {
          productquantity: fulfilmentType === 'READY_TO_SHIP' ? pQuantity : 0,
          productprice: pPrice,
          imageUrl,
          categoryId: categoryId || undefined,
          fulfilmentType,
          minPrepDays: pMinPrep,
          maxPrepDays: pMaxPrep,
          prepTimeType: fulfilmentType === 'MADE_TO_ORDER' ? prepTimeType : undefined,
          productionNotes: fulfilmentType === 'MADE_TO_ORDER' ? productionNotes.trim() : undefined,
          maxConcurrentOrders: fulfilmentType === 'MADE_TO_ORDER' ? pMaxCap : undefined,
        },
      });
      showToast('Product updated successfully', 'success');
      setIsEditOpen(false);
    } catch (err: any) {
      showToast(err.message || 'Failed to update product', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (prod: Product) => {
    showConfirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${prod.name}"? It will no longer be visible to buyers.`,
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await deleteProduct(prod.id);
          showToast('Product deleted', 'success');
        } catch (err: any) {
          showToast(err.message || 'Failed to delete product', 'error');
        }
      },
    });
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesStock = true;
    if (stockFilter === 'LOW') matchesStock = p.stockQuantity > 0 && p.stockQuantity <= 10;
    if (stockFilter === 'OUT') matchesStock = p.stockQuantity === 0;
    return matchesSearch && matchesStock;
  });

  return (
    <DashboardLayout title="Products" navigation={navigation} currentRoute="/products">
      <View style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Input
            placeholder="Search catalog items…"
            value={searchQuery}
            onChangeText={setSearchQuery}
            containerStyle={{ flex: 1, marginBottom: 0 }}
            icon={<Search size={16} color={Colors.textMuted} />}
          />
          <Button
            variant="default"
            size="sm"
            onPress={openCreateDialog}
            style={{ marginLeft: 8 }}
            icon={<Plus size={16} color="#000000" />}
          >
            Add
          </Button>
        </View>

        {/* Stock Filter Tabs */}
        <View style={styles.filterTabs}>
          {(['ALL', 'LOW', 'OUT'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setStockFilter(tab)}
              style={[styles.filterTab, stockFilter === tab && styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, stockFilter === tab && styles.filterTabTextActive]}>
                {tab === 'ALL' ? 'All Stock' : tab === 'LOW' ? 'Low Stock' : 'Out of Stock'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Products List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                refetch();
              }}
              tintColor={Colors.purpleLight}
            />
          }
        >
          {isLoading ? (
            <View style={{ gap: 10 }}>
              <Skeleton height={80} borderRadius={14} />
              <Skeleton height={80} borderRadius={14} />
              <Skeleton height={80} borderRadius={14} />
            </View>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((prod) => (
              <Card key={prod.id} style={styles.productCard}>
                <View style={styles.productRow}>
                  <View style={styles.productImgBox}>
                    {prod.imageUrl ? (
                      <Image source={{ uri: prod.imageUrl }} style={styles.productImg} />
                    ) : (
                      <Package size={22} color="rgba(255, 255, 255, 0.3)" />
                    )}
                  </View>

                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.productName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      {productService.formatPrice(prod.price)}
                    </Text>
                    <View style={[styles.stockRow, { flexWrap: 'wrap', gap: 4 }]}>
                      {prod.fulfilmentType === 'MADE_TO_ORDER' ? (
                        <>
                          <Badge variant="outline" style={{ paddingVertical: 1, borderColor: '#a855f7' }}>
                            <Text style={{ color: '#d8b4fe', fontSize: 10, fontWeight: '700' }}>
                              Made to Order
                            </Text>
                          </Badge>
                          <Badge variant="secondary" style={{ paddingVertical: 1 }}>
                            {productService.formatPrepTime(prod.minPrepDays, prod.maxPrepDays, prod.prepTimeType)}
                          </Badge>
                          {prod.maxConcurrentOrders ? (
                            <Badge variant="secondary" style={{ paddingVertical: 1 }}>
                              {`${prod.activeProductionOrders || 0}/${prod.maxConcurrentOrders} in prod`}
                            </Badge>
                          ) : null}
                        </>
                      ) : (
                        <Badge
                          variant={
                            prod.stockQuantity === 0
                              ? 'destructive'
                              : prod.stockQuantity <= 10
                              ? 'warning'
                              : 'secondary'
                          }
                          style={{ paddingVertical: 1 }}
                        >
                          {prod.stockQuantity === 0
                            ? 'Out of Stock'
                            : `Ready to Ship • ${prod.stockQuantity} in stock`}
                        </Badge>
                      )}
                    </View>
                  </View>

                  <View style={styles.actionColumn}>
                    <TouchableOpacity
                      onPress={() => openEditDialog(prod)}
                      style={styles.iconBtn}
                    >
                      <Edit2 size={16} color="rgba(255, 255, 255, 0.8)" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(prod)}
                      style={[styles.iconBtn, { marginTop: 6 }]}
                    >
                      <Trash2 size={16} color={Colors.rose} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Package size={40} color="rgba(255, 255, 255, 0.2)" />
              <Text style={styles.emptyText}>No catalog items found.</Text>
            </View>
          )}
        </ScrollView>

        {/* Create Product Dialog */}
        <Dialog
          open={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          title="Add New Catalog Item"
          description="List a new physical item on your marketplace shop"
        >
          <View style={{ gap: 10 }}>
            <Input
              label="Product Name"
              placeholder="Handmade Ceramic Vase"
              value={name}
              onChangeText={setName}
            />

            {/* Fulfilment Type Section */}
            <View style={{ marginTop: 4 }}>
              <Text style={styles.label}>Fulfilment Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setFulfilmentType('READY_TO_SHIP')}
                  style={[
                    styles.fulfilmentToggleBtn,
                    fulfilmentType === 'READY_TO_SHIP' && styles.fulfilmentToggleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.fulfilmentToggleText,
                      fulfilmentType === 'READY_TO_SHIP' && styles.fulfilmentToggleTextActive,
                    ]}
                  >
                    Ready to Ship
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFulfilmentType('MADE_TO_ORDER')}
                  style={[
                    styles.fulfilmentToggleBtn,
                    fulfilmentType === 'MADE_TO_ORDER' && styles.fulfilmentToggleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.fulfilmentToggleText,
                      fulfilmentType === 'MADE_TO_ORDER' && styles.fulfilmentToggleTextActive,
                    ]}
                  >
                    Made to Order
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {fulfilmentType === 'READY_TO_SHIP' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Stock Units"
                    placeholder="10"
                    keyboardType="number-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Price (₹)"
                    placeholder="499.00"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>
            ) : (
              <>
                <Input
                  label="Price (₹)"
                  placeholder="499.00"
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Min Prep (Days)"
                      placeholder="2"
                      keyboardType="number-pad"
                      value={minPrepDays}
                      onChangeText={setMinPrepDays}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Max Prep (Days)"
                      placeholder="5"
                      keyboardType="number-pad"
                      value={maxPrepDays}
                      onChangeText={setMaxPrepDays}
                    />
                  </View>
                </View>

                {/* Calendar vs Business Days */}
                <View>
                  <Text style={styles.label}>Lead Time Type</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => setPrepTimeType('CALENDAR_DAYS')}
                      style={[
                        styles.prepTypeBtn,
                        prepTimeType === 'CALENDAR_DAYS' && styles.prepTypeBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.prepTypeText,
                          prepTimeType === 'CALENDAR_DAYS' && styles.prepTypeTextActive,
                        ]}
                      >
                        Calendar Days
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPrepTimeType('BUSINESS_DAYS')}
                      style={[
                        styles.prepTypeBtn,
                        prepTimeType === 'BUSINESS_DAYS' && styles.prepTypeBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.prepTypeText,
                          prepTimeType === 'BUSINESS_DAYS' && styles.prepTypeTextActive,
                        ]}
                      >
                        Business Days
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Input
                  label="Max Concurrent Orders (Capacity limit)"
                  placeholder="Optional, e.g. 5"
                  keyboardType="number-pad"
                  value={maxConcurrentOrders}
                  onChangeText={setMaxConcurrentOrders}
                />

                <Input
                  label="Production Notes (Visible to buyer)"
                  placeholder="e.g. Handmade once order is confirmed"
                  value={productionNotes}
                  onChangeText={setProductionNotes}
                />
              </>
            )}

            {/* Image Preview & Upload */}
            <Text style={styles.label}>Product Image</Text>
            <View style={styles.uploadBox}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.previewImg} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <ImageIcon size={28} color="rgba(255, 255, 255, 0.3)" />
                  <Text style={styles.uploadText}>No image selected</Text>
                </View>
              )}
              <Button
                variant="outline"
                size="sm"
                onPress={handleUpload}
                loading={isUploading}
                icon={<Upload size={14} color="#ffffff" />}
                style={{ marginTop: 10 }}
              >
                Choose Photo
              </Button>
            </View>

            <Button
              variant="default"
              loading={submitting}
              onPress={handleCreateSubmit}
              style={{ marginTop: 14 }}
            >
              Publish Item
            </Button>
          </View>
        </Dialog>

        {/* Edit Product Dialog */}
        <Dialog
          open={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Edit Catalog Item"
          description={`Update details for "${selectedProduct?.name}"`}
        >
          <View style={{ gap: 10 }}>
            {/* Fulfilment Type Section */}
            <View style={{ marginTop: 4 }}>
              <Text style={styles.label}>Fulfilment Type</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  onPress={() => setFulfilmentType('READY_TO_SHIP')}
                  style={[
                    styles.fulfilmentToggleBtn,
                    fulfilmentType === 'READY_TO_SHIP' && styles.fulfilmentToggleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.fulfilmentToggleText,
                      fulfilmentType === 'READY_TO_SHIP' && styles.fulfilmentToggleTextActive,
                    ]}
                  >
                    Ready to Ship
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFulfilmentType('MADE_TO_ORDER')}
                  style={[
                    styles.fulfilmentToggleBtn,
                    fulfilmentType === 'MADE_TO_ORDER' && styles.fulfilmentToggleBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.fulfilmentToggleText,
                      fulfilmentType === 'MADE_TO_ORDER' && styles.fulfilmentToggleTextActive,
                    ]}
                  >
                    Made to Order
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {fulfilmentType === 'READY_TO_SHIP' ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Stock Units"
                    placeholder="10"
                    keyboardType="number-pad"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Price (₹)"
                    placeholder="499.00"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>
            ) : (
              <>
                <Input
                  label="Price (₹)"
                  placeholder="499.00"
                  keyboardType="decimal-pad"
                  value={price}
                  onChangeText={setPrice}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Min Prep (Days)"
                      placeholder="2"
                      keyboardType="number-pad"
                      value={minPrepDays}
                      onChangeText={setMinPrepDays}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Max Prep (Days)"
                      placeholder="5"
                      keyboardType="number-pad"
                      value={maxPrepDays}
                      onChangeText={setMaxPrepDays}
                    />
                  </View>
                </View>

                {/* Calendar vs Business Days */}
                <View>
                  <Text style={styles.label}>Lead Time Type</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => setPrepTimeType('CALENDAR_DAYS')}
                      style={[
                        styles.prepTypeBtn,
                        prepTimeType === 'CALENDAR_DAYS' && styles.prepTypeBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.prepTypeText,
                          prepTimeType === 'CALENDAR_DAYS' && styles.prepTypeTextActive,
                        ]}
                      >
                        Calendar Days
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPrepTimeType('BUSINESS_DAYS')}
                      style={[
                        styles.prepTypeBtn,
                        prepTimeType === 'BUSINESS_DAYS' && styles.prepTypeBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.prepTypeText,
                          prepTimeType === 'BUSINESS_DAYS' && styles.prepTypeTextActive,
                        ]}
                      >
                        Business Days
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Input
                  label="Max Concurrent Orders (Capacity limit)"
                  placeholder="Optional, e.g. 5"
                  keyboardType="number-pad"
                  value={maxConcurrentOrders}
                  onChangeText={setMaxConcurrentOrders}
                />

                <Input
                  label="Production Notes (Visible to buyer)"
                  placeholder="e.g. Handmade once order is confirmed"
                  value={productionNotes}
                  onChangeText={setProductionNotes}
                />
              </>
            )}

            <Text style={styles.label}>Product Image</Text>
            <View style={styles.uploadBox}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.previewImg} />
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <ImageIcon size={28} color="rgba(255, 255, 255, 0.3)" />
                </View>
              )}
              <Button
                variant="outline"
                size="sm"
                onPress={handleUpload}
                loading={isUploading}
                icon={<Upload size={14} color="#ffffff" />}
                style={{ marginTop: 10 }}
              >
                Change Photo
              </Button>
            </View>

            <Button
              variant="default"
              loading={submitting}
              onPress={handleEditSubmit}
              style={{ marginTop: 14 }}
            >
              Save Changes
            </Button>
          </View>
        </Dialog>
      </View>
    </DashboardLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  filterTabActive: {
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
  },
  filterTabText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
  },
  filterTabTextActive: {
    color: Colors.purpleLight,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  productCard: {
    padding: 12,
    marginBottom: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImgBox: {
    height: 60,
    width: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImg: {
    height: '100%',
    width: '100%',
  },
  productName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.purpleLight,
    marginBottom: 4,
  },
  stockRow: {
    flexDirection: 'row',
  },
  actionColumn: {
    alignItems: 'center',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  uploadBox: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  uploadText: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
  },
  previewImg: {
    height: 100,
    width: 100,
    borderRadius: 12,
  },
  fulfilmentToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fulfilmentToggleBtnActive: {
    backgroundColor: Colors.purpleBg,
    borderColor: Colors.purpleBorder,
  },
  fulfilmentToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  fulfilmentToggleTextActive: {
    color: Colors.purpleLight,
  },
  prepTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prepTypeBtnActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  prepTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  prepTypeTextActive: {
    color: '#d8b4fe',
  },
});
