"use client";

import React, { useState, useRef } from 'react';
import { usePackaging } from '../hooks/usePackaging';
import { type PackagingOption } from '../api/shopApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Dialog } from '@/shared/components/Dialog';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  X,
  Ban,
  Tag,
  Info
} from 'lucide-react';

const PACKAGING_TYPES = [
  { value: 'BOX', label: 'Box / Cardboard Box' },
  { value: 'COVER', label: 'Cover / Plastic Sleeve' },
  { value: 'POUCH', label: 'Pouch / Bubble Pouch' },
  { value: 'BAG', label: 'Paper Bag / Carry Bag' },
  { value: 'GIFT_BOX', label: 'Premium Gift Box / Wrap' },
  { value: 'OTHER', label: 'Other Packaging' },
];

export function PackagingCatalogueSection() {
  const {
    packagingOptions,
    isLoading,
    createPackaging,
    updatePackaging,
    togglePackaging,
    deletePackaging,
    uploadImage,
    isCreating,
    isUpdating,
    isUploading
  } = usePackaging();

  const showToast = useUIStore((state) => state.showToast);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<PackagingOption | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('BOX');
  const [isOptional, setIsOptional] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePublicId, setImagePublicId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingOption(null);
    setName('');
    setDescription('');
    setPrice('');
    setType('BOX');
    setIsOptional(true);
    setImageUrl(null);
    setImagePublicId(null);
    setImagePreview(null);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (option: PackagingOption) => {
    setEditingOption(option);
    setName(option.name);
    setDescription(option.description || '');
    setPrice(String(option.price));
    setType(option.type || 'BOX');
    setIsOptional(option.isOptional);
    setImageUrl(option.imageUrl);
    setImagePublicId(option.imagePublicId);
    setImagePreview(option.imageUrl);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Handle Photo selection and upload
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size must be less than 5MB.');
      return;
    }

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setFormError(null);
      const res = await uploadImage(file);
      setImageUrl(res.url);
      setImagePublicId(res.publicId);
      showToast('Photograph uploaded successfully', 'success');
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to upload photo to Cloudinary.');
      setImagePreview(editingOption?.imageUrl || null);
    }
  };

  const handleRemovePhoto = () => {
    setImageUrl(null);
    setImagePublicId(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit create or edit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setFormError('Packaging name is required.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Price must be a valid number >= ₹0.');
      return;
    }

    try {
      if (editingOption) {
        const res = await updatePackaging({
          id: editingOption.id,
          payload: {
            name: cleanName,
            description: description.trim() || null,
            price: priceNum,
            type,
            isOptional,
            imageUrl,
            imagePublicId
          }
        });
        showToast(
          res.resubmittedForApproval
            ? 'Packaging option updated and resubmitted for Admin approval.'
            : 'Packaging option updated successfully.',
          'success'
        );
      } else {
        await createPackaging({
          name: cleanName,
          description: description.trim() || null,
          price: priceNum,
          type,
          isOptional,
          imageUrl,
          imagePublicId
        });
        showToast('Packaging option submitted for Admin approval.', 'success');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Failed to save packaging option.');
    }
  };

  const handleToggle = async (option: PackagingOption) => {
    try {
      await togglePackaging({ id: option.id, isActive: !option.isActive });
      showToast(`Packaging option ${!option.isActive ? 'activated' : 'deactivated'}.`, 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to toggle status.', 'error');
    }
  };

  const handleDelete = async (option: PackagingOption) => {
    if (!window.confirm(`Are you sure you want to delete "${option.name}"?`)) {
      return;
    }
    try {
      await deletePackaging(option.id);
      showToast('Packaging option removed.', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete packaging option.', 'error');
    }
  };

  const renderStatusBadge = (status: string, isActive: boolean) => {
    switch (status) {
      case 'APPROVED':
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
              <CheckCircle className="w-3 h-3 mr-1" /> Approved
            </Badge>
            {!isActive && (
              <Badge variant="secondary" className="bg-white/10 text-white/50 border border-white/10 text-[10px]">
                Disabled
              </Badge>
            )}
          </div>
        );
      case 'PENDING':
        return (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] animate-pulse">
            <Clock className="w-3 h-3 mr-1" /> Pending Approval
          </Badge>
        );
      case 'CHANGES_REQUESTED':
        return (
          <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px]">
            <AlertTriangle className="w-3 h-3 mr-1" /> Changes Requested
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px]">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge variant="destructive" className="bg-red-950/40 text-red-400 border border-red-500/30 text-[10px]">
            <Ban className="w-3 h-3 mr-1" /> Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <Card className="border border-white/10 bg-white/[0.02]">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Packaging Catalogue
          </CardTitle>
          <CardDescription className="text-xs text-white/50 mt-1">
            Create and manage individual packaging options for your shop (covers, boxes, pouches, gift wraps).
          </CardDescription>
        </div>
        <Button
          type="button"
          onClick={handleOpenCreate}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 font-medium shrink-0"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Packaging
        </Button>
      </CardHeader>

      <CardContent className="pt-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : packagingOptions.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
            <Package className="w-10 h-10 text-white/20 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-white">No packaging options yet</h4>
            <p className="text-xs text-white/40 max-w-sm mx-auto mt-1 mb-4">
              Add packaging options like small covers, cardboard boxes, or gift wrapping with transparent prices for your customers.
            </p>
            <Button
              type="button"
              onClick={handleOpenCreate}
              size="sm"
              variant="outline"
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Create Your First Option
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {packagingOptions.map((opt) => (
              <div
                key={opt.id}
                className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between hover:border-white/20 transition-all"
              >
                <div>
                  {/* Photo Thumbnail */}
                  <div className="relative h-36 bg-zinc-900 border-b border-white/5 flex items-center justify-center overflow-hidden">
                    {opt.imageUrl ? (
                      <img src={opt.imageUrl} alt={opt.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-white/30 text-[11px] gap-1">
                        <Package className="w-8 h-8 opacity-40" />
                        <span>No photo</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      {renderStatusBadge(opt.status, opt.isActive)}
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-950/80 text-white border border-white/10 backdrop-blur">
                        ₹{Number(opt.price).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white truncate">{opt.name}</h4>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                        {opt.type || 'BOX'}
                      </span>
                    </div>

                    {opt.description && (
                      <p className="text-[11px] text-white/50 line-clamp-2">{opt.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1 pt-1">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-medium border ${
                          opt.isOptional
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                        }`}
                      >
                        {opt.isOptional ? 'Optional for Customers' : 'Required for Products'}
                      </span>
                    </div>

                    {opt.rejectionReason && (
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 space-y-0.5 mt-2">
                        <span className="font-semibold block flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {opt.status === 'CHANGES_REQUESTED' ? 'Admin Feedback:' : 'Rejection Reason:'}
                        </span>
                        <p className="opacity-90">{opt.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Controls */}
                <div className="p-3 border-t border-white/5 flex items-center justify-between gap-2 bg-white/[0.01]">
                  <div className="flex items-center gap-1">
                    {opt.status === 'APPROVED' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(opt)}
                        className={`text-[10px] h-7 px-2 border-white/10 ${
                          opt.isActive ? 'text-emerald-400 hover:text-emerald-300' : 'text-white/40 hover:text-white'
                        }`}
                      >
                        {opt.isActive ? 'Active' : 'Enable'}
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(opt)}
                      className="text-[10px] h-7 px-2 border-white/10 text-white/80 hover:text-white"
                    >
                      <Edit2 className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(opt)}
                      className="text-[10px] h-7 px-2 border-rose-500/20 text-rose-400 hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-[11px] text-indigo-300 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
          <span>
            <strong>Approval Policy:</strong> All new packaging options and material price/photo changes default to{' '}
            <strong className="text-amber-300">Pending Approval</strong>. Once approved by the administrator, they will
            automatically appear on customer checkout and order breakdowns.
          </span>
        </div>
      </CardContent>

      {/* Add / Edit Packaging Dialog */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOption ? 'Edit Packaging Option' : 'Add Packaging Option'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {formError && (
            <div className="p-2.5 rounded-lg border border-red-500/20 bg-red-500/10 text-xs text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Photo Upload Section */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80 block">Packaging Photograph (Optional)</label>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                <div className="relative w-20 h-20 rounded-lg border border-white/10 overflow-hidden bg-black shrink-0">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/70 text-white hover:bg-rose-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-20 h-20 rounded-lg border border-dashed border-white/20 bg-white/[0.02] hover:bg-white/5 flex flex-col items-center justify-center cursor-pointer text-white/40 hover:text-white transition-colors shrink-0"
                >
                  <Upload className="w-5 h-5 mb-1" />
                  <span className="text-[9px]">Upload</span>
                </div>
              )}

              <div className="text-[11px] text-white/50 space-y-1">
                <p>Upload a clear photo of the box, sleeve, cover or wrapper.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-[10px] h-7 border-white/10"
                >
                  {isUploading ? 'Uploading to Cloudinary...' : imagePreview ? 'Replace Photo' : 'Select Photo'}
                </Button>
              </div>
            </div>
          </div>

          {/* Packaging Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">
              Packaging Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Small Cover, Cardboard Box, Gift Packaging"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Type and Price Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Category / Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
              >
                {PACKAGING_TYPES.map((t) => (
                  <option key={t.value} value={t.value} className="bg-zinc-900 text-white">
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">
                Price (INR ₹) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Description (Optional)</label>
            <textarea
              placeholder="e.g. Suitable for delicate pottery, includes bubble cushioning."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full text-xs px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Optional vs Mandatory Selection Toggle */}
          <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Optional for customers</span>
                <span className="text-[11px] text-white/50 block">
                  {isOptional
                    ? 'Customers can choose whether to add this packaging during checkout.'
                    : 'Required for applicable products. Customers will be clearly charged and notified before payment.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOptional(!isOptional)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  isOptional ? 'bg-indigo-600' : 'bg-zinc-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    isOptional ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {editingOption && editingOption.status === 'APPROVED' && (
            <p className="text-[11px] text-amber-400/90 bg-amber-500/10 p-2 rounded border border-amber-500/20">
              Note: Changing price, name, or photo on an approved option requires re-approval by the admin.
            </p>
          )}

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              className="text-xs text-white/70"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isCreating || isUpdating || isUploading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4"
            >
              {isCreating || isUpdating
                ? 'Submitting...'
                : editingOption
                ? 'Save & Submit'
                : 'Submit for Approval'}
            </Button>
          </div>
        </form>
      </Dialog>
    </Card>
  );
}
export default PackagingCatalogueSection;
