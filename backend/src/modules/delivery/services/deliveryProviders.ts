export interface DeliveryProvider {
  name: string;
  score: number;
  estimatePrice: (pickupAddress: unknown, deliveryAddress: unknown) => Promise<{ amount: number; currency?: string; provider?: string }>;
  createBooking: (payload: unknown) => Promise<any>;
  trackBooking: (providerOrderId: string) => Promise<any>;
}

class BaseProvider implements DeliveryProvider {
  name = 'BASE';
  score = 0;

  async estimatePrice() {
    return { amount: 0, currency: 'INR', provider: this.name };
  }

  async createBooking(payload: unknown) {
    return { providerOrderId: `${this.name.toLowerCase()}_${Date.now()}`, payload };
  }

  async trackBooking(providerOrderId: string) {
    return { providerOrderId, status: 'PENDING' };
  }
}

class PorterProvider extends BaseProvider {
  name = 'PORTER';
  score = 85;

  override async estimatePrice() {
    return { amount: 80, currency: 'INR', provider: this.name };
  }
}

class ShiprocketProvider extends BaseProvider {
  name = 'SHIPROCKET';
  score = 78;

  override async estimatePrice() {
    return { amount: 92, currency: 'INR', provider: this.name };
  }
}

class LocalCourierProvider extends BaseProvider {
  name = 'LOCAL_COURIER';
  score = 72;

  override async estimatePrice() {
    return { amount: 65, currency: 'INR', provider: this.name };
  }
}

const providers: DeliveryProvider[] = [
  new PorterProvider(),
  new ShiprocketProvider(),
  new LocalCourierProvider(),
];

const haversineDistanceKm = (a: any, b: any) => {
  if (!a || !b) return 12;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const lat1 = Number(a.latitude ?? a.lat ?? 0);
  const lon1 = Number(a.longitude ?? a.lng ?? 0);
  const lat2 = Number(b.latitude ?? b.lat ?? 0);
  const lon2 = Number(b.longitude ?? b.lng ?? 0);
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const earthRadius = 6371;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h = sinLat * sinLat + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * sinLon * sinLon;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

export class DeliveryDecisionEngine {
  static selectProvider({ pickupAddress, dropoffAddress }: { pickupAddress: any; dropoffAddress: any }) {
    const distanceKm = haversineDistanceKm(pickupAddress, dropoffAddress);
    const roadFactor = 1.3;
    const effectiveDistanceKm = distanceKm * roadFactor;

    const scoredProviders = providers.map((provider) => {
      const distancePenalty = Math.max(0, effectiveDistanceKm - 10) * 1.8;
      const score = provider.score - distancePenalty + (provider.name === 'PORTER' ? 8 : 0);
      return { ...provider, score };
    });

    scoredProviders.sort((a, b) => b.score - a.score);
    return scoredProviders[0];
  }
}
