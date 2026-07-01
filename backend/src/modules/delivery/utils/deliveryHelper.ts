export const applyGST = (amount: number, gstPercent: number) => {
  const gst = Math.round((amount * gstPercent) / 100);
  return { gst, total: amount + gst };
};

export const grandTotal = (productTotal: number, packing: number, delivery: number, platformFee = 0, gstPercent = 0) => {
  const subtotal = productTotal + packing + delivery + platformFee;
  const { gst, total } = applyGST(subtotal, gstPercent);
  return { subtotal, gst, total };
};

export default { applyGST, grandTotal };
