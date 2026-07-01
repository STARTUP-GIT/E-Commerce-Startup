import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { shopListApi } from '../api/shopListApi';
import { useLocationStore } from '@/lib/store/locationStore';

interface UseShopListProps {
  searchQuery?: string;
  coords?: { lat: number; lng: number } | null;
  radius?: number;
}

export function useShopList({ searchQuery, coords, radius }: UseShopListProps = {}) {
  const { selectedState, selectedDistrict } = useLocationStore();
  const isSearch = !!searchQuery?.trim();
  const isNearby = !!coords?.lat && !!coords?.lng;

  const queryKey = ['shops', { searchQuery, coords, radius, selectedState, selectedDistrict }];

  const query = useQuery({
    queryKey,
    queryFn: () => {
      if (isSearch) {
        return shopListApi.searchShops(searchQuery!, selectedState, selectedDistrict);
      }
      if (isNearby) {
        return shopListApi.getNearbyShops(coords!.lat, coords!.lng, radius, selectedState, selectedDistrict);
      }
      return shopListApi.getFeaturedShops(10, selectedState, selectedDistrict);
    },
    // Show previous results while fetching new ones — no flash of empty state
    placeholderData: keepPreviousData,
    // Shops list is cacheable for 5 minutes
    staleTime: 5 * 60 * 1000,
  });

  return {
    shops: query.data?.shops || [],
    count: query.data?.count || 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
