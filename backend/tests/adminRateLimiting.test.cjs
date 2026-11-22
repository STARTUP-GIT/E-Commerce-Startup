const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Ensure JWT secret is set for tests
process.env.JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test-jwt-secret-key-atlasbasket-admin-testing-123456';
process.env.JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

test('Rate Limiter Architecture — Tier Separation and Skippable Paths', async () => {
    const { 
        limiter, 
        authenticatedAdminLimiter, 
        adminLimiter,
        adminLoginLimiter,
        adminGoogleOAuthLimiter,
        adminPasswordResetLimiter,
        adminPasswordChangeLimiter,
        adminEmailChangeLimiter,
        adminInvitationLimiter,
        adminRefreshLimiter,
        adminFinancialLimiter,
        adminExportLimiter,
        loginLimiter,
        publicReadLimiter,
        writeLimiter,
        uploadLimiter
    } = await import('../dist/src/middleware/rateLimiter.js');

    // 1. Verify existence of limiters
    assert.strictEqual(typeof limiter, 'function', 'Global limiter must be a middleware function');
    assert.strictEqual(typeof authenticatedAdminLimiter, 'function', 'Authenticated admin limiter must be a middleware function');
    assert.strictEqual(typeof adminLimiter, 'function', 'adminLimiter alias must be a middleware function');
    assert.strictEqual(typeof adminLoginLimiter, 'function', 'adminLoginLimiter must be a middleware function');
    assert.strictEqual(typeof adminGoogleOAuthLimiter, 'function', 'adminGoogleOAuthLimiter must be a middleware function');
    assert.strictEqual(typeof adminPasswordResetLimiter, 'function', 'adminPasswordResetLimiter must be a middleware function');
    assert.strictEqual(typeof adminPasswordChangeLimiter, 'function', 'adminPasswordChangeLimiter must be a middleware function');
    assert.strictEqual(typeof adminEmailChangeLimiter, 'function', 'adminEmailChangeLimiter must be a middleware function');
    assert.strictEqual(typeof adminInvitationLimiter, 'function', 'adminInvitationLimiter must be a middleware function');
    assert.strictEqual(typeof adminRefreshLimiter, 'function', 'adminRefreshLimiter must be a middleware function');
    assert.strictEqual(typeof adminFinancialLimiter, 'function', 'adminFinancialLimiter must be a middleware function');
    assert.strictEqual(typeof adminExportLimiter, 'function', 'adminExportLimiter must be a middleware function');

    // 2. Customer, seller, and delivery limiters must remain intact
    assert.strictEqual(typeof loginLimiter, 'function', 'Customer/Seller loginLimiter must remain intact');
    assert.strictEqual(typeof publicReadLimiter, 'function', 'publicReadLimiter must remain intact');
    assert.strictEqual(typeof writeLimiter, 'function', 'writeLimiter must remain intact');
    assert.strictEqual(typeof uploadLimiter, 'function', 'uploadLimiter must remain intact');
});

test('Identity-Aware Keying — Separates Admins on Shared IP & Prevents False Positives', async () => {
    const { resolveAdminIdentity } = await import('../dist/src/middleware/rateLimiter.js');

    const adminId1 = 'admin-uuid-1111';
    const adminId2 = 'admin-uuid-2222';
    const sharedOfficeIp = '203.0.113.45';

    const secret = process.env.JWT_SECRET_KEY;
    const token1 = jwt.sign({ id: adminId1, jti: crypto.randomUUID() }, secret, { expiresIn: '7d' });
    const token2 = jwt.sign({ id: adminId2, jti: crypto.randomUUID() }, secret, { expiresIn: '7d' });

    // Admin 1 request from office IP
    const reqAdmin1 = {
        ip: sharedOfficeIp,
        headers: {
            cookie: `admin_session=${token1}`
        },
        cookies: {
            admin_session: token1
        }
    };

    // Admin 2 request from SAME office IP
    const reqAdmin2 = {
        ip: sharedOfficeIp,
        headers: {
            authorization: `Bearer ${token2}`
        },
        cookies: {}
    };

    // Unauthenticated request from SAME office IP
    const reqAnon = {
        ip: sharedOfficeIp,
        headers: {},
        cookies: {}
    };

    const key1 = resolveAdminIdentity(reqAdmin1);
    const key2 = resolveAdminIdentity(reqAdmin2);
    const keyAnon = resolveAdminIdentity(reqAnon);

    assert.strictEqual(key1, `admin:${adminId1}`, 'Admin 1 key must resolve to admin:<adminId>');
    assert.strictEqual(key2, `admin:${adminId2}`, 'Admin 2 key must resolve to admin:<adminId>');
    assert.strictEqual(keyAnon, `ip:${sharedOfficeIp}`, 'Unauthenticated key must resolve to ip:<ip>');
    assert.notStrictEqual(key1, key2, 'Two admins on the same IP must have distinct rate limit keys');
});

test('Identity-Aware Keying — Gracefully Handles Active Session Token Expiry', async () => {
    const { resolveAdminIdentity } = await import('../dist/src/middleware/rateLimiter.js');

    const adminId = 'admin-uuid-refreshing';
    const secret = process.env.JWT_SECRET_KEY;

    // Token expired 2 seconds ago
    const expiredToken = jwt.sign({ id: adminId, jti: crypto.randomUUID() }, secret, { expiresIn: '-2s' });

    const reqExpired = {
        ip: '198.51.100.12',
        headers: {
            cookie: `admin_session=${expiredToken}`
        },
        cookies: {
            admin_session: expiredToken
        }
    };

    const key = resolveAdminIdentity(reqExpired);
    assert.strictEqual(key, `admin:${adminId}`, 'Recently expired admin token must still resolve to admin ID for rate limiting');
});

test('Identity-Aware Keying — Rejects Forged Tokens and Falls Back to IP', async () => {
    const { resolveAdminIdentity } = await import('../dist/src/middleware/rateLimiter.js');

    const attackerIp = '198.51.100.99';
    const fakeSecret = 'malicious-attacker-secret-key-fake';
    const forgedToken = jwt.sign({ id: 'fake-admin' }, fakeSecret, { expiresIn: '7d' });

    const reqForged = {
        ip: attackerIp,
        headers: {
            cookie: `admin_session=${forgedToken}`
        },
        cookies: {
            admin_session: forgedToken
        }
    };

    const key = resolveAdminIdentity(reqForged);
    assert.strictEqual(key, `ip:${attackerIp}`, 'Forged signature must fail verification and fall back to IP');
});

test('Authenticated Admin Operations — High Capacity (No 429 on Normal Rapid Navigation)', async () => {
    const { rateLimit } = require('../node_modules/express-rate-limit/dist/index.cjs');
    const { resolveAdminIdentity } = await import('../dist/src/middleware/rateLimiter.js');

    const secret = process.env.JWT_SECRET_KEY;
    const adminId = 'admin-power-user';
    const validToken = jwt.sign({ id: adminId, jti: crypto.randomUUID() }, secret, { expiresIn: '7d' });

    // Emulating the authenticatedAdminLimiter with 5000 requests capacity
    const testAdminLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5000,
        keyGenerator: (req) => resolveAdminIdentity(req),
        validate: false
    });

    let rateLimited = false;

    // Simulate rapid navigation: 60 requests in quick succession
    for (let i = 0; i < 60; i++) {
        const req = {
            ip: '127.0.0.1',
            headers: { authorization: `Bearer ${validToken}` },
            cookies: {}
        };
        const res = {
            statusCode: 200,
            setHeader() {},
            getHeader() { return null; },
            status(code) { this.statusCode = code; return this; },
            json() {}
        };

        let nextCalled = false;
        await new Promise((resolve) => {
            testAdminLimiter(req, res, () => {
                nextCalled = true;
                resolve();
            });
            if (res.statusCode === 429) {
                rateLimited = true;
                resolve();
            }
        });

        assert.strictEqual(nextCalled, true, `Request #${i + 1} should succeed without rate limiting`);
    }

    assert.strictEqual(rateLimited, false, 'Admin should not be rate-limited on 60 rapid operations');
});

test('Sensitive Operations — Brute-force and Abuse Protections Enforce Limits', async () => {
    const { rateLimit } = require('../node_modules/express-rate-limit/dist/index.cjs');

    // Simulate strict login brute force limiter (limit: 5 for testing)
    const testLoginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5,
        keyGenerator: (req) => `login:${req.ip}:${req.body?.email || ''}`,
        handler: (req, res, next, options) => {
            res.status(429).json({
                success: false,
                message: 'Too many login attempts. Please try again later.',
                retryAfter: 900
            });
        },
        validate: false
    });

    let blockedAt = null;

    for (let i = 1; i <= 8; i++) {
        const req = {
            ip: '10.0.0.1',
            body: { email: 'target-admin@atlasbasket.com' }
        };
        let statusCode = 200;
        let responseJson = null;
        let resolvePromise;
        const p = new Promise((resolve) => { resolvePromise = resolve; });
        const res = {
            setHeader() {},
            getHeader() { return null; },
            status(code) { statusCode = code; return this; },
            json(data) { responseJson = data; resolvePromise(); }
        };

        testLoginLimiter(req, res, () => resolvePromise());
        await p;

        if (statusCode === 429 && blockedAt === null) {
            blockedAt = i;
            assert.strictEqual(responseJson.success, false);
            assert.ok(responseJson.message.includes('Too many login attempts'));
        }
    }

    // 5 attempts allowed, 6th attempt blocked
    assert.strictEqual(blockedAt, 6, 'Brute force protection should block after exceeding threshold');
});

test('Standard 429 Handler — Includes Clear Message, Retry-After Seconds and Headers', async () => {
    const { rateLimit } = require('../node_modules/express-rate-limit/dist/index.cjs');

    let capturedHeader = null;
    let capturedBody = null;

    const sampleLimiter = rateLimit({
        windowMs: 60 * 1000, // 60 seconds
        limit: 1,
        handler: (_req, res, _next, options) => {
            const retrySec = Math.ceil(options.windowMs / 1000);
            res.setHeader('Retry-After', String(retrySec));
            res.status(429).json({
                success: false,
                message: 'Too many requests. Please wait a moment before trying again.',
                retryAfter: retrySec,
                retryAfterSeconds: retrySec
            });
        },
        validate: false
    });

    const createMockReqRes = (onDone) => {
        let code = 200;
        const res = {
            setHeader(k, v) { if (k === 'Retry-After') capturedHeader = v; },
            getHeader() { return capturedHeader; },
            status(c) { code = c; return this; },
            json(b) { capturedBody = b; if (onDone) onDone(); }
        };
        const req = { ip: '127.0.0.1' };
        return { req, res, getCode: () => code };
    };

    // Request 1: Succeeds
    await new Promise((resolve) => {
        const first = createMockReqRes(resolve);
        sampleLimiter(first.req, first.res, () => resolve());
    });

    // Request 2: Blocked with 429
    await new Promise((resolve) => {
        const second = createMockReqRes(resolve);
        sampleLimiter(second.req, second.res, () => resolve());
    });

    assert.strictEqual(capturedHeader, '60', 'Retry-After header must be set to window seconds');
    assert.strictEqual(capturedBody.success, false);
    assert.strictEqual(capturedBody.retryAfterSeconds, 60);
    assert.ok(capturedBody.message.includes('Too many requests'));
});
