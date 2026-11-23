import axios from "axios";
import { logger } from "../../../config/logger.js";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResult {
  distanceKm: number;
  roadDistanceKm: number;
  straightLineDistanceKm: number;
  durationMins: number;
  polyline?: string;
  source: "GOOGLE_MAPS" | "FALLBACK_CALCULATION";
  navigationUrl: string;
  pickupNavigationUrl: string;
  dropoffNavigationUrl: string;
}

export const haversineStraightLineKm = (a: LatLng, b: LatLng): number => {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = Number(a.lat);
  const lon1 = Number(a.lng);
  const lat2 = Number(b.lat);
  const lon2 = Number(b.lng);

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const earthRadiusKm = 6371;

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLon * sinLon;
  const straightLine = 2 * earthRadiusKm * Math.asin(Math.sqrt(h));

  return Math.round(straightLine * 100) / 100;
};

export const haversineDistanceKm = (a: LatLng, b: LatLng): number => {
  const straightLine = haversineStraightLineKm(a, b);
  // Indian urban road winding factor (1.35x straight line)
  return Math.round(straightLine * 1.35 * 100) / 100;
};

export class GoogleMapsService {
  private static getApiKey(): string {
    return (
      process.env.GOOGLE_MAPS_SERVER_API_KEY ||
      process.env.GOOGLE_MAPS_API_KEY ||
      ""
    );
  }

  static getNavigationUrl(destination: LatLng): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
  }

  static getTurnByTurnUrl(origin: LatLng, destination: LatLng): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  }

  static async calculateRoute(
    origin: LatLng,
    destination: LatLng
  ): Promise<RouteResult> {
    const straightLineDistanceKm = haversineStraightLineKm(origin, destination);
    const apiKey = this.getApiKey();

    const pickupNav = this.getNavigationUrl(origin);
    const dropoffNav = this.getNavigationUrl(destination);
    const fullRouteNav = this.getTurnByTurnUrl(origin, destination);

    if (apiKey) {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=driving&key=${apiKey}`;
        const response = await axios.get(url, { timeout: 4000 });

        if (
          response.data &&
          response.data.status === "OK" &&
          response.data.routes &&
          response.data.routes.length > 0
        ) {
          const route = response.data.routes[0];
          const leg = route.legs[0];
          const distanceMeters = leg.distance?.value || 0;
          const durationSeconds = leg.duration?.value || 0;
          const roadDistKm = Math.round((distanceMeters / 1000) * 100) / 100;

          return {
            distanceKm: roadDistKm,
            roadDistanceKm: roadDistKm,
            straightLineDistanceKm,
            durationMins: Math.max(1, Math.round(durationSeconds / 60)),
            polyline: route.overview_polyline?.points,
            source: "GOOGLE_MAPS",
            navigationUrl: fullRouteNav,
            pickupNavigationUrl: pickupNav,
            dropoffNavigationUrl: dropoffNav,
          };
        }
      } catch (err: any) {
        logger.warn(
          `[GoogleMapsService] Directions API error, falling back: ${err?.message}`
        );
      }
    }

    // High accuracy fallback calculation when API key not yet configured
    const distKm = haversineDistanceKm(origin, destination);
    // Average urban two-wheeler speed in Mysuru is ~25 km/h
    const estimatedMinutes = Math.max(5, Math.round((distKm / 25) * 60));

    return {
      distanceKm: Math.max(0.5, distKm),
      roadDistanceKm: Math.max(0.5, distKm),
      straightLineDistanceKm,
      durationMins: estimatedMinutes,
      source: "FALLBACK_CALCULATION",
      navigationUrl: fullRouteNav,
      pickupNavigationUrl: pickupNav,
      dropoffNavigationUrl: dropoffNav,
    };
  }

  static async geocodeAddress(
    address: string,
    cityHint = "Mysuru"
  ): Promise<LatLng | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const fullQuery = `${address}, ${cityHint}, Karnataka, India`;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        fullQuery
      )}&key=${apiKey}`;
      const response = await axios.get(url, { timeout: 4000 });

      if (
        response.data &&
        response.data.status === "OK" &&
        response.data.results?.length > 0
      ) {
        const loc = response.data.results[0].geometry.location;
        return {
          lat: loc.lat,
          lng: loc.lng,
        };
      }
    } catch (err: any) {
      logger.warn(`[GoogleMapsService] Geocode error: ${err?.message}`);
    }

    return null;
  }
}
