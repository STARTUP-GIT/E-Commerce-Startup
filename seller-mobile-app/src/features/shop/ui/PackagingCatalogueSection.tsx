import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { usePackaging } from '../hooks/usePackaging';
import { type PackagingOption } from '../api/shopApi';
import { useFileUpload } from '@/features/storage/hooks/useFileUpload';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  X,
  Tag,
  Info,
} from 'lucide-react-native';
import { Colors } from '@/theme/colors';

const PACKAGING_TYPES = [
  { value: 'BOX', label: 'Box / Cardboard' },
  { value: 'COVER', label: 'Cover / Sleeve' },
  { value: 'POUCH', label: 'Pouch / Bubble' },
  { value: 'BAG', label: 'Carry Bag' },
  { value: 'GIFT_BOX', label: 'Gift Box' },
  { value: 'OTHER', label: 'Other' },
];

export function PackagingCatalogueSection() {
  const {
    packagingOptions,
    isLoading,
    createPackaging,
    updatePackaging,
    togglePackaging,
    deletePackaging,
    isCreating,
    isUpdating,
  } = usePackaging();

  const showToast = useUIStore((s) => s.showToast);
  const showConfirm = useConfirmStore((s) => s.showConfirm);

  const { pickAndUpload, isUploading } = useFileUpload({ folder: 'packing-proof' });

  // Dialog State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<PackagingOption | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('BOX');
  const [isOptional, setIsOptional] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePublicId, setImagePublicId] = useState<string | null>(null);

  const handleOpenCreate = () => {
    setEditingOption(null);
    setName('');
    setDescription('');
    setPrice('');
    setType('BOX');
    setIsOptional(true);
    setImageUrl(null);
    setImagePublicId(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (opt: PackagingOption) => {
    setEditingOption(opt);
    setName(opt.name);
    setDescription(opt.description || '');
    setPrice(String(opt.price));
    setType(opt.type || 'BOX');
    setIsOptional(opt.isOptional);
    setImageUrl(opt.imageUrl);
    setImagePublicId(opt.imagePublicId);
    setModalOpen(true);
  };

  const handlePickImage = async () => {
    const uploaded = await pickAndUpload();
    if (uploaded) {
      setImageUrl(uploaded.url);
      setImagePublicId(uploaded.key);
      showToast('Packaging photograph uploaded successfully', 'success');
    }
  };

  const handleRemoveImage = () => {
    setImageUrl(null);
    setImagePublicId(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('Packaging name is required', 'error');
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) {
      showToast('Please enter a valid non-negative price', 'error');
      return;
    }

    try {
      if (editingOption) {
        await updatePackaging({
          id: editingOption.id,
          payload: {
            name: name.trim(),
            description: description.trim() || undefined,
            price: numPrice,
            type,
            isOptional,
            imageUrl: imageUrl || undefined,
            imagePublicId: imagePublicId || undefined,
          },
        });
        showToast('Packaging option updated successfully', 'success');
      } else {
        await createPackaging({
          name: name.trim(),
          description: description.trim() || undefined,
          price: numPrice,
          type,
          isOptional,
          imageUrl: imageUrl || undefined,
          imagePublicId: imagePublicId || undefined,
        });
        showToast('Packaging option submitted for admin approval', 'success');
      }
      setModalOpen(false);
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Failed to save packaging option', 'error');
    }
  };

  const handleToggle = async (opt: PackagingOption) => {
    try {
      await togglePackaging({ id: opt.id, isActive: !opt.isActive });
      showToast(`Packaging ${!opt.isActive ? 'activated' : 'deactivated'}`, 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = (opt: PackagingOption) => {
    showConfirm({
      title: 'Delete Packaging Option',
      message: `Are you sure you want to delete "${opt.name}"? If used in previous orders, it will be safely deactivated.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deletePackaging(opt.id);
          showToast('Packaging option removed', 'success');
        } catch (err: any) {
          showToast(err?.response?.data?.message || 'Failed to delete packaging option', 'error');
        }
      },
    });
  };

  const renderStatusBadge = (status: PackagingOption['status']) => {
    switch (status) {
      case 'APPROVED':
        return <Badge variant="success">APPROVED</Badge>;
      case 'PENDING':
        return <Badge variant="default">PENDING APPROVAL</Badge>;
      case 'CHANGES_REQUESTED':
        return <Badge variant="default">CHANGES REQUESTED</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">REJECTED</Badge>;
      case 'SUSPENDED':
        return <Badge variant="destructive">SUSPENDED</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <Package size={17} color={Colors.purpleLight} />
            <View>
              <CardTitle>Packaging Catalogue</CardTitle>
              <CardDescription>Create individual packaging options with photo and transparent pricing</CardDescription>
            </View>
          </View>
          <Button
            variant="default"
            size="sm"
            onPress={handleOpenCreate}
            icon={<Plus size={13} color="#000000" />}
          >
            Add
          </Button>
        </View>
      </CardHeader>
      <CardContent style={{ gap: 12 }}>
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Info size={14} color="#60a5fa" style={{ marginTop: 2 }} />
          <Text style={styles.infoBannerText}>
            Each packaging option requires Admin verification before appearing to shoppers. Edits to approved packaging will trigger re-approval.
          </Text>
        </View>

        {isLoading ? (
          <View style={{ gap: 8 }}>
            <Skeleton height={60} />
            <Skeleton height={60} />
          </View>
        ) : packagingOptions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={32} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>No Packaging Options Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create boxes, bags, pouches or protective packaging for your products.
            </Text>
            <Button
              variant="outline"
              size="sm"
              onPress={handleOpenCreate}
              icon={<Plus size={13} color="#ffffff" />}
              style={{ marginTop: 8 }}
            >
              Add First Packaging Option
            </Button>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {packagingOptions.map((opt) => (
              <View key={opt.id} style={styles.optionCard}>
                <View style={styles.optionRow}>
                  {/* Image or Icon */}
                  <View style={styles.thumbBox}>
                    {opt.imageUrl ? (
                      <Image source={{ uri: opt.imageUrl }} style={styles.thumbImage} resizeMode="cover" />
                    ) : (
                      <Package size={22} color="rgba(255,255,255,0.4)" />
                    )}
                  </View>

                  {/* Info */}
                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                      <Text style={styles.optionName}>{opt.name}</Text>
                      <Text style={styles.optionPrice}>₹{Number(opt.price).toFixed(2)}</Text>
                    </View>

                    {opt.description ? (
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {opt.description}
                      </Text>
                    ) : null}

                    {/* Meta Tags */}
                    <View style={styles.metaRow}>
                      {renderStatusBadge(opt.status)}
                      <View style={[styles.pillBadge, opt.isOptional ? styles.pillOptional : styles.pillRequired]}>
                        <Text style={[styles.pillText, opt.isOptional ? styles.pillOptionalText : styles.pillRequiredText]}>
                          {opt.isOptional ? 'Optional for Shoppers' : 'Mandatory'}
                        </Text>
                      </View>
                      {opt.type && (
                        <View style={styles.pillType}>
                          <Text style={styles.pillTypeText}>{opt.type}</Text>
                        </View>
                      )}
                    </View>

                    {/* Rejection / Changes Notes */}
                    {opt.rejectionReason && (opt.status === 'REJECTED' || opt.status === 'CHANGES_REQUESTED') && (
                      <View style={styles.rejectionBox}>
                        <AlertTriangle size={12} color="#f87171" />
                        <Text style={styles.rejectionText}>
                          Feedback: {opt.rejectionReason}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Card Actions */}
                <View style={styles.actionsRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Switch
                      value={opt.isActive}
                      onValueChange={() => handleToggle(opt)}
                      trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.emerald }}
                      thumbColor="#ffffff"
                    />
                    <Text style={{ fontSize: 11, color: opt.isActive ? '#34d399' : 'rgba(255,255,255,0.4)' }}>
                      {opt.isActive ? 'Active' : 'Disabled'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleOpenEdit(opt)}
                      style={styles.actionBtn}
                    >
                      <Edit2 size={13} color="#93c5fd" />
                      <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(opt)}
                      style={[styles.actionBtn, styles.deleteBtn]}
                    >
                      <Trash2 size={13} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </CardContent>

      {/* Add / Edit Packaging Dialog */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOption ? 'Edit Packaging Option' : 'New Packaging Option'}
        description={
          editingOption?.status === 'APPROVED'
            ? 'Note: Modifying approved packaging details will submit it for re-verification.'
            : 'Configure name, price, photograph, and customer selection rules.'
        }
      >
        <View style={{ gap: 12 }}>
          {/* Photo Uploader */}
          <View style={styles.photoSection}>
            <Text style={styles.formLabel}>Packaging Photograph (Optional)</Text>
            {imageUrl ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
                <TouchableOpacity onPress={handleRemoveImage} style={styles.removePhotoBtn}>
                  <X size={14} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickImage}
                disabled={isUploading}
                style={styles.uploadPlaceholder}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#60a5fa" />
                ) : (
                  <>
                    <Upload size={18} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.uploadPlaceholderText}>Upload Packaging Photo</Text>
                    <Text style={styles.uploadPlaceholderSub}>PNG, JPG up to 5MB</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <Input
            label="Packaging Name *"
            placeholder="e.g. Medium Cardboard Box, Bubble Wrap Pouch"
            value={name}
            onChangeText={setName}
          />

          <Input
            label="Price (₹ INR) *"
            placeholder="e.g. 5.00"
            keyboardType="decimal-pad"
            value={price}
            onChangeText={setPrice}
          />

          <Input
            label="Description (Optional)"
            placeholder="e.g. Dimensions 20x15x10cm, sturdy corrugated box"
            multiline
            numberOfLines={2}
            value={description}
            onChangeText={setDescription}
          />

          {/* Type Selector */}
          <View style={{ gap: 6 }}>
            <Text style={styles.formLabel}>Packaging Category</Text>
            <View style={styles.typeSelectorRow}>
              {PACKAGING_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setType(t.value)}
                  style={[
                    styles.typeChip,
                    type === t.value && styles.typeChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      type === t.value && styles.typeChipTextSelected,
                    ]}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Optional / Mandatory Switch */}
          <View style={styles.toggleRowContainer}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.toggleTitle}>Optional for Customers</Text>
              <Text style={styles.toggleSubtitle}>
                {isOptional
                  ? 'Shoppers choose whether to add this item during checkout.'
                  : 'Mandatory charge automatically applied and disclosed at checkout.'}
              </Text>
            </View>
            <Switch
              value={isOptional}
              onValueChange={setIsOptional}
              trackColor={{ false: 'rgba(255,255,255,0.1)', true: Colors.purple }}
              thumbColor="#ffffff"
            />
          </View>

          <Button
            variant="default"
            loading={isCreating || isUpdating}
            onPress={handleSubmit}
            style={{ marginTop: 6 }}
          >
            {editingOption ? 'Save Changes' : 'Submit for Approval'}
          </Button>
        </View>
      </Dialog>
    </Card>
  );
}

const styles = StyleSheet.create({
  infoBanner: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#93c5fd',
    lineHeight: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 10,
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
  },
  thumbBox: {
    width: 54,
    height: 54,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  optionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  optionPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34d399',
  },
  optionDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 6,
    alignItems: 'center',
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 9,
    fontWeight: '600',
  },
  pillOptional: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  pillOptionalText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#93c5fd',
  },
  pillRequired: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  pillRequiredText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fcd34d',
  },
  pillType: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  pillTypeText: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  rejectionText: {
    fontSize: 10,
    color: '#fca5a5',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#93c5fd',
  },
  deleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  photoSection: {
    marginBottom: 4,
  },
  uploadPlaceholder: {
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  uploadPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#93c5fd',
  },
  uploadPlaceholderSub: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  previewContainer: {
    position: 'relative',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    padding: 4,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  typeChipSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderColor: Colors.purple,
  },
  typeChipText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  typeChipTextSelected: {
    color: '#e9d5ff',
    fontWeight: '700',
  },
  toggleRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  toggleSubtitle: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 2,
    lineHeight: 14,
  },
});
