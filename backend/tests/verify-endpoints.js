import 'dotenv/config';
import axios from 'axios';
import { prisma } from '../dist/src/config/prisma.js';
import bcrypt from 'bcryptjs';
const CUSTOMER_API = 'http://localhost:3001';
const SELLER_API = 'http://localhost:3002';

async function runTests() {
  console.log('=== STARTING AUTOMATED AUTH, USERNAME LOGIN & PASSWORD RESET VERIFICATION ===\n');

  let failed = false;

  const testCustomerEmail = `customer_test_${Date.now()}@example.com`;
  const testCustomerUsername = `cust_user_${Date.now()}`;
  const testSellerEmail = `seller_test_${Date.now()}@example.com`;
  const testSellerUsername = `sell_user_${Date.now()}`;

  // --- TEST 1: Register Customer and Seller with Email & Username ---
  try {
    console.log(`[TEST 1] Registering Customer and Seller...`);
    const custRes = await axios.post(`${CUSTOMER_API}/users/api/auth/register`, {
      username: testCustomerUsername,
      email: testCustomerEmail,
      password: 'password123',
      firstName: 'John',
      lastName: 'Customer'
    });
    
    const sellRes = await axios.post(`${SELLER_API}/seller/api/auth/register`, {
      username: testSellerUsername,
      email: testSellerEmail,
      password: 'password123',
      firstName: 'Jane',
      lastName: 'Seller'
    });

    if (custRes.status === 201 && sellRes.status === 201) {
      console.log('✓ PASS: Customer and Seller registered successfully');
    } else {
      console.log('✗ FAIL: Registration returned bad status');
      failed = true;
    }
  } catch (err) {
    console.error('✗ FAIL: Registration threw error:', err.response?.data || err.message);
    failed = true;
  }

  // --- TEST 2: Customer Login using Username & Password ---
  try {
    console.log(`[TEST 2] Logging in Customer via Username: ${testCustomerUsername}...`);
    const res = await axios.post(`${CUSTOMER_API}/users/api/auth/login`, {
      username: testCustomerUsername,
      password: 'password123'
    });
    
    if (res.status === 200 && res.data.user.email === testCustomerEmail) {
      console.log('✓ PASS: Customer logged in via username');
    } else {
      console.log('✗ FAIL: Username login returned status', res.status);
      failed = true;
    }
  } catch (err) {
    console.error('✗ FAIL: Customer username login threw error:', err.response?.data || err.message);
    failed = true;
  }

  // --- TEST 3: Seller Login using Username & Password ---
  try {
    console.log(`[TEST 3] Logging in Seller via Username: ${testSellerUsername}...`);
    const res = await axios.post(`${SELLER_API}/seller/api/auth/login`, {
      username: testSellerUsername,
      password: 'password123'
    });
    
    if (res.status === 200 && res.data.user.email === testSellerEmail) {
      console.log('✓ PASS: Seller logged in via username');
    } else {
      console.log('✗ FAIL: Seller username login returned status', res.status);
      failed = true;
    }
  } catch (err) {
    console.error('✗ FAIL: Seller username login threw error:', err.response?.data || err.message);
    failed = true;
  }

  // --- TEST 4: Forgot Password Flow for Seller ---
  let resetToken = '';
  try {
    console.log(`[TEST 4] Triggering Forgot Password for Seller email: ${testSellerEmail}...`);
    const forgotRes = await axios.post(`${SELLER_API}/seller/api/auth/forgot-password`, {
      email: testSellerEmail
    });

    if (forgotRes.status === 200) {
      console.log('✓ PASS: Forgot password request created successfully. Locating OTP in DB...');
      
      // Query OTP record from database
      const otpRecord = await prisma.otp.findFirst({
        where: {
          email: testSellerEmail,
          purpose: 'PASSWORD_RESET',
          usedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });

      if (otpRecord) {
        console.log(`✓ PASS: Located OTP record in DB. Overriding codeHash to match OTP: "123456"...`);
        const overrideHash = await bcrypt.hash('123456', 10);
        await prisma.otp.update({
          where: { id: otpRecord.id },
          data: { codeHash: overrideHash }
        });

        console.log(`[TEST 4.1] Verifying OTP code "123456" via API...`);
        const verifyRes = await axios.post(`${SELLER_API}/seller/api/auth/verify-otp`, {
          email: testSellerEmail,
          otp: '123456'
        });

        if (verifyRes.status === 200 && verifyRes.data.resetToken) {
          resetToken = verifyRes.data.resetToken;
          console.log('✓ PASS: OTP verified successfully. Reset token acquired.');
        } else {
          console.log('✗ FAIL: OTP verification failed', verifyRes.data);
          failed = true;
        }
      } else {
        console.log('✗ FAIL: OTP record not found in database');
        failed = true;
      }
    } else {
      console.log('✗ FAIL: Forgot password request returned status', forgotRes.status);
      failed = true;
    }
  } catch (err) {
    console.error('✗ FAIL: Forgot Password Flow threw error:', err.response?.data || err.message);
    failed = true;
  }

  // --- TEST 5: Reset Password for Seller ---
  try {
    if (resetToken) {
      console.log(`[TEST 5] Resetting password with acquired token for new password: "newpassword123"...`);
      const resetRes = await axios.post(`${SELLER_API}/seller/api/auth/reset-password`, {
        resetToken,
        newPassword: 'newpassword123'
      });

      if (resetRes.status === 200) {
        console.log('✓ PASS: Password reset completed successfully.');
        
        console.log(`[TEST 5.1] Trying to log in Seller with NEW password...`);
        const loginRes = await axios.post(`${SELLER_API}/seller/api/auth/login`, {
          email: testSellerEmail,
          password: 'newpassword123'
        });

        if (loginRes.status === 200) {
          console.log('✓ PASS: Logged in Seller successfully using NEW password.');
        } else {
          console.log('✗ FAIL: Failed to log in with new password');
          failed = true;
        }
      } else {
        console.log('✗ FAIL: Reset password request returned status', resetRes.status);
        failed = true;
      }
    } else {
      console.log('✗ FAIL: Skipping password reset test due to missing reset token');
      failed = true;
    }
  } catch (err) {
    console.error('✗ FAIL: Reset Password Flow threw error:', err.response?.data || err.message);
    failed = true;
  }

  // --- TEST 6: Google OAuth Unique Username Generation ---
  try {
    const testGoogleEmail = `google_user_${Date.now()}@example.com`;
    console.log(`[TEST 6] Triggering Customer Google Login for new user email: ${testGoogleEmail}...`);
    const res1 = await axios.post(`${CUSTOMER_API}/users/api/auth/google`, {
      email: testGoogleEmail,
      firstName: 'Google',
      lastName: 'User',
      googleId: `google_${testGoogleEmail.replace(/[@.]/g, '_')}`
    });

    const username1 = res1.data.user.username;
    console.log(`✓ PASS: User created with username: ${username1}`);

    console.log(`[TEST 6.1] Triggering Google login with SAME email prefix on SELLER app...`);
    const testGoogleEmail2 = `google_user_${Date.now()}@example2.com`; // different email, same prefix!
    // Since unique username is checked against both tables, it should generate a unique suffix!
    const res2 = await axios.post(`${SELLER_API}/seller/api/auth/google`, {
      email: testGoogleEmail2, // use same email or same prefix
      firstName: 'Google2',
      lastName: 'User2',
      googleId: `google_${testGoogleEmail2.replace(/[@.]/g, '_')}`
    });

    const username2 = res2.data.user.username;
    console.log(`✓ PASS: Seller created with username: ${username2}`);

    if (username1 !== username2) {
      console.log(`✓ PASS: Collision-free unique usernames generated: "${username1}" and "${username2}"`);
    } else {
      console.log(`✗ FAIL: Colliding usernames generated: "${username1}"`);
      failed = true;
    }
  } catch (err) {
    console.error('✗ FAIL: Google OAuth unique username generation threw error:', err.response?.data || err.message);
    failed = true;
  }

  // Disconnect prisma
  await prisma.$disconnect();

  console.log('\n=== VERIFICATION RESULTS ===');
  if (failed) {
    console.log('✗ OVERALL RESULT: FAILED (Some checks did not pass)');
    process.exit(1);
  } else {
    console.log('✓ OVERALL RESULT: ALL TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runTests();
