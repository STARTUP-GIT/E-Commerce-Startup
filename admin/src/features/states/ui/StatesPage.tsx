"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stateApi } from '../api/stateApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';

const ALL_INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal"
];

export function StatesPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['states'],
    queryFn: stateApi.getStates,
    staleTime: 5 * 60 * 1000,
  });

  const states = data?.states ?? data?.data ?? data ?? [];
  const existingNames = new Set(states.map((s: any) => s.name.toLowerCase()));
  const availableStates = ALL_INDIAN_STATES.filter(name => !existingNames.has(name.toLowerCase()));

  const createForm = useForm({ defaultValues: { name: '', isActive: true } });

  React.useEffect(() => {
    createForm.register('name', { required: true });
  }, [createForm]);

  const selectedName = createForm.watch('name');

  const createMutation = useMutation({
    mutationFn: (v: any) => stateApi.createState(v),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['states'] }); 
      showToast('State operational coverage added.', 'success'); 
      createForm.reset(); 
      setShowForm(false); 
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => stateApi.updateState(id, { isActive }),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['states'] }); 
      showToast('State status updated.', 'success'); 
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => stateApi.deleteState(id),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['states'] }); 
      showToast('State operational coverage removed.', 'info'); 
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Operational States</h1>
          <p className="text-xs text-white/45 mt-1">Manage operational coverage states for Aura delivery & checkout validation</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-3.5 w-3.5" /> Add State
        </Button>
      </div>

      {showForm && (
        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <CardContent className="pt-4">
            <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="flex gap-3 items-end">
              <div className="space-y-1.5 flex-1 font-sans">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">State Name</label>
                <SearchableDropdown
                  options={availableStates.map(name => ({ name, isEnabled: true }))}
                  value={selectedName}
                  onChange={(val) => createForm.setValue('name', val, { shouldValidate: true })}
                  placeholder="Select a State"
                  label="State Name"
                />
              </div>
              <Button type="submit" isLoading={createMutation.isPending}>Add State</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Array.isArray(states) ? states : []).map((state: any) => (
            <Card key={state.id} className={`border glass-hover ${state.isActive ? 'border-white/8' : 'border-white/3 opacity-60'}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-white/40" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white/90">{state.name}</p>
                      <p className="text-[9px] text-white/40">Country: India</p>
                    </div>
                  </div>
                  <Badge variant={state.isActive ? 'success' : 'secondary'} className="text-[8px]">
                    {state.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <div className="flex gap-2">
                    <Button size="sm" variant={state.isActive ? 'outline' : 'default'} className="flex-1 text-[10px] font-bold" isLoading={toggleMutation.isPending} onClick={() => toggleMutation.mutate({ id: state.id, isActive: !state.isActive })}>
                      {state.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 shrink-0" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(state.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full text-[10px] font-bold border-white/15 bg-white/[0.02] hover:bg-white/[0.05] h-8"
                    onClick={() => window.location.href = `/${state.name.toLowerCase()}/districts`}
                  >
                    View Districts
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
