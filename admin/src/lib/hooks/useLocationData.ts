'use client';

import { useQuery } from '@tanstack/react-query';
import { stateApi } from '@/features/states/api/stateApi';
import { cityApi } from '@/features/cities/api/cityApi';

export interface StateRecord {
  id: string;
  name: string;
  isActive: boolean;
}

export interface DistrictRecord {
  id: string;
  name: string;
  state: string;
  isActive: boolean;
  launchStatus?: string;
  isCustomerEnabled?: boolean;
  isSellerEnabled?: boolean;
  isDeliveryEnabled?: boolean;
}

export function useLocationData(options?: { operationalOnly?: boolean }) {
  const operationalOnly = options?.operationalOnly ?? true;

  const statesQuery = useQuery({
    queryKey: ['states-data'],
    queryFn: stateApi.getStates,
    staleTime: 5 * 60 * 1000,
  });

  const citiesQuery = useQuery({
    queryKey: ['cities-data'],
    queryFn: cityApi.getCities,
    staleTime: 5 * 60 * 1000,
  });

  const allStates: StateRecord[] = statesQuery.data?.states || [];
  const allDistricts: DistrictRecord[] = citiesQuery.data?.cities || [];

  // Filter based on operational status if requested
  const states = operationalOnly ? allStates.filter((s) => s.isActive) : allStates;

  const getDistrictsForState = (stateName?: string, onlyOperational = operationalOnly) => {
    if (!stateName || stateName === 'ALL' || stateName === 'UNASSIGNED') return [];
    return allDistricts.filter((d) => {
      const stateMatches = d.state.trim().toLowerCase() === stateName.trim().toLowerCase();
      if (!stateMatches) return false;
      return onlyOperational ? d.isActive : true;
    });
  };

  return {
    states,
    allStates,
    allDistricts,
    getDistrictsForState,
    isLoading: statesQuery.isLoading || citiesQuery.isLoading,
    isError: statesQuery.isError || citiesQuery.isError,
  };
}
