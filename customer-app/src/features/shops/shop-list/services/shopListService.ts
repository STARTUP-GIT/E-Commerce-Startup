import { Shop } from '../api/shopListApi';

export const shopListService = {
  formatDistance: (distance?: number): string => {
    if (distance === undefined || distance === null || distance === Infinity) return '';
    return `${distance.toFixed(1)} km away`;
  },
  getPlaceholderBanner: (shopName: string): string => {
    const hue = (shopName.length * 20) % 360;
    return `linear-gradient(135deg, hsl(${hue}, 70%, 50%) 0%, hsl(${(hue + 45) % 360}, 70%, 30%) 100%)`;
  },
};
