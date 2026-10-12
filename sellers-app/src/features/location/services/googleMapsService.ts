// Google Maps loader & Address Normalization Service for Seller Portal

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadingPromise?: Promise<any>;
  }
}

export interface NormalizedAddress {
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  district: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  placeId: string;
}

export const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#18181b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#18181b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a1a1aa' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e4e4e7' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717a' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a1a1aa' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#18181b' }]
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717a' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3f3f46' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#27272a' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d4d4d8' }]
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#27272a' }]
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a1a1aa' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#09090b' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#71717a' }]
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#09090b' }]
  }
];

export function loadGoogleMaps(apiKey?: string): Promise<any> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window is undefined'));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__googleMapsLoadingPromise) {
    return window.__googleMapsLoadingPromise;
  }

  const key = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key) {
    return Promise.reject(new Error('Google Maps API key is not configured.'));
  }

  window.__googleMapsLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps script loaded but google.maps is not available.'));
      }
    };

    script.onerror = () => {
      reject(new Error('Failed to load Google Maps script. Check network connection or API key restrictions.'));
    };

    document.head.appendChild(script);
  });

  return window.__googleMapsLoadingPromise;
}

export function parseGooglePlace(
  place: any,
  availableStates?: Array<{ name: string }>,
  availableDistricts?: Array<{ name: string }>
): NormalizedAddress {
  const components: any[] = place.address_components || [];

  let streetNumber = '';
  let route = '';
  let subpremise = '';
  let neighborhood = '';
  let sublocality = '';
  let locality = '';
  let district = '';
  let state = '';
  let postalCode = '';
  let country = 'India';

  for (const comp of components) {
    const types: string[] = comp.types || [];
    if (types.includes('street_number')) streetNumber = comp.long_name;
    if (types.includes('route')) route = comp.long_name;
    if (types.includes('subpremise')) subpremise = comp.long_name;
    if (types.includes('neighborhood')) neighborhood = comp.long_name;
    if (types.includes('sublocality_level_1') || types.includes('sublocality')) sublocality = comp.long_name;
    if (types.includes('locality')) locality = comp.long_name;
    if (types.includes('administrative_area_level_2')) district = comp.long_name;
    if (types.includes('administrative_area_level_1')) state = comp.long_name;
    if (types.includes('postal_code')) postalCode = comp.long_name;
    if (types.includes('country')) country = comp.long_name;
  }

  // Address Line 1: Combine street number and route, or fallback to sublocality/premise
  let addressLine1 = [streetNumber, route].filter(Boolean).join(' ').trim();
  if (!addressLine1) {
    addressLine1 = sublocality || place.name || '';
  }

  // Address Line 2: Combine subpremise and neighborhood
  const addressLine2 = [subpremise, neighborhood].filter(Boolean).join(', ').trim();

  // City: Fallback to locality, or sublocality
  let city = locality || sublocality || district || '';

  // India State Resolution: Match against available marketplace states
  if (state && availableStates && availableStates.length > 0) {
    const matchedState = availableStates.find(
      s => s.name.toLowerCase() === state.toLowerCase() ||
           s.name.toLowerCase().includes(state.toLowerCase()) ||
           state.toLowerCase().includes(s.name.toLowerCase())
    );
    if (matchedState) {
      state = matchedState.name;
    }
  }

  // India District Resolution: Match against available marketplace districts
  const candidateDistrict = district || city;
  if (candidateDistrict && availableDistricts && availableDistricts.length > 0) {
    const cleanCand = candidateDistrict.toLowerCase().replace(/district|urban|rural/g, '').trim();
    const matchedDistrict = availableDistricts.find(d => {
      const cleanDist = d.name.toLowerCase().replace(/district|urban|rural/g, '').trim();
      return cleanDist === cleanCand || d.name.toLowerCase() === candidateDistrict.toLowerCase();
    });
    if (matchedDistrict) {
      district = matchedDistrict.name;
      city = matchedDistrict.name;
    }
  }

  const lat = place.geometry?.location
    ? typeof place.geometry.location.lat === 'function'
      ? place.geometry.location.lat()
      : Number(place.geometry.location.lat)
    : null;

  const lng = place.geometry?.location
    ? typeof place.geometry.location.lng === 'function'
      ? place.geometry.location.lng()
      : Number(place.geometry.location.lng)
    : null;

  return {
    formattedAddress: place.formatted_address || '',
    addressLine1,
    addressLine2,
    city: district || city,
    district: district || city,
    state,
    postalCode,
    country: country || 'India',
    latitude: lat,
    longitude: lng,
    placeId: place.place_id || ''
  };
}
