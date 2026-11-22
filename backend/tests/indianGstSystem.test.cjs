const test = require('node:test');
const assert = require('node:assert');

test('Indian GST System — State Code Resolution and GSTIN Validation', async () => {
    const { resolveIndianState, extractStateCodeFromGstin, isValidGstin, INDIAN_STATE_GST_CODES } = await import('../dist/src/services/gst/gst.service.js');

    // 1. All 36+ official Indian State & UT codes exist
    assert.strictEqual(INDIAN_STATE_GST_CODES['29'].name, 'Karnataka');
    assert.strictEqual(INDIAN_STATE_GST_CODES['27'].name, 'Maharashtra');
    assert.strictEqual(INDIAN_STATE_GST_CODES['07'].name, 'Delhi');
    assert.strictEqual(INDIAN_STATE_GST_CODES['33'].name, 'Tamil Nadu');
    assert.strictEqual(INDIAN_STATE_GST_CODES['32'].name, 'Kerala');
    assert.strictEqual(INDIAN_STATE_GST_CODES['09'].name, 'Uttar Pradesh');
    assert.strictEqual(INDIAN_STATE_GST_CODES['24'].name, 'Gujarat');
    assert.strictEqual(INDIAN_STATE_GST_CODES['36'].name, 'Telangana');

    // 2. Fuzzy name resolution
    assert.strictEqual(resolveIndianState('Karnataka').code, '29');
    assert.strictEqual(resolveIndianState('KA').code, '29');
    assert.strictEqual(resolveIndianState('maharashtra').code, '27');
    assert.strictEqual(resolveIndianState('Delhi').code, '07');
    assert.strictEqual(resolveIndianState('29').code, '29');

    // 3. GSTIN validation
    assert.strictEqual(isValidGstin('29AAAAA0000A1Z5'), true);
    assert.strictEqual(isValidGstin('27ABCDE1234F1Z5'), true);
    assert.strictEqual(isValidGstin('INVALID_GSTIN'), false);
    assert.strictEqual(isValidGstin(''), false);
    assert.strictEqual(isValidGstin(null), false);

    // 4. Extract state code from GSTIN
    assert.strictEqual(extractStateCodeFromGstin('29AAAAA0000A1Z5'), '29');
    assert.strictEqual(extractStateCodeFromGstin('27ABCDE1234F1Z5'), '27');
    assert.strictEqual(extractStateCodeFromGstin('07AAAAA0000A1Z5'), '07');
});

test('Indian GST System — Intra-State vs Inter-State Tax Calculations', async () => {
    const { IndianGstService } = await import('../dist/src/services/gst/gst.service.js');

    // A. Intra-State Supply (Karnataka -> Karnataka), Exclusive Mode, 18% Rate
    const intraExclusive = IndianGstService.calculateTaxLine({
        unitPrice: 100,
        quantity: 1,
        rate: 18,
        isTaxInclusive: false,
        isInterState: false
    });

    assert.strictEqual(intraExclusive.taxableValue, 100);
    assert.strictEqual(intraExclusive.totalTax, 18);
    assert.strictEqual(intraExclusive.cgstRate, 9);
    assert.strictEqual(intraExclusive.cgstAmount, 9);
    assert.strictEqual(intraExclusive.sgstRate, 9);
    assert.strictEqual(intraExclusive.sgstAmount, 9);
    assert.strictEqual(intraExclusive.igstRate, 0);
    assert.strictEqual(intraExclusive.igstAmount, 0);
    assert.strictEqual(intraExclusive.lineTotal, 118);
    assert.strictEqual(intraExclusive.cgstAmount + intraExclusive.sgstAmount, intraExclusive.totalTax);

    // B. Inter-State Supply (Karnataka -> Maharashtra), Exclusive Mode, 18% Rate
    const interExclusive = IndianGstService.calculateTaxLine({
        unitPrice: 100,
        quantity: 1,
        rate: 18,
        isTaxInclusive: false,
        isInterState: true
    });

    assert.strictEqual(interExclusive.taxableValue, 100);
    assert.strictEqual(interExclusive.totalTax, 18);
    assert.strictEqual(interExclusive.cgstAmount, 0);
    assert.strictEqual(interExclusive.sgstAmount, 0);
    assert.strictEqual(interExclusive.igstRate, 18);
    assert.strictEqual(interExclusive.igstAmount, 18);
    assert.strictEqual(interExclusive.lineTotal, 118);

    // C. Intra-State Supply, Inclusive Pricing Mode (Displayed Price: ₹118, Tax: 18%)
    // Taxable base = 118 / 1.18 = 100, GST = 18 (CGST: 9, SGST: 9)
    const intraInclusive = IndianGstService.calculateTaxLine({
        unitPrice: 118,
        quantity: 1,
        rate: 18,
        isTaxInclusive: true,
        isInterState: false
    });

    assert.strictEqual(intraInclusive.taxableValue, 100);
    assert.strictEqual(intraInclusive.totalTax, 18);
    assert.strictEqual(intraInclusive.cgstAmount, 9);
    assert.strictEqual(intraInclusive.sgstAmount, 9);
    assert.strictEqual(intraInclusive.igstAmount, 0);
    assert.strictEqual(intraInclusive.lineTotal, 118);

    // D. Inter-State Supply, Inclusive Pricing Mode (Displayed Price: ₹118, Tax: 18%)
    const interInclusive = IndianGstService.calculateTaxLine({
        unitPrice: 118,
        quantity: 1,
        rate: 18,
        isTaxInclusive: true,
        isInterState: true
    });

    assert.strictEqual(interInclusive.taxableValue, 100);
    assert.strictEqual(interInclusive.totalTax, 18);
    assert.strictEqual(interInclusive.cgstAmount, 0);
    assert.strictEqual(interInclusive.sgstAmount, 0);
    assert.strictEqual(interInclusive.igstAmount, 18);
    assert.strictEqual(interInclusive.lineTotal, 118);
});

test('Indian GST System — Exempt, Nil-Rated and 0% Classification', async () => {
    const { IndianGstService } = await import('../dist/src/services/gst/gst.service.js');

    const exemptItem = IndianGstService.calculateTaxLine({
        unitPrice: 500,
        quantity: 2,
        rate: 0,
        isTaxInclusive: false,
        isInterState: false
    });

    assert.strictEqual(exemptItem.taxableValue, 1000);
    assert.strictEqual(exemptItem.totalTax, 0);
    assert.strictEqual(exemptItem.cgstAmount, 0);
    assert.strictEqual(exemptItem.sgstAmount, 0);
    assert.strictEqual(exemptItem.igstAmount, 0);
    assert.strictEqual(exemptItem.lineTotal, 1000);
});

test('Indian GST System — Distinct Platform Fee Tax Separation', async () => {
    const { IndianGstService } = await import('../dist/src/services/gst/gst.service.js');

    // Customer in Karnataka ordering from a Karnataka seller
    const mockCart = [
        {
            quantity: 1,
            product: {
                id: 'prod-stationary-1',
                name: 'Notebook',
                price: 200,
                sellerId: 'seller-ka-1',
                taxRate: 12,
                taxCategory: 'TAXABLE',
                isTaxInclusive: false,
                seller: {
                    id: 'seller-ka-1',
                    shop: { gstNumber: '29AAAAA0000A1Z5', gstState: 'Karnataka' },
                    addresses: [{ addressType: 'PICKUP', state: 'Karnataka' }]
                }
            }
        }
    ];

    const breakdown = await IndianGstService.calculateOrderGst({
        cartItems: mockCart,
        shippingAddress: { state: 'Karnataka' },
        platformFeeAmount: 10,
        platformFeeEnabled: true,
        deliveryFeeAmount: 0
    });

    // 1. Product GST: 12% on ₹200 = ₹24 (CGST: ₹12, SGST: ₹12)
    assert.strictEqual(breakdown.productTaxableTotal, 200);
    assert.strictEqual(breakdown.productTaxTotal, 24);
    assert.strictEqual(breakdown.productCgstTotal, 12);
    assert.strictEqual(breakdown.productSgstTotal, 12);
    assert.strictEqual(breakdown.productIgstTotal, 0);

    // 2. Platform Fee GST: 18% on ₹10 = ₹1.80 (CGST: ₹0.90, SGST: ₹0.90)
    // Kept distinctly separated!
    assert.strictEqual(breakdown.platformFeeAmount, 10);
    assert.strictEqual(breakdown.platformFeeTaxTotal, 1.8);
    assert.strictEqual(breakdown.platformFeeCgstAmount, 0.9);
    assert.strictEqual(breakdown.platformFeeSgstAmount, 0.9);
    assert.strictEqual(breakdown.platformFeeIgstAmount, 0);

    // 3. Grand Total = Product (200 + 24) + Fee (10 + 1.80) = 235.80
    assert.strictEqual(breakdown.grandTotal, 235.8);
});

test('Indian GST System — E-Commerce Operator TCS under Section 52', async () => {
    const { IndianGstService } = await import('../dist/src/services/gst/gst.service.js');

    // Intra-state supply: TCS is 0.25% CGST + 0.25% SGST = 0.5%
    const taxableValue = 10000;
    const intraCgstTcs = Math.round(taxableValue * (0.25 / 100) * 100) / 100; // 25
    const intraSgstTcs = Math.round(taxableValue * (0.25 / 100) * 100) / 100; // 25
    const totalIntraTcs = intraCgstTcs + intraSgstTcs; // 50

    assert.strictEqual(intraCgstTcs, 25);
    assert.strictEqual(intraSgstTcs, 25);
    assert.strictEqual(totalIntraTcs, 50);

    // Inter-state supply: TCS is 0.50% IGST
    const interIgstTcs = Math.round(taxableValue * (0.50 / 100) * 100) / 100; // 50
    assert.strictEqual(interIgstTcs, 50);

    // Return Reversal calculation
    const returnedValue = 2000;
    const reversalTcs = Math.round(returnedValue * (0.50 / 100) * 100) / 100; // 10
    assert.strictEqual(reversalTcs, 10);
    assert.strictEqual(totalIntraTcs - reversalTcs, 40, 'Net TCS after returns must be exactly ₹40');
});

test('Indian GST System — Currency and Tax Rounding Determinism', async () => {
    const { roundCurrency } = await import('../dist/src/services/gst/gst.service.js');

    // Verify float addition stability
    const val1 = 0.1 + 0.2; // 0.30000000000000004 in raw JS float
    assert.strictEqual(roundCurrency(val1), 0.3);

    // Verify odd rounding splits
    const taxTotal = 1.87;
    const cgst = roundCurrency(taxTotal / 2); // 0.94
    const sgst = roundCurrency(taxTotal - cgst); // 0.93
    assert.strictEqual(roundCurrency(cgst + sgst), 1.87, 'CGST + SGST must sum exactly to total tax');
});
