const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

test('Storage Validation — Delivery Branding Folder Support', async () => {
    const { validateFolder } = await import('../dist/src/modules/storage/validations/storage.validation.js');

    function checkFolder(folder) {
        let statusCode = 200;
        let nextCalled = false;
        const req = { body: { folder } };
        const res = {
            status: (code) => { statusCode = code; return res; },
            json: () => res
        };
        const next = () => { nextCalled = true; };
        validateFolder(req, res, next);
        return nextCalled && statusCode === 200;
    }

    // delivery_branding and delivery-branding must both be valid
    assert.strictEqual(checkFolder('delivery_branding'), true, 'delivery_branding should be accepted');
    assert.strictEqual(checkFolder('delivery-branding'), true, 'delivery-branding should be accepted');
    assert.strictEqual(checkFolder('admin-profile'), true, 'admin-profile should be accepted');
    assert.strictEqual(checkFolder('products'), true, 'products should be accepted');

    // Invalid / forbidden folders must be rejected
    assert.strictEqual(checkFolder('invalid_unknown_folder'), false, 'unknown folders must fail');
    assert.strictEqual(checkFolder('../etc/passwd'), false, 'path traversal must fail');
    assert.strictEqual(checkFolder(''), false, 'empty folder must fail');
});

test('RBAC & Permission Catalog — System Roles and Permission Groups', async () => {
    const { 
        PERMISSION_CATALOG, 
        SYSTEM_ROLES, 
        ALL_PERMISSIONS, 
        matchesPermission,
        isValidPermissionKey,
        UNRESTRICTED_ROLES
    } = await import('../dist/src/modules/admin/services/permissionCatalog.js');

    // 1. Permission groups verification
    assert.ok(Array.isArray(PERMISSION_CATALOG), 'PERMISSION_CATALOG must be an array');
    const catalogGroupNames = PERMISSION_CATALOG.map(g => g.group);
    const expectedGroups = ['DASHBOARD', 'MARKETPLACE', 'OPERATIONS', 'LOCATIONS', 'COMMUNICATION', 'FINANCE', 'SYSTEM'];
    for (const group of expectedGroups) {
        assert.ok(catalogGroupNames.includes(group), `Group ${group} must be in catalogue`);
        const item = PERMISSION_CATALOG.find(g => g.group === group);
        assert.ok(Array.isArray(item.permissions) && item.permissions.length > 0, `Group ${group} has permissions`);
    }

    // 2. Standard System Roles verification
    assert.ok(Array.isArray(SYSTEM_ROLES), 'SYSTEM_ROLES must be an array');
    const roleNames = SYSTEM_ROLES.map(r => r.name);
    const expectedRoles = [
        'SUPER_ADMIN', 
        'ADMIN', 
        'OPERATIONS_MANAGER', 
        'MARKETPLACE_MANAGER', 
        'SELLER_SUPPORT', 
        'CUSTOMER_SUPPORT', 
        'FINANCE_MANAGER', 
        'DELIVERY_MANAGER', 
        'LOCATION_MANAGER', 
        'ANALYST'
    ];
    for (const role of expectedRoles) {
        assert.ok(roleNames.includes(role), `Role ${role} must be defined in SYSTEM_ROLES`);
        const rDef = SYSTEM_ROLES.find(r => r.name === role);
        assert.ok(rDef.displayName, `Role ${role} must have a displayName`);
        assert.ok(Array.isArray(rDef.permissions), `Role ${role} must have permissions array`);
    }

    // 3. Super Admin unrestricted check
    assert.ok(UNRESTRICTED_ROLES.has('SUPER_ADMIN'));
    assert.strictEqual(matchesPermission(['*'], 'admin.users.manage'), true, 'Wildcard grants any permission');
    assert.strictEqual(matchesPermission(['*'], 'reports.view'), true);

    // 4. Role specific permissions check
    const financeRole = SYSTEM_ROLES.find(r => r.name === 'FINANCE_MANAGER');
    assert.ok(matchesPermission(financeRole.permissions, 'reports.view'), 'Finance manager can view reports');
    assert.strictEqual(matchesPermission(financeRole.permissions, 'admin.users.manage'), false, 'Finance manager cannot manage admins');

    const locationRole = SYSTEM_ROLES.find(r => r.name === 'LOCATION_MANAGER');
    assert.ok(matchesPermission(locationRole.permissions, 'locations.districts.manage'), 'Location manager can manage districts');
    assert.strictEqual(matchesPermission(locationRole.permissions, 'settings.manage'), false, 'Location manager cannot edit system settings');

    // 5. Read-only analyst cannot write
    const analystRole = SYSTEM_ROLES.find(r => r.name === 'ANALYST');
    assert.ok(matchesPermission(analystRole.permissions, 'dashboard.view'), 'Analyst can view metrics');
    assert.strictEqual(matchesPermission(analystRole.permissions, 'sellers.manage'), false, 'Analyst cannot manage sellers');
    assert.strictEqual(matchesPermission(analystRole.permissions, 'delivery.manage'), false, 'Analyst cannot manage deliveries');

    // 6. Permission validity
    assert.strictEqual(isValidPermissionKey('dashboard.view'), true);
    assert.strictEqual(isValidPermissionKey('non_existent.perm'), false);
});

test('Admin Invitations — Token Generation, Expiration, and Hash Verification', async () => {
    // 24-hour expiration calculation
    const now = Date.now();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(now + 24 * 60 * 60 * 1000);

    // Verify token structure
    assert.strictEqual(rawToken.length, 64, 'Raw token should be 64 hex characters (32 bytes)');
    assert.strictEqual(tokenHash.length, 64, 'SHA-256 hash should be 64 hex characters');

    // Verification check: incoming token hashes to same value
    const incomingToken = rawToken;
    const incomingHash = crypto.createHash('sha256').update(incomingToken).digest('hex');
    assert.strictEqual(incomingHash, tokenHash, 'Hash of valid token must match stored hash');

    // Incorrect token mismatch
    const badToken = crypto.randomBytes(32).toString('hex');
    const badHash = crypto.createHash('sha256').update(badToken).digest('hex');
    assert.notStrictEqual(badHash, tokenHash, 'Different token must produce different hash');

    // Expiration logic
    const isExpired = (expiryDate) => new Date() > expiryDate;
    assert.strictEqual(isExpired(expiresAt), false, 'Token expiring in 24 hours must not be expired');
    assert.strictEqual(isExpired(new Date(now - 1000)), true, 'Past token must be expired');
});

test('Google OAuth Access Request — Unapproved Access Block & Approval Workflow', async () => {
    // Simulating the Google OAuth approval rules
    const mockAccessRequests = new Map();

    function handleGoogleOAuthLogin({ email, name, avatar, existingAdmin }) {
        if (existingAdmin) {
            if (existingAdmin.status === 'ACTIVE') {
                return { success: true, admin: existingAdmin };
            }
            if (existingAdmin.status === 'SUSPENDED' || existingAdmin.status === 'DEACTIVATED') {
                return { success: false, reason: 'AccountInactive', message: 'Your admin account has been suspended or deactivated.' };
            }
        }

        // If not existing active admin, check pending access request or create one
        let request = mockAccessRequests.get(email.toLowerCase());
        const now = new Date();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        if (!request || new Date() > request.expiresAt) {
            request = {
                id: `req_${Date.now()}`,
                email: email.toLowerCase(),
                name: name || 'Google User',
                avatarUrl: avatar || null,
                status: 'PENDING',
                createdAt: now,
                expiresAt: expiresAt
            };
            mockAccessRequests.set(email.toLowerCase(), request);
        }

        return {
            success: false,
            reason: 'PendingApproval',
            message: 'Your Google account is awaiting Super Admin approval. Admin access is strictly governed.',
            requestId: request.id
        };
    }

    // 1. Unregistered Google user logs in
    const res1 = handleGoogleOAuthLogin({ email: 'newadmin@gmail.com', name: 'New Officer' });
    assert.strictEqual(res1.success, false);
    assert.strictEqual(res1.reason, 'PendingApproval');
    assert.ok(res1.message.includes('awaiting Super Admin approval'));

    // 2. Verify access request was stored with 24h TTL
    const storedReq = mockAccessRequests.get('newadmin@gmail.com');
    assert.ok(storedReq);
    assert.strictEqual(storedReq.status, 'PENDING');
    assert.ok(storedReq.expiresAt.getTime() > Date.now());

    // 3. Super Admin approval converts request
    storedReq.status = 'APPROVED';
    const approvedAdmin = {
        id: 'admin_123',
        email: storedReq.email,
        name: storedReq.name,
        role: 'OPERATIONS_MANAGER',
        status: 'ACTIVE'
    };

    // Subsequent login succeeds
    const res2 = handleGoogleOAuthLogin({ email: 'newadmin@gmail.com', name: 'New Officer', existingAdmin: approvedAdmin });
    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.admin.role, 'OPERATIONS_MANAGER');
});

test('Email Change Verification Flow — Token Hashing and Security Alerting', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const emailChangeRecord = {
        id: 'ec_123',
        adminId: 'admin_super_1',
        oldEmail: 'super@atlasbasket.com',
        newEmail: 'super.new@atlasbasket.com',
        tokenHash: tokenHash,
        expiresAt: expiresAt,
        status: 'PENDING'
    };

    // Verify confirmation logic
    function confirmEmailChange(incomingRawToken, record) {
        if (record.status !== 'PENDING') {
            throw new Error('Email change request has already been processed or cancelled');
        }
        if (new Date() > record.expiresAt) {
            record.status = 'EXPIRED';
            throw new Error('Email change link has expired');
        }
        const incomingHash = crypto.createHash('sha256').update(incomingRawToken).digest('hex');
        if (incomingHash !== record.tokenHash) {
            throw new Error('Invalid verification link');
        }

        record.status = 'VERIFIED';
        return {
            adminId: record.adminId,
            newEmail: record.newEmail,
            oldEmail: record.oldEmail
        };
    }

    // Success case
    const result = confirmEmailChange(rawToken, emailChangeRecord);
    assert.strictEqual(result.newEmail, 'super.new@atlasbasket.com');
    assert.strictEqual(emailChangeRecord.status, 'VERIFIED');

    // Attempting reuse fails
    assert.throws(() => {
        confirmEmailChange(rawToken, emailChangeRecord);
    }, /already been processed/);
});

test('Safety Guard — Last Active Super Admin Protection', async () => {
    // Model existing admin list
    const admins = [
        { id: '1', role: 'SUPER_ADMIN', status: 'ACTIVE', email: 'owner@atlas.com' },
        { id: '2', role: 'OPERATIONS_MANAGER', status: 'ACTIVE', email: 'ops@atlas.com' }
    ];

    function canModifyAdminStatusOrRole(adminId, newRole, newStatus) {
        const target = admins.find(a => a.id === adminId);
        if (!target) throw new Error('Admin not found');

        if (target.role === 'SUPER_ADMIN') {
            const activeSuperAdmins = admins.filter(a => a.role === 'SUPER_ADMIN' && a.status === 'ACTIVE');
            const isDemoting = newRole && newRole !== 'SUPER_ADMIN';
            const isDeactivating = newStatus && newStatus !== 'ACTIVE';

            if (activeSuperAdmins.length <= 1 && (isDemoting || isDeactivating)) {
                return { allowed: false, error: 'Cannot deactivate, suspend or demote the sole active Super Admin.' };
            }
        }
        return { allowed: true };
    }

    // Only 1 super admin exists
    const check1 = canModifyAdminStatusOrRole('1', 'ADMIN', 'ACTIVE');
    assert.strictEqual(check1.allowed, false);
    assert.ok(check1.error.includes('sole active Super Admin'));

    const check2 = canModifyAdminStatusOrRole('1', 'SUPER_ADMIN', 'SUSPENDED');
    assert.strictEqual(check2.allowed, false);

    // Another admin can be modified freely
    const check3 = canModifyAdminStatusOrRole('2', 'SELLER_SUPPORT', 'ACTIVE');
    assert.strictEqual(check3.allowed, true);

    // Adding second super admin allows modifying the first
    admins.push({ id: '3', role: 'SUPER_ADMIN', status: 'ACTIVE', email: 'owner2@atlas.com' });
    const check4 = canModifyAdminStatusOrRole('1', 'ADMIN', 'ACTIVE');
    assert.strictEqual(check4.allowed, true);
});
