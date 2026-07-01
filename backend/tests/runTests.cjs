const assert = require('assert');
try {
  function applyGST(amount, gstPercent) {
    const gst = Math.round((amount * gstPercent) / 100);
    return { gst, total: amount + gst };
  }

  function grandTotal(productTotal, packing, delivery, platformFee = 0, gstPercent = 0) {
    const subtotal = productTotal + packing + delivery + platformFee;
    const { gst, total } = applyGST(subtotal, gstPercent);
    return { subtotal, gst, total };
  }

  const r1 = applyGST(1000, 18);
  assert.strictEqual(r1.gst, Math.round(1000 * 18 / 100));

  const gt = grandTotal(1000, 50, 80, 0, 18);
  const expectedSubtotal = 1000 + 50 + 80 + 0;
  const expectedGst = Math.round(expectedSubtotal * 18 / 100);
  assert.strictEqual(gt.subtotal, expectedSubtotal);
  assert.strictEqual(gt.gst, expectedGst);

  console.log('All delivery helper tests (self-contained) passed');

  // 2. GST Format Validation Regex Test
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  assert.strictEqual(gstRegex.test("22AAAAA1111A1Z1"), true);
  assert.strictEqual(gstRegex.test("22AAAAA1111A1ZA"), true);
  assert.strictEqual(gstRegex.test("22AAAAA1111A1Z"), false); // too short
  assert.strictEqual(gstRegex.test("22AAAAA1111A1Z12"), false); // too long
  assert.strictEqual(gstRegex.test("AAAAAA1111A1Z1"), false); // invalid state code
  console.log('GSTIN format regex validation tests passed');

  // 3. Enforce Status Checks validation logic
  function canApproveSeller(sellerStatus) {
    if (sellerStatus === "PENDING_VERIFICATION") {
      return { allowed: false, message: "Shop is in DRAFT status and must be submitted for approval by the seller first." };
    }
    if (sellerStatus === "PENDING_APPROVAL") {
      return { allowed: true };
    }
    return { allowed: false, message: "Invalid status for approval" };
  }
  
  assert.deepStrictEqual(canApproveSeller("PENDING_VERIFICATION"), { allowed: false, message: "Shop is in DRAFT status and must be submitted for approval by the seller first." });
  assert.deepStrictEqual(canApproveSeller("PENDING_APPROVAL"), { allowed: true });
  console.log('Admin status block validation tests passed');

} catch (err) {
  console.error('Tests failed', err);
  process.exit(1);
}
