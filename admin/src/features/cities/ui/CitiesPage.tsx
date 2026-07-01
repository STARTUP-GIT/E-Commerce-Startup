"use client";

import React, { useState, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { cityApi } from '../api/cityApi';
import { stateApi } from '../../states/api/stateApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { MapPin, Plus, Trash2, Filter, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

function CitiesForm() {
  const queryClient = useQueryClient();
  const params = useParams();
  const router = useRouter();
  const { showToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);

  // Read stateName from dynamic path /[stateName]/districts
  const pathStateNameRaw = (params.stateName as string) || 'karnataka';
  
  // Format stateName nicely (first letter capitalized)
  const pathStateName = pathStateNameRaw.charAt(0).toUpperCase() + pathStateNameRaw.slice(1).toLowerCase();

  const { data: citiesData, isLoading: isCitiesLoading } = useQuery({
    queryKey: ['cities'],
    queryFn: cityApi.getCities,
    staleTime: 5 * 60 * 1000,
  });

  const { data: statesData, isLoading: isStatesLoading } = useQuery({
    queryKey: ['states'],
    queryFn: stateApi.getStates,
    staleTime: 5 * 60 * 1000,
  });

  const cities = citiesData?.cities ?? citiesData?.data ?? citiesData ?? [];
  const states = statesData?.states ?? statesData?.data ?? statesData ?? [];

  // Find if the current state in path is operational and check its enabled/disabled status
  const currentStateObj = (Array.isArray(states) ? states : []).find(
    (s: any) => s.name.toLowerCase() === pathStateName.toLowerCase()
  );
  
  const isStateEnabled = currentStateObj ? currentStateObj.isActive : true;

  const createForm = useForm({ 
    defaultValues: { 
      name: '', 
      state: pathStateName, 
      isActive: true 
    } 
  });

  React.useEffect(() => {
    createForm.setValue('state', pathStateName);
  }, [pathStateName, createForm]);

  const createMutation = useMutation({
    mutationFn: (v: any) => cityApi.createCity(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      showToast('District (City) added.', 'success');
      createForm.reset({ name: '', state: pathStateName, isActive: true });
      setShowForm(false);
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => cityApi.updateCity(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      showToast('District status updated.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cityApi.deleteCity(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] });
      showToast('District removed.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  // Handle dropdown state selection change
  const handleStateChange = (newSelectedState: string) => {
    router.push(`/${newSelectedState.toLowerCase()}/districts`);
  };

  // Filter cities by active pathStateName
  const stateCities = (Array.isArray(cities) ? cities : []).filter((city: any) => {
    return city.state?.toLowerCase() === pathStateName.toLowerCase();
  });

  const activeCount = stateCities.filter(c => c.isActive).length;
  const inactiveCount = stateCities.length - activeCount;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white/95">{pathStateName} Districts</h1>
            <Badge variant={isStateEnabled ? 'success' : 'secondary'} className="text-[8px] py-0.5 px-2">
              State: {isStateEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <p className="text-xs text-white/45 mt-1">Manage delivery coverage regions for {pathStateName}</p>
        </div>
        <div className="flex gap-2.5">
          {/* State Navigation Dropdown */}
          <div className="flex items-center gap-2 bg-white/[0.02] border border-white/10 rounded-xl px-3 py-1.5">
            <Filter className="h-3.5 w-3.5 text-white/40" />
            <select
              value={pathStateName}
              onChange={(e) => handleStateChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-white/80 border-none outline-none focus:ring-0 cursor-pointer"
            >
              {(Array.isArray(states) ? states : []).map((state: any) => (
                <option key={state.id} value={state.name} className="bg-[#0f0f18] text-white">
                  {state.name}
                </option>
              ))}
              {(!states || states.length === 0) && (
                <option value="Karnataka" className="bg-[#0f0f18] text-white">Karnataka</option>
              )}
            </select>
          </div>

          <Button 
            size="sm" 
            disabled={!isStateEnabled}
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="mr-2 h-3.5 w-3.5" /> Add District
          </Button>
        </div>
      </div>

      {/* Warning banner if State is disabled */}
      {!isStateEnabled && (
        <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 text-xs font-semibold flex items-start gap-3 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="space-y-1">
            <p className="font-extrabold text-white">State Operational Coverage Inactive</p>
            <p className="text-white/70">"{pathStateName}" state operational coverage is currently disabled. Enable the state under the <a href="/states" className="underline font-bold text-white hover:text-white/80">States Panel</a> to activate delivery verification and manage coverage districts.</p>
          </div>
        </div>
      )}

      {showForm && isStateEnabled && (
        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <CardContent className="pt-4">
            <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="space-y-1.5 flex-1 w-full font-sans">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">District / City Name</label>
                <Input placeholder="e.g. Mysuru" required {...createForm.register('name', { required: true })} />
              </div>
              <div className="space-y-1.5 flex-1 w-full font-sans">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Parent State</label>
                <Input disabled value={pathStateName} className="opacity-60 cursor-not-allowed" />
              </div>
              <Button type="submit" className="w-full sm:w-auto" isLoading={createMutation.isPending}>Add District</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isCitiesLoading || isStatesLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : !isStateEnabled ? (
        // Blur state when disabled
        <div className="relative rounded-2xl overflow-hidden border border-white/5 p-6 bg-white/[0.01] flex flex-col items-center justify-center py-20">
          <div className="absolute inset-0 bg-[#0a0a0f]/40 backdrop-blur-[2px] z-10" />
          <div className="relative z-20 text-center space-y-3.5 max-w-sm">
            <MapPin className="h-10 w-10 text-white/20 mx-auto" />
            <h3 className="text-sm font-extrabold text-white/80">Operational Districts Locked</h3>
            <p className="text-xs text-white/40 leading-relaxed">Please enable operational coverage for the state of **{pathStateName}** to manage, toggle, or view its delivery districts.</p>
            <Button size="sm" className="mt-2" onClick={() => router.push('/states')}>Go to States Page</Button>
          </div>
        </div>
      ) : stateCities.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <MapPin className="h-10 w-10 text-white/15 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white/70">No districts operational in {pathStateName}</h3>
          <p className="text-xs text-white/40 mt-1">Click "Add District" to begin mapping delivery coverage for this state.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary counters */}
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{pathStateName} Coverage Summary:</span>
            <Badge variant="success" className="text-[8px] px-1.5 py-0.5">
              {activeCount} Active
            </Badge>
            {inactiveCount > 0 && (
              <Badge variant="secondary" className="text-[8px] px-1.5 py-0.5">
                {inactiveCount} Inactive
              </Badge>
            )}
          </div>

          {/* Grid of Regions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stateCities.map((city: any) => (
              <Card key={city.id} className={`border glass-hover transition-all ${city.isActive ? 'border-white/8 bg-white/[0.01]' : 'border-white/3 opacity-60 bg-transparent'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <MapPin className="h-5 w-5 text-white/40" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/95">{city.name}</p>
                        <p className="text-[9px] text-white/40 mt-0.5">{city.state || 'Karnataka'}</p>
                      </div>
                    </div>
                    <Badge variant={city.isActive ? 'success' : 'secondary'} className="text-[8px]">
                      {city.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant={city.isActive ? 'outline' : 'default'}
                      className="flex-1 text-[10px] font-bold h-8"
                      isLoading={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ id: city.id, isActive: !city.isActive })}
                    >
                      {city.isActive ? 'Disable' : 'Enable'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 shrink-0"
                      isLoading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(city.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function CitiesPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-xs text-white/40">Loading districts coverage...</div>}>
      <CitiesForm />
    </Suspense>
  );
}
