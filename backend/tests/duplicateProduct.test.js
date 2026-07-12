import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import { spawn } from 'child_process';
import assert from 'assert';

const PORT = 4567;
const SELLER_API = `http://localhost:${PORT}`;

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

async function run() {
  console.log('=== STARTING SOFT-DELETE DUPLICATE PRODUCT TEST ===\n');
  
  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL
  });
  
  // 1. Start the seller server in the background
  console.log(`Starting seller server on port ${PORT}...`);
  const serverProcess = spawn('node', ['dist/seller.server.js'], {
    env: { ...process.env, PORT: PORT.toString() }
  });
  
  // Wait a bit for the server to spin up
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const suffix = Date.now();
  const sellerEmail = `test_seller_${suffix}@example.com`;
  const sellerUsername = `test_seller_${suffix}`;
  let sellerCookie = '';
  let shopId = '';
  let firstProductId = '';
  let secondProductId = '';
  
  try {
    // 2. Register Seller
    console.log('Registering seller...');
    const regRes = await axios.post(`${SELLER_API}/seller/api/auth/register`, {
      username: sellerUsername,
      email: sellerEmail,
      password: 'password123',
      firstName: 'Test',
      lastName: 'Seller'
    });
    assert.strictEqual(regRes.status, 201, 'Registration should succeed');
    
    // 3. Login Seller
    console.log('Logging in seller...');
    const loginRes = await axios.post(`${SELLER_API}/seller/api/auth/login`, {
      identifier: sellerUsername,
      password: 'password123'
    });
    assert.strictEqual(loginRes.status, 200, 'Login should succeed');
    sellerCookie = extractCookie(loginRes, 'seller_session');
    assert.ok(sellerCookie, 'Seller session cookie should be present');
    
    // 4. Create Shop via API
    console.log('Creating shop...');
    const shopRes = await axios.post(`${SELLER_API}/seller/api/shop`, {
      shopName: `Test Shop ${suffix}`,
      slug: `test-shop-${suffix}`,
      description: 'Test shop for duplicate product fix verification',
      phone: '9999999999',
      addressLine1: '456 Test Lane',
      state: 'Karnataka',
      city: 'Mysuru',
      postalCode: '560002',
      country: 'India',
      gstRegistered: false
    }, {
      headers: { Cookie: sellerCookie }
    });
    assert.strictEqual(shopRes.status, 201, 'Shop creation should succeed');
    shopId = shopRes.data.shop.id;
    
    // 5. Approve Shop directly in database to bypass Admin approval flow
    console.log('Approving shop directly in database...');
    await prisma.shop.update({
      where: { id: shopId },
      data: { status: 'APPROVED' }
    });
    
    // 6. Create Product with name "Double Bottle"
    console.log('Creating first product "Double Bottle"...');
    const p1Res = await axios.post(`${SELLER_API}/seller/api/products`, {
      productname: 'Double Bottle',
      productquantity: 5,
      productprice: 500,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    }, {
      headers: { Cookie: sellerCookie }
    });
    assert.strictEqual(p1Res.status, 201, 'First product creation should succeed');
    firstProductId = p1Res.data.product.id;
    console.log(`✓ First product created: ID ${firstProductId}`);
    
    // 7. Verify creating duplicate product fails (should return 400 Product already exists)
    console.log('Attempting to create duplicate active product (should fail)...');
    try {
      await axios.post(`${SELLER_API}/seller/api/products`, {
        productname: 'Double Bottle',
        productquantity: 5,
        productprice: 500,
        imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
      }, {
        headers: { Cookie: sellerCookie }
      });
      assert.fail('Duplicate active product creation should have failed');
    } catch (err) {
      assert.strictEqual(err.response?.status, 400, 'Should fail with 400 Bad Request');
      assert.strictEqual(err.response?.data?.message, 'Product already exists', 'Should fail with duplicate message');
      console.log('✓ Duplicate active product creation correctly blocked.');
    }
    
    // 8. Soft-delete the first product
    console.log(`Soft-deleting first product ${firstProductId}...`);
    const delRes = await axios.delete(`${SELLER_API}/seller/api/products/${firstProductId}`, {
      headers: { Cookie: sellerCookie }
    });
    assert.strictEqual(delRes.status, 200, 'Product deletion should succeed');
    
    // Double check it is soft-deleted in DB
    const p1Db = await prisma.product.findUnique({ where: { id: firstProductId } });
    assert.strictEqual(p1Db.isDeleted, true, 'Product should be marked isDeleted: true');
    assert.ok(p1Db.deletedAt, 'Product deletedAt should be set');
    console.log('✓ Product soft-deleted successfully.');
    
    // 9. Try creating product with name "Double Bottle" again (should now succeed!)
    console.log('Creating second product with same name "Double Bottle" after soft-delete (should succeed)...');
    const p2Res = await axios.post(`${SELLER_API}/seller/api/products`, {
      productname: 'Double Bottle',
      productquantity: 12,
      productprice: 550,
      imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
    }, {
      headers: { Cookie: sellerCookie }
    });
    assert.strictEqual(p2Res.status, 201, 'Second product creation should succeed');
    secondProductId = p2Res.data.product.id;
    console.log(`✓ Second product created: ID ${secondProductId}`);
    
  } catch (err) {
    console.error('✗ TEST FAILED:', err.response?.data || err.message || err);
    process.exitCode = 1;
  } finally {
    // 10. Clean up database
    console.log('\nCleaning up database...');
    try {
      if (secondProductId) {
        await prisma.product.deleteMany({ where: { id: secondProductId } });
        console.log(`Deleted second product: ${secondProductId}`);
      }
      if (firstProductId) {
        await prisma.product.deleteMany({ where: { id: firstProductId } });
        console.log(`Deleted first product: ${firstProductId}`);
      }
      if (shopId) {
        const shop = await prisma.shop.findUnique({ where: { id: shopId } });
        await prisma.shop.deleteMany({ where: { id: shopId } });
        if (shop && shop.defaultPickupAddressId) {
          await prisma.sellerAddress.deleteMany({ where: { id: shop.defaultPickupAddressId } });
        }
        console.log(`Deleted test shop: ${shopId}`);
      }
      await prisma.seller.deleteMany({ where: { email: sellerEmail } });
      console.log(`Deleted test seller: ${sellerEmail}`);
    } catch (cleanupErr) {
      console.error('Error during cleanup:', cleanupErr.message);
    }
    
    // 11. Kill server process
    console.log('Stopping seller server...');
    serverProcess.kill('SIGINT');
    await prisma.$disconnect();
  }
}

run().then(() => {
  if (process.exitCode === 1) {
    console.log('\n✗ RESULT: FAILED');
  } else {
    console.log('\n✓ RESULT: SUCCESS. Verification test passed!');
  }
  process.exit();
});
