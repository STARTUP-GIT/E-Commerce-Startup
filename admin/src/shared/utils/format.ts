const formatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export const formatPrice = (price: number | string | null | undefined): string => {
  if (price === null || price === undefined) return '₹0.00';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '₹0.00';
  return formatter.format(num);
};
