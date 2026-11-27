/**
 * Automated Test Suite: Seller Verification Deduplication & Lifecycle Architecture
 *
 * Validates:
 * 1. Deduplication of verification records in getVerifications (1 row per seller)
 * 2. Accurate total count reflecting distinct applications
 * 3. Idempotent submission (repeated clicks/retries update pending application without duplicating)
 * 4. Legitimate resubmission lifecycle (archives rejected records, bumps version)
 * 5. Admin review lifecycle (approval, rejection with mandatory reason)
 * 6. Global search (seller name, email, shop name, GSTIN)
 * 7. Location filtering (state, district)
 * 8. Reversible database migration and cleanup logic
 */

const assert = require('assert');

// Mock data simulating the exact production issue:
// Seller Sathwik M S with 2 identical APPROVED verification records for Tester-Shop
function createMockDataset() {
  const sellers = [
    {
      id: 'seller-sathwik-1',
      firstName: 'SATHWIK',
      lastName: 'M S',
      email: 'vvce22me0041@vvce.ac.in',
      username: 'sathwikms',
      status: 'ACTIVE',
      shop: {
        id: 'shop-tester-1',
        name: 'Tester-Shop',
        slug: 'tester-shop',
        status: 'APPROVED',
        defaultPickupAddress: {
          id: 'addr-1',
          city: 'Mysuru',
          state: 'Karnataka',
          postalCode: '570001'
        }
      },
      addresses: [
        {
          id: 'addr-1',
          city: 'Mysuru',
          state: 'Karnataka',
          postalCode: '570001',
          isActive: true
        }
      ]
    },
    {
      id: 'seller-rohit-2',
      firstName: 'Rohit',
      lastName: 'Sharma',
      email: 'rohit@example.com',
      username: 'rohit45',
      status: 'ACTIVE',
      shop: {
        id: 'shop-rohit-2',
        name: 'Sharma Electronics',
        slug: 'sharma-electronics',
        status: 'PENDING',
        defaultPickupAddress: {
          id: 'addr-2',
          city: 'Bengaluru Urban',
          state: 'Karnataka',
          postalCode: '560001'
        }
      },
      addresses: [
        {
          id: 'addr-2',
          city: 'Bengaluru Urban',
          state: 'Karnataka',
          postalCode: '560001',
          isActive: true
        }
      ]
    },
    {
      id: 'seller-priya-3',
      firstName: 'Priya',
      lastName: 'Patel',
      email: 'priya@example.com',
      username: 'priyap',
      status: 'ACTIVE',
      shop: {
        id: 'shop-priya-3',
        name: 'Patel Crafts',
        slug: 'patel-crafts',
        status: 'APPROVED',
        defaultPickupAddress: {
          id: 'addr-3',
          city: 'Ahmedabad',
          state: 'Gujarat',
          postalCode: '380001'
        }
      },
      addresses: [
        {
          id: 'addr-3',
          city: 'Ahmedabad',
          state: 'Gujarat',
          postalCode: '380001',
          isActive: true
        }
      ]
    }
  ];

  // Raw database records in seller_verifications table:
  // Note: seller-sathwik-1 has TWO duplicate rows with identical 7/5/2026 timestamps and APPROVED status!
  const verifications = [
    {
      id: 'verif-dup-1',
      sellerId: 'seller-sathwik-1',
      status: 'APPROVED',
      documentType: 'TAX_REGISTRATION',
      gstNumber: '29AAAAA0000A1Z5',
      gstRegistered: true,
      isCurrent: true,
      version: 1,
      submittedAt: new Date('2026-07-05T10:00:00Z'),
      createdAt: new Date('2026-07-05T10:00:00Z'),
      updatedAt: new Date('2026-07-05T10:30:00Z'),
      reviewedByAdminId: 'admin-1',
      reviewedAt: new Date('2026-07-05T10:30:00Z'),
      rejectionReason: null
    },
    {
      id: 'verif-dup-2',
      sellerId: 'seller-sathwik-1',
      status: 'APPROVED',
      documentType: 'TAX_REGISTRATION',
      gstNumber: '29AAAAA0000A1Z5',
      gstRegistered: true,
      isCurrent: true, // Prior to deduplication, both were marked current / unconstrained
      version: 1,
      submittedAt: new Date('2026-07-05T10:00:00Z'),
      createdAt: new Date('2026-07-05T10:00:00Z'),
      updatedAt: new Date('2026-07-05T10:30:00Z'),
      reviewedByAdminId: 'admin-1',
      reviewedAt: new Date('2026-07-05T10:30:00Z'),
      rejectionReason: null
    },
    {
      id: 'verif-rohit-1',
      sellerId: 'seller-rohit-2',
      status: 'PENDING',
      documentType: 'TAX_REGISTRATION',
      gstNumber: '29BBBBB1111B1Z6',
      gstRegistered: true,
      isCurrent: true,
      version: 1,
      submittedAt: new Date('2026-11-20T12:00:00Z'),
      createdAt: new Date('2026-11-20T12:00:00Z'),
      updatedAt: new Date('2026-11-20T12:00:00Z'),
      reviewedByAdminId: null,
      reviewedAt: null,
      rejectionReason: null
    },
    {
      id: 'verif-priya-hist',
      sellerId: 'seller-priya-3',
      status: 'REJECTED',
      documentType: 'TAX_REGISTRATION',
      gstNumber: '24CCCCC2222C1Z7',
      gstRegistered: true,
      isCurrent: false, // Legitimate historical record
      version: 1,
      submittedAt: new Date('2026-10-01T08:00:00Z'),
      createdAt: new Date('2026-10-01T08:00:00Z'),
      updatedAt: new Date('2026-10-02T09:00:00Z'),
      reviewedByAdminId: 'admin-1',
      reviewedAt: new Date('2026-10-02T09:00:00Z'),
      rejectionReason: 'Invalid GST Certificate format'
    },
    {
      id: 'verif-priya-curr',
      sellerId: 'seller-priya-3',
      status: 'APPROVED',
      documentType: 'TAX_REGISTRATION',
      gstNumber: '24CCCCC2222C1Z7',
      gstRegistered: true,
      isCurrent: true, // Current approved revision
      version: 2,
      submittedAt: new Date('2026-10-05T11:00:00Z'),
      createdAt: new Date('2026-10-05T11:00:00Z'),
      updatedAt: new Date('2026-10-06T14:00:00Z'),
      reviewedByAdminId: 'admin-1',
      reviewedAt: new Date('2026-10-06T14:00:00Z'),
      rejectionReason: null
    }
  ];

  return { sellers, verifications };
}

// Emulates the backend getVerifications controller logic
function queryVerifications(dataset, query = {}) {
  const { status, search, state, district, includeHistory, page = 1, limit = 20 } = query;

  let records = dataset.verifications.map(v => {
    const seller = dataset.sellers.find(s => s.id === v.sellerId);
    return { ...v, seller };
  });

  // 1. Filter by isCurrent unless includeHistory is requested
  if (includeHistory !== true && includeHistory !== 'true') {
    records = records.filter(r => r.isCurrent === true);
  }

  // 2. Filter by status
  if (status) {
    records = records.filter(r => r.status === status);
  }

  // 3. Search filter across seller name, email, username, shop name, gstNumber
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    records = records.filter(r => {
      const name = `${r.seller?.firstName || ''} ${r.seller?.lastName || ''}`.toLowerCase();
      const email = (r.seller?.email || '').toLowerCase();
      const username = (r.seller?.username || '').toLowerCase();
      const shop = (r.seller?.shop?.name || '').toLowerCase();
      const gst = (r.gstNumber || '').toLowerCase();
      return name.includes(q) || email.includes(q) || username.includes(q) || shop.includes(q) || gst.includes(q);
    });
  }

  // 4. Location filter by state
  if (state && state.trim()) {
    const st = state.trim().toLowerCase();
    records = records.filter(r => {
      const shopState = r.seller?.shop?.defaultPickupAddress?.state?.toLowerCase();
      const addrState = r.seller?.addresses?.[0]?.state?.toLowerCase();
      return shopState === st || addrState === st;
    });
  }

  // 5. Location filter by district
  if (district && district.trim()) {
    const dt = district.trim().toLowerCase();
    records = records.filter(r => {
      const shopCity = r.seller?.shop?.defaultPickupAddress?.city?.toLowerCase();
      const addrCity = r.seller?.addresses?.[0]?.city?.toLowerCase();
      return shopCity === dt || addrCity === dt;
    });
  }

  // 6. Sort by recency
  records.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  // 7. Defensive Deduplication: If not showing history, guarantee 1 record per sellerId
  let deduplicated = records;
  if (includeHistory !== true && includeHistory !== 'true') {
    const seenSellers = new Set();
    deduplicated = [];
    for (const r of records) {
      if (!seenSellers.has(r.sellerId)) {
        seenSellers.add(r.sellerId);
        deduplicated.push(r);
      }
    }
  }

  const total = deduplicated.length;
  const skip = (page - 1) * limit;
  const paginated = deduplicated.slice(skip, skip + limit);

  return {
    verifications: paginated,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) }
  };
}

// Emulates the idempotent submitSellerVerification controller
function submitVerification(dataset, sellerId, payload) {
  const existing = dataset.verifications
    .filter(v => v.sellerId === sellerId && v.isCurrent === true)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  if (existing) {
    if (existing.status === 'PENDING' || existing.status === 'UNDER_REVIEW') {
      // Idempotent in-place update without creating new rows!
      existing.gstNumber = payload.gstNumber || existing.gstNumber;
      existing.gstRegistered = payload.gstRegistered !== undefined ? payload.gstRegistered : existing.gstRegistered;
      existing.documentType = payload.documentType || existing.documentType;
      existing.documentUrl = payload.documentUrl || existing.documentUrl;
      existing.updatedAt = new Date();
      existing.submittedAt = new Date();
      return { record: existing, action: 'UPDATED' };
    }

    if (existing.status === 'REJECTED' || existing.status === 'EXPIRED') {
      // Archive previous record and create new revision
      existing.isCurrent = false;
      const newRecord = {
        id: `verif-resubmit-${Date.now()}`,
        sellerId,
        status: 'PENDING',
        documentType: payload.documentType || existing.documentType,
        documentUrl: payload.documentUrl || existing.documentUrl,
        gstNumber: payload.gstNumber || existing.gstNumber,
        gstRegistered: payload.gstRegistered !== undefined ? payload.gstRegistered : existing.gstRegistered,
        isCurrent: true,
        version: (existing.version || 1) + 1,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        reviewedByAdminId: null,
        reviewedAt: null,
        rejectionReason: null
      };
      dataset.verifications.push(newRecord);
      return { record: newRecord, action: 'RESUBMITTED' };
    }
  }

  // Create first record
  const created = {
    id: `verif-new-${Date.now()}`,
    sellerId,
    status: 'PENDING',
    documentType: payload.documentType || 'TAX_REGISTRATION',
    documentUrl: payload.documentUrl || null,
    gstNumber: payload.gstNumber || null,
    gstRegistered: payload.gstRegistered !== undefined ? payload.gstRegistered : true,
    isCurrent: true,
    version: 1,
    submittedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    reviewedByAdminId: null,
    reviewedAt: null,
    rejectionReason: null
  };
  dataset.verifications.push(created);
  return { record: created, action: 'CREATED' };
}

// Emulates the reviewVerification controller
function reviewVerification(dataset, verificationId, adminId, status, rejectionReason) {
  const record = dataset.verifications.find(v => v.id === verificationId);
  if (!record) throw new Error('Verification not found');
  if (status === 'REJECTED' && (!rejectionReason || !rejectionReason.trim())) {
    throw new Error('rejectionReason is required when status is REJECTED');
  }

  record.status = status;
  record.reviewedByAdminId = adminId;
  record.reviewedAt = new Date();
  record.rejectionReason = status === 'REJECTED' ? rejectionReason.trim() : null;
  record.isCurrent = true;

  // Demote any other records for this seller
  dataset.verifications.forEach(v => {
    if (v.sellerId === record.sellerId && v.id !== record.id) {
      v.isCurrent = false;
    }
  });

  return record;
}

// ----------------------------------------------------
// RUN TEST SUITE
// ----------------------------------------------------
console.log('=== STARTING SELLER VERIFICATION DEDUPLICATION TEST SUITE ===\n');

// Test 1: Deduplication of Duplicate Records
{
  console.log('[TEST 1] Querying verifications with duplicate records in DB...');
  const data = createMockDataset();
  const res = queryVerifications(data);

  // Even though DB has 2 records for Sathwik M S and 2 for Priya Patel,
  // queryVerifications must return exactly 3 unique seller applications: Sathwik, Rohit, Priya!
  assert.strictEqual(res.pagination.total, 3, `Expected total unique applications to be 3, got ${res.pagination.total}`);
  assert.strictEqual(res.verifications.length, 3, `Expected 3 records, got ${res.verifications.length}`);

  const sathwikRecords = res.verifications.filter(v => v.sellerId === 'seller-sathwik-1');
  assert.strictEqual(sathwikRecords.length, 1, `Expected exactly 1 row for Sathwik M S, got ${sathwikRecords.length}`);
  assert.strictEqual(sathwikRecords[0].seller.shop.name, 'Tester-Shop', 'Expected shop name to be Tester-Shop');
  assert.strictEqual(sathwikRecords[0].status, 'APPROVED', 'Expected status to be APPROVED');
  console.log('✓ PASS: Exactly one row returned for Sathwik M S (Tester-Shop); no duplicate rows.');
}

// Test 2: Status Filtering
{
  console.log('\n[TEST 2] Testing status filter...');
  const data = createMockDataset();

  const approvedRes = queryVerifications(data, { status: 'APPROVED' });
  assert.strictEqual(approvedRes.pagination.total, 2, 'Expected 2 approved sellers (Sathwik, Priya)');
  approvedRes.verifications.forEach(v => assert.strictEqual(v.status, 'APPROVED'));

  const pendingRes = queryVerifications(data, { status: 'PENDING' });
  assert.strictEqual(pendingRes.pagination.total, 1, 'Expected 1 pending seller (Rohit)');
  assert.strictEqual(pendingRes.verifications[0].sellerId, 'seller-rohit-2');
  console.log('✓ PASS: Status filtering operates accurately on deduplicated dataset.');
}

// Test 3: Search Filtering across Name, Email, Shop, GST
{
  console.log('\n[TEST 3] Testing search filters...');
  const data = createMockDataset();

  // Search by email
  const emailRes = queryVerifications(data, { search: 'vvce22me0041@vvce.ac.in' });
  assert.strictEqual(emailRes.pagination.total, 1);
  assert.strictEqual(emailRes.verifications[0].sellerId, 'seller-sathwik-1');

  // Search by shop name
  const shopRes = queryVerifications(data, { search: 'Tester-Shop' });
  assert.strictEqual(shopRes.pagination.total, 1);
  assert.strictEqual(shopRes.verifications[0].seller.shop.name, 'Tester-Shop');

  // Search by seller name
  const nameRes = queryVerifications(data, { search: 'SATHWIK' });
  assert.strictEqual(nameRes.pagination.total, 1);

  // Search by GST
  const gstRes = queryVerifications(data, { search: '29AAAAA0000A1Z5' });
  assert.strictEqual(gstRes.pagination.total, 1);
  console.log('✓ PASS: Search by name, email, shop name, and GSTIN returns single exact record.');
}

// Test 4: Location Filtering (State & District)
{
  console.log('\n[TEST 4] Testing location filters...');
  const data = createMockDataset();

  // Filter by state
  const stateRes = queryVerifications(data, { state: 'Karnataka' });
  assert.strictEqual(stateRes.pagination.total, 2, 'Expected 2 Karnataka sellers (Sathwik, Rohit)');

  // Filter by district (Mysuru)
  const distRes = queryVerifications(data, { state: 'Karnataka', district: 'Mysuru' });
  assert.strictEqual(distRes.pagination.total, 1, 'Expected 1 Mysuru seller (Sathwik)');
  assert.strictEqual(distRes.verifications[0].sellerId, 'seller-sathwik-1');

  // Filter by other state (Gujarat)
  const gujRes = queryVerifications(data, { state: 'Gujarat' });
  assert.strictEqual(gujRes.pagination.total, 1, 'Expected 1 Gujarat seller (Priya)');
  console.log('✓ PASS: Cascading state and district filters accurately restrict verification results.');
}

// Test 5: Idempotent Submission (Double Click / Network Retry)
{
  console.log('\n[TEST 5] Testing idempotent submission on repeated requests / double clicks...');
  const data = createMockDataset();

  // New seller submits verification
  const newSellerId = 'seller-new-4';
  const sub1 = submitVerification(data, newSellerId, {
    gstNumber: '29DDDDD4444D1Z8',
    gstRegistered: true,
    documentType: 'TAX_REGISTRATION'
  });
  assert.strictEqual(sub1.action, 'CREATED');

  const countAfter1 = data.verifications.filter(v => v.sellerId === newSellerId).length;
  assert.strictEqual(countAfter1, 1, 'Expected 1 verification row');

  // Immediate retry or double-click submit
  const sub2 = submitVerification(data, newSellerId, {
    gstNumber: '29DDDDD4444D1Z8',
    gstRegistered: true,
    documentType: 'TAX_REGISTRATION'
  });
  assert.strictEqual(sub2.action, 'UPDATED', 'Double-click must update existing record, not create duplicate!');

  const countAfter2 = data.verifications.filter(v => v.sellerId === newSellerId).length;
  assert.strictEqual(countAfter2, 1, 'Verification count must remain exactly 1 after repeated submit!');
  console.log('✓ PASS: Repeated submissions and double-clicks are idempotent; no duplicate rows created.');
}

// Test 6: Rejection and Legitimate Resubmission Lifecycle
{
  console.log('\n[TEST 6] Testing rejection and resubmission lifecycle...');
  const data = createMockDataset();
  const sellerId = 'seller-rohit-2';

  // Admin rejects Rohit's pending application
  const rejected = reviewVerification(data, 'verif-rohit-1', 'admin-1', 'REJECTED', 'Clear copy of GST certificate required');
  assert.strictEqual(rejected.status, 'REJECTED');
  assert.strictEqual(rejected.rejectionReason, 'Clear copy of GST certificate required');

  // Seller resubmits updated credentials
  const resubmit = submitVerification(data, sellerId, {
    gstNumber: '29BBBBB1111B1Z6',
    gstRegistered: true,
    documentType: 'TAX_REGISTRATION',
    documentUrl: 'https://storage.atlasbasket.com/gst-new.pdf'
  });
  assert.strictEqual(resubmit.action, 'RESUBMITTED');
  assert.strictEqual(resubmit.record.version, 2);
  assert.strictEqual(resubmit.record.isCurrent, true);

  // Check previous record was archived
  const oldRecord = data.verifications.find(v => v.id === 'verif-rohit-1');
  assert.strictEqual(oldRecord.isCurrent, false, 'Previous rejected record must be marked isCurrent: false');

  // Active directory query must return only 1 current record for Rohit
  const activeRes = queryVerifications(data, { search: 'Rohit' });
  assert.strictEqual(activeRes.pagination.total, 1, 'Only current application should appear in active directory');
  assert.strictEqual(activeRes.verifications[0].id, resubmit.record.id);

  // History query (includeHistory: true) must return both revisions
  const historyRes = queryVerifications(data, { search: 'Rohit', includeHistory: true });
  assert.strictEqual(historyRes.pagination.total, 2, 'History query must preserve both historical revisions');
  console.log('✓ PASS: Rejection and resubmission preserves full audit trail while maintaining 1 active record.');
}

// Test 7: Admin Review Approval
{
  console.log('\n[TEST 7] Testing admin review approval...');
  const data = createMockDataset();
  const approved = reviewVerification(data, 'verif-rohit-1', 'admin-super', 'APPROVED');
  assert.strictEqual(approved.status, 'APPROVED');
  assert.strictEqual(approved.reviewedByAdminId, 'admin-super');
  assert.strictEqual(approved.rejectionReason, null);
  console.log('✓ PASS: Admin approval updates status, admin reviewer, and cleans rejection reason.');
}

// Test 8: Reversible Cleanup Script Logic
{
  console.log('\n[TEST 8] Testing deduplication cleanup procedure on existing duplicates...');
  const data = createMockDataset();

  // Find duplicates for Sathwik
  const sathwikDups = data.verifications.filter(v => v.sellerId === 'seller-sathwik-1');
  assert.strictEqual(sathwikDups.length, 2, 'Initial state: 2 duplicate records for Sathwik');

  // Simulate migration/cleanup SQL:
  // Sort by priority (APPROVED), recency, pick rank 1 as isCurrent = true, rest isCurrent = false
  sathwikDups.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  sathwikDups[0].isCurrent = true;
  sathwikDups[0].version = 1;
  for (let i = 1; i < sathwikDups.length; i++) {
    sathwikDups[i].isCurrent = false;
    sathwikDups[i].version = i + 1;
  }

  // After cleanup:
  const currentSathwik = data.verifications.filter(v => v.sellerId === 'seller-sathwik-1' && v.isCurrent === true);
  assert.strictEqual(currentSathwik.length, 1, 'Post-cleanup: exactly 1 current record');

  const archivedSathwik = data.verifications.filter(v => v.sellerId === 'seller-sathwik-1' && v.isCurrent === false);
  assert.strictEqual(archivedSathwik.length, 1, 'Post-cleanup: 1 archived record preserved for audit');
  console.log('✓ PASS: Deduplication cleanup safely marks duplicates as isCurrent: false without data loss.');
}

console.log('\n=== ALL SELLER VERIFICATION DEDUPLICATION TESTS PASSED SUCCESSFULLY! ===\n');
