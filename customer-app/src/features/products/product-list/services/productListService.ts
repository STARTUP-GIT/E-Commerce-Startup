const RECENTLY_VIEWED_KEY = 'aura_recently_viewed_products';

export const productListService = {
  formatPrice: (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  },
  getRecentlyViewedIds: (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
  addRecentlyViewedId: (id: string): void => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(RECENTLY_VIEWED_KEY);
      let ids: string[] = stored ? JSON.parse(stored) : [];
      ids = ids.filter((existingId) => existingId !== id);
      ids.unshift(id);
      ids = ids.slice(0, 10);
      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids));
    } catch (e) {
      console.error('Error writing recently viewed products to localStorage:', e);
    }
  },
};
