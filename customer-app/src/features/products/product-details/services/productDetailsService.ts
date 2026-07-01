import { Review } from '../api/productDetailsApi';

export const productDetailsService = {
  calculateAverageRating: (reviews: Review[]): number => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return sum / reviews.length;
  },
  getStarBreakdown: (reviews: Review[]): Record<number, number> => {
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (!reviews || reviews.length === 0) return breakdown;
    
    reviews.forEach((r) => {
      const rating = Math.round(r.rating) as 5 | 4 | 3 | 2 | 1;
      if (breakdown[rating] !== undefined) {
        breakdown[rating]++;
      }
    });
    
    const total = reviews.length;
    Object.keys(breakdown).forEach((key) => {
      const star = parseInt(key, 10) as 5 | 4 | 3 | 2 | 1;
      breakdown[star] = Math.round((breakdown[star] / total) * 100);
    });
    
    return breakdown;
  },
};
