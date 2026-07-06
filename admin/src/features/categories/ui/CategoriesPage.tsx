"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryApi } from '../api/categoryApi';
import { Card, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { Grid, Plus, Trash2, Edit2, GripVertical, ImageUp } from 'lucide-react';
import { useForm } from 'react-hook-form';

export function CategoriesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const categories = data?.categories ?? data?.data ?? data ?? [];

  const createForm = useForm({ defaultValues: { name: '', description: '', imageUrl: '', sortOrder: 0, isActive: true } });
  const editForm = useForm({ defaultValues: { name: '', description: '', imageUrl: '', sortOrder: 0 } });

  const createMutation = useMutation({
    mutationFn: (v: any) => categoryApi.createCategory(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Category created successfully.', 'success');
      createForm.reset();
      setShowForm(false);
    },
    onError: (e: any) => showToast(e.response?.data?.message || e.message, 'error'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => categoryApi.updateCategoryStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Category status updated.', 'success');
    },
    onError: (e: any) => showToast(e.response?.data?.message || e.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => categoryApi.updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Category updated successfully.', 'success');
      setShowEditModal(false);
      setEditingCategory(null);
    },
    onError: (e: any) => showToast(e.response?.data?.message || e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      showToast('Category deleted successfully.', 'info');
    },
    onError: (e: any) => showToast(e.response?.data?.message || e.message, 'error'),
  });

  const handleEditClick = (cat: any) => {
    setEditingCategory(cat);
    editForm.reset({
      name: cat.name,
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      sortOrder: cat.sortOrder ?? 0,
    });
    setShowEditModal(true);
  };

  const catArray = Array.isArray(categories) ? categories : [];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Marketplace Categories</h1>
          <p className="text-xs text-white/45 mt-1">Manage global product categories for seller catalogs and customer browsing</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-3.5 w-3.5" /> Add Category
        </Button>
      </div>

      {showForm && (
        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <CardContent className="pt-4">
            <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 flex-1 font-sans">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Category Name</label>
                  <Input placeholder="e.g., Electronics" {...createForm.register('name', { required: true })} />
                </div>
                <div className="space-y-1.5 flex-1 font-sans">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Description (Optional)</label>
                  <Input placeholder="e.g., Devices, gadgets, and accessories" {...createForm.register('description')} />
                </div>
                <div className="space-y-1.5 flex-1 font-sans">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Icon/Image URL (Optional)</label>
                  <Input placeholder="https://example.com/icon.png" {...createForm.register('imageUrl')} />
                </div>
                <div className="space-y-1.5 flex-1 font-sans">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Display Order</label>
                  <Input type="number" placeholder="0" {...createForm.register('sortOrder', { valueAsNumber: true })} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" isLoading={createMutation.isPending}>Create Category</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : catArray.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <Grid className="mx-auto h-12 w-12 text-white/20 mb-4" />
          <h4 className="text-base font-bold text-white/60">No categories yet</h4>
          <p className="text-sm text-white/30 mt-1">Create your first marketplace category to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {catArray.map((cat: any) => (
            <Card key={cat.id} className={`border glass-hover ${cat.isActive ? 'border-white/8' : 'border-white/3 opacity-60'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {cat.imageUrl ? (
                        <img src={cat.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Grid className="h-5 w-5 text-white/40" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white/90 truncate flex items-center gap-2">
                        {cat.name}
                        {cat.sortOrder > 0 && (
                          <span className="text-[9px] text-white/30 font-mono">#{cat.sortOrder}</span>
                        )}
                      </p>
                      <p className="text-[10px] text-white/40 line-clamp-1">{cat.description || 'No description'}</p>
                    </div>
                  </div>
                  <Badge variant={cat.isActive ? 'success' : 'secondary'} className="text-[8px] font-extrabold tracking-wider uppercase shrink-0 ml-2">
                    {cat.isActive ? 'ALLOWED' : 'NOT ALLOWED'}
                  </Badge>
                </div>
                <div className="flex gap-2 mt-5">
                  <Button
                    size="sm"
                    variant={cat.isActive ? 'outline' : 'default'}
                    className="flex-1 text-[10px] font-bold"
                    isLoading={statusMutation.isPending}
                    onClick={() => statusMutation.mutate({ id: cat.id, isActive: !cat.isActive })}
                  >
                    {cat.isActive ? 'Disallow' : 'Allow'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => handleEditClick(cat)}
                  >
                    <Edit2 className="h-3.5 w-3.5 text-white/70" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 w-8 p-0 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 shrink-0 text-red-400"
                    isLoading={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate(cat.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showEditModal && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md p-6 bg-[#0c0c12] border border-white/10 rounded-2xl shadow-xl">
            <h2 className="text-base font-bold text-white mb-1">Edit Category</h2>
            <p className="text-[11px] text-white/40 mb-4">Update the details of this marketplace category</p>
            <form onSubmit={editForm.handleSubmit((v) => updateMutation.mutate({ id: editingCategory.id, payload: v }))} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Category Name</label>
                <Input {...editForm.register('name', { required: true })} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Description (Optional)</label>
                <Input {...editForm.register('description')} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Icon/Image URL (Optional)</label>
                <Input placeholder="https://example.com/icon.png" {...editForm.register('imageUrl')} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Display Order</label>
                <Input type="number" placeholder="0" {...editForm.register('sortOrder', { valueAsNumber: true })} />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingCategory(null); }}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={updateMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
