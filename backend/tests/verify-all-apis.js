import 'dotenv/config';
import axios from 'axios';
import { prisma } from '../dist/src/config/prisma.js';
import bcrypt from 'bcryptjs';

const CUSTOMER_API = 'http://localhost:3001';
const SELLER_API = 'http://localhost:3002';
const ADMIN_API = 'http://localhost:3003';

function extractCookie(response, cookieName) {
  const cookies = response.headers['set-cookie'];
  if (!cookies) return null;
  for (const cookie of cookies) {
    if (cookie.startsWith(`${cookieName}=`)) {
      return cookie.split(';')[0];
    }
  }
  return null;
}

async function runTests() {
  console.log('=== STARTING COMPREHENSIVE ENDPOINT & API VERIFICATION ===\n');

  let failed = false;
  const testSuffix = Date.now();
  
  const customerEmail = `cust_${testSuffix}@example.com`;
  const customerUsername = `cust_${testSuffix}`;
  const sellerEmail = `sell_${testSuffix}@example.com`;
  const sellerUsername = `sell_${testSuffix}`;
  const adminEmail = `admin_${testSuffix}@example.com`;

  let customerCookie = '';
  let sellerCookie = '';
  let adminCookie = '';

  let shopId = '';
  let productId = '';

  try {
    // ----------------------------------------------------
    // 1. Create a temporary Admin in the database directly
    // ----------------------------------------------------
    console.log('[STEP 1] Creating temporary Super Admin in DB...');
    const hashedAdminPassword = await bcrypt.hash('password123', 10);
    const tempAdmin = await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash: hashedAdminPassword,
        firstName: 'Test',
        lastName: 'Admin',
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        isActive: true,
        authProvider: 'EMAIL'
      }
    });
    console.log(`✓ Temporary Super Admin created: ${tempAdmin.email}`);

    // ----------------------------------------------------
    // 2. Admin Login
    // ----------------------------------------------------
    console.log('[STEP 2] Logging in Admin via API...');
    const adminLoginRes = await axios.post(`${ADMIN_API}/api/admin/auth/login`, {
      email: adminEmail,
      password: 'password123'
    });
    adminCookie = extractCookie(adminLoginRes, 'admin_session');
    if (adminLoginRes.status === 200 && adminCookie) {
      console.log('✓ PASS: Admin login successful');
    } else {
      console.log('✗ FAIL: Admin login failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 3. Get Admin Profile
    // ----------------------------------------------------
    console.log('[STEP 3] Fetching Admin Profile...');
    const adminProfileRes = await axios.get(`${ADMIN_API}/api/admin/profile`, {
      headers: { Cookie: adminCookie }
    });
    if (adminProfileRes.status === 200 && adminProfileRes.data.admin.email === adminEmail) {
      console.log('✓ PASS: Admin Profile retrieved successfully');
    } else {
      console.log('✗ FAIL: Admin Profile check failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 4. Register and Login Customer
    // ----------------------------------------------------
    console.log('[STEP 4] Registering and Logging in Customer...');
    const custRegRes = await axios.post(`${CUSTOMER_API}/users/api/auth/register`, {
      username: customerUsername,
      email: customerEmail,
      password: 'password123',
      firstName: 'John',
      lastName: 'Customer'
    });

    const custLoginRes = await axios.post(`${CUSTOMER_API}/users/api/auth/login`, {
      identifier: customerUsername,
      password: 'password123'
    });
    customerCookie = extractCookie(custLoginRes, 'customer_session');

    if (custRegRes.status === 201 && custLoginRes.status === 200 && customerCookie) {
      console.log('✓ PASS: Customer registered and logged in successfully');
    } else {
      console.log('✗ FAIL: Customer register/login failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 5. Get Customer Profile
    // ----------------------------------------------------
    console.log('[STEP 5] Fetching Customer Profile...');
    const custProfileRes = await axios.get(`${CUSTOMER_API}/users/api/auth/profile`, {
      headers: { Cookie: customerCookie }
    });
    if (custProfileRes.status === 200 && custProfileRes.data.user.email === customerEmail) {
      console.log('✓ PASS: Customer Profile retrieved successfully');
    } else {
      console.log('✗ FAIL: Customer Profile check failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 6. Register and Login Seller
    // ----------------------------------------------------
    console.log('[STEP 6] Registering and Logging in Seller...');
    const sellRegRes = await axios.post(`${SELLER_API}/seller/api/auth/register`, {
      username: sellerUsername,
      email: sellerEmail,
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Seller'
    });

    const sellLoginRes = await axios.post(`${SELLER_API}/seller/api/auth/login`, {
      identifier: sellerUsername,
      password: 'password123'
    });
    sellerCookie = extractCookie(sellLoginRes, 'seller_session');

    if (sellRegRes.status === 201 && sellLoginRes.status === 200 && sellerCookie) {
      console.log('✓ PASS: Seller registered and logged in successfully');
    } else {
      console.log('✗ FAIL: Seller register/login failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 7. Get Seller Profile
    // ----------------------------------------------------
    console.log('[STEP 7] Fetching Seller Profile...');
    const sellProfileRes = await axios.get(`${SELLER_API}/seller/api/profile`, {
      headers: { Cookie: sellerCookie }
    });
    if (sellProfileRes.status === 200 && sellProfileRes.data.seller.email === sellerEmail) {
      console.log('✓ PASS: Seller Profile retrieved successfully');
    } else {
      console.log('✗ FAIL: Seller Profile check failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 8. Create Shop
    // ----------------------------------------------------
    console.log('[STEP 8] Creating Shop for Seller...');
    const shopRes = await axios.post(`${SELLER_API}/seller/api/shop`, {
      shopName: `Test Shop ${testSuffix}`,
      slug: `test-shop-${testSuffix}`,
      description: 'A premium test shop for API verification',
      phone: '9876543210',
      addressLine1: '123 Main Street',
      state: 'Karnataka',
      city: 'Mysuru',
      postalCode: '560001',
      country: 'India',
      gstRegistered: false
    }, {
      headers: { Cookie: sellerCookie }
    });

    if (shopRes.status === 201) {
      shopId = shopRes.data.shop.id;
      console.log(`✓ PASS: Shop created successfully, ID: ${shopId}`);
    } else {
      console.log('✗ FAIL: Shop creation failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 9. Approve Shop via Admin
    // ----------------------------------------------------
    console.log('[STEP 9] Approving Shop via Admin...');
    const approveRes = await axios.patch(`${ADMIN_API}/api/admin/shops/shops/${shopId}/approve`, {}, {
      headers: { Cookie: adminCookie }
    });
    if (approveRes.status === 200 && approveRes.data.shop.status === 'APPROVED') {
      console.log('✓ PASS: Shop approved successfully');
    } else {
      console.log('✗ FAIL: Shop approval failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 10. Image Upload Verification
    // ----------------------------------------------------
    console.log('[STEP 10] Testing Image Upload...');
    const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    const formData = new FormData();
    const mockFile = new Blob([pngBuffer], { type: 'image/png' });
    formData.append('image', mockFile, 'test.png');
    formData.append('folder', 'products');

    const uploadUrlRes = await axios.post(`${SELLER_API}/api/storage/image`, formData, {
      headers: {
        Cookie: sellerCookie,
        'Content-Type': 'multipart/form-data'
      }
    });

    if (uploadUrlRes.status === 200 && uploadUrlRes.data.success) {
      console.log('✓ PASS: Image uploaded successfully to Cloudinary:', uploadUrlRes.data.data.url);
    } else {
      console.log('✗ FAIL: Image upload failed');
      failed = true;
    }

    // ----------------------------------------------------
    // 11. Create Product (using a mock image URL since we got presigned URL access)
    // ----------------------------------------------------
    console.log('[STEP 11] Creating Product for Seller...');
    const productRes = await axios.post(`${SELLER_API}/seller/api/products`, {
      productname: `Premium Product ${testSuffix}`,
      productquantity: 10,
      productprice: 999.99,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    }, {
      headers: { Cookie: sellerCookie }
    });

    if (productRes.status === 201) {
      productId = productRes.data.product.id;
      console.log(`✓ PASS: Product created successfully, ID: ${productId}`);
    } else {
      console.log('✗ FAIL: Product creation failed');
      failed = true;
    }

  } catch (err) {
    console.error('✗ ERROR during verification:', err.response?.data || err.message);
    failed = true;
  } finally {
    // ----------------------------------------------------
    // Cleanup database to leave it pristine using deleteMany
    // ----------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up temporary test data from DB...');
    try {
      if (productId) {
        await prisma.product.deleteMany({ where: { id: productId } });
        console.log(`Deleted test product: ${productId}`);
      }
      if (shopId) {
        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        await prisma.shop.deleteMany({ where: { id: shopId } });
        if (shop && shop.defaultPickupAddressId) {
          await prisma.sellerAddress.deleteMany({ where: { id: shop.defaultPickupAddressId } });
        }
        console.log(`Deleted test shop: ${shopId}`);
      }
      await prisma.admin.deleteMany({ where: { email: adminEmail } });
      console.log(`Deleted temp admin: ${adminEmail}`);

      await prisma.seller.deleteMany({ where: { email: sellerEmail } });
      console.log(`Deleted temp seller: ${sellerEmail}`);

      await prisma.customer.deleteMany({ where: { email: customerEmail } });
      console.log(`Deleted temp customer: ${customerEmail}`);
    } catch (cleanupErr) {
      console.error('Error during database cleanup:', cleanupErr.message);
    }

    await prisma.$disconnect();
  }

  console.log('\n=== VERIFICATION RESULTS ===');
  if (failed) {
    console.log('✗ OVERALL RESULT: FAILED (Some checks did not pass)');
    process.exit(1);
  } else {
    console.log('✓ OVERALL RESULT: ALL CHECKS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runTests();
