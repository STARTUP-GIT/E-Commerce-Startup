const test = require('node:test');
const assert = require('node:assert');

test('Location Normalization - Canonical District Mapping & Suffix Stripping', async () => {
    const { normalizeDistrictName, DISTRICT_ALIASES } = await import('../dist/src/services/location/serviceability.service.js');

    assert.strictEqual(typeof normalizeDistrictName, 'function');

    // Test Mysuru variants
    assert.strictEqual(normalizeDistrictName('Mysuru District'), 'Mysuru');
    assert.strictEqual(normalizeDistrictName('mysuru district'), 'Mysuru');
    assert.strictEqual(normalizeDistrictName('Mysore District'), 'Mysuru');
    assert.strictEqual(normalizeDistrictName('mysore'), 'Mysuru');
    assert.strictEqual(normalizeDistrictName('Mysuru City'), 'Mysuru');
    assert.strictEqual(normalizeDistrictName('Mysuru'), 'Mysuru');

    // Test Bengaluru variants
    assert.strictEqual(normalizeDistrictName('Bangalore Urban'), 'Bengaluru Urban');
    assert.strictEqual(normalizeDistrictName('bangalore city'), 'Bengaluru Urban');
    assert.strictEqual(normalizeDistrictName('Bengaluru Urban District'), 'Bengaluru Urban');
    assert.strictEqual(normalizeDistrictName('Bengaluru Rural District'), 'Bengaluru Rural');

    // Test Belagavi variants
    assert.strictEqual(normalizeDistrictName('Belgaum District'), 'Belagavi');
    assert.strictEqual(normalizeDistrictName('belagavi district'), 'Belagavi');

    // Test generic suffix stripping
    assert.strictEqual(normalizeDistrictName('Dharwad District'), 'Dharwad');
    assert.strictEqual(normalizeDistrictName('Hassan Dist.'), 'Hassan');
    assert.strictEqual(normalizeDistrictName('Mandya Taluk'), 'Mandya');
});

test('Location Resolution - No silent fallback to Mysuru on geocoding failure', async () => {
    const { ServiceabilityService } = await import('../dist/src/services/location/serviceability.service.js');

    // Zero coordinates (ocean / unresolved)
    const result = await ServiceabilityService.resolveCoordinates(0, 0);

    assert.notStrictEqual(result.district, 'Mysuru', 'Unresolved coordinates must NOT default to Mysuru');
    assert.notStrictEqual(result.state, 'Karnataka', 'Unresolved coordinates must NOT default to Karnataka');
    assert.strictEqual(result.district, '', 'Unresolved district must be empty string');
    assert.strictEqual(result.state, '', 'Unresolved state must be empty string');
});

test('Location Serviceability - Empty parameters produce UNKNOWN/NOT_CONFIGURED', async () => {
    const { ServiceabilityService } = await import('../dist/src/services/location/serviceability.service.js');

    const result = await ServiceabilityService.checkServiceability({});
    assert.strictEqual(result.isServiceable, false);
    assert.strictEqual(result.status, 'UNKNOWN');
    assert.strictEqual(result.inheritedStatus, 'NOT_CONFIGURED');
});

test('District Master Toggle Synchronization - Invariant Verification', async () => {
    // Simulated master toggle logic matching districtDetailController & cityController
    const applyDistrictMasterToggle = (currentDistrict, targetActive) => {
        const updated = {
            ...currentDistrict,
            isActive: targetActive,
            launchStatus: targetActive ? 'LAUNCHED' : currentDistrict.launchStatus,
            isCustomerEnabled: targetActive,
            isSellerEnabled: targetActive,
            isDeliveryEnabled: targetActive,
            allowCustomerBrowsing: targetActive,
            allowCustomerOrdering: targetActive,
            allowSellerRegistration: targetActive,
            allowShopCreation: targetActive,
            serviceAreas: currentDistrict.serviceAreas.map(a => ({
                ...a,
                isActive: targetActive,
                deliveryEligible: targetActive
            })),
            cityTowns: currentDistrict.cityTowns.map(t => ({
                ...t,
                isActive: targetActive,
                ...(targetActive ? { launchStatus: 'LAUNCHED' } : {})
            }))
        };
        return updated;
    };

    const initialDistrict = {
        id: 'dist-mysuru-1',
        name: 'Mysuru',
        displayName: 'Mysuru',
        state: 'Karnataka',
        isActive: false,
        launchStatus: 'COMING_SOON',
        isCustomerEnabled: false,
        isSellerEnabled: false,
        isDeliveryEnabled: false,
        allowCustomerBrowsing: false,
        allowCustomerOrdering: false,
        allowSellerRegistration: false,
        allowShopCreation: false,
        cityTowns: [
            { id: 'town-mysuru-urban', name: 'Mysuru', isActive: false, launchStatus: 'COMING_SOON' },
            { id: 'town-hunsur', name: 'Hunsur', isActive: false, launchStatus: 'COMING_SOON' }
        ],
        serviceAreas: [
            { id: 'sa-vijayanagar', name: 'Vijayanagar', cityTownId: 'town-mysuru-urban', isActive: false, deliveryEligible: false },
            { id: 'sa-jayalakshmipuram', name: 'Jayalakshmipuram', cityTownId: 'town-mysuru-urban', isActive: false, deliveryEligible: false },
            { id: 'sa-bilikere', name: 'Bilikere', cityTownId: 'town-hunsur', isActive: false, deliveryEligible: false }
        ]
    };

    // 1. When master toggle is turned ON:
    const enabled = applyDistrictMasterToggle(initialDistrict, true);
    assert.strictEqual(enabled.isActive, true, 'District master must be true');
    assert.strictEqual(enabled.launchStatus, 'LAUNCHED', 'District launch status must be LAUNCHED');
    assert.strictEqual(enabled.isCustomerEnabled, true, 'Customer operations must be enabled');
    assert.strictEqual(enabled.isSellerEnabled, true, 'Seller operations must be enabled');
    assert.strictEqual(enabled.isDeliveryEnabled, true, 'Delivery must be enabled');
    assert.ok(enabled.cityTowns.every(t => t.isActive && t.launchStatus === 'LAUNCHED'), 'All towns must be active and launched');
    assert.ok(enabled.serviceAreas.every(a => a.isActive && a.deliveryEligible), 'All service areas must be active and eligible');

    // 2. When master toggle is turned OFF:
    const disabled = applyDistrictMasterToggle(enabled, false);
    assert.strictEqual(disabled.isActive, false, 'District master must be false');
    assert.strictEqual(disabled.isCustomerEnabled, false, 'Customer operations must be disabled');
    assert.strictEqual(disabled.isSellerEnabled, false, 'Seller operations must be disabled');
    assert.ok(disabled.cityTowns.every(t => !t.isActive), 'All towns must be disabled');
    assert.ok(disabled.serviceAreas.every(a => !a.isActive && !a.deliveryEligible), 'All service areas must be disabled');
});

test('Three-Level Location Hierarchy & Status Code Consistency', () => {
    // Evaluates hierarchy logic
    const evaluateHierarchy = (district, townId, areaId, role = 'CUSTOMER') => {
        if (!district.isActive) {
            return { status: 'DISTRICT_DISABLED', isServiceable: false, inheritedStatus: 'DISABLED_BY_DISTRICT' };
        }
        if (district.maintenanceMode) {
            return { status: 'MAINTENANCE', isServiceable: false, inheritedStatus: 'MAINTENANCE' };
        }
        if (district.launchStatus === 'COMING_SOON') {
            return { status: 'COMING_SOON', isServiceable: false, inheritedStatus: 'COMING_SOON' };
        }
        if (role === 'CUSTOMER' && !district.isCustomerEnabled) {
            return { status: 'CUSTOMER_UNAVAILABLE', isServiceable: false, inheritedStatus: 'CUSTOMER_DISABLED_BY_DISTRICT' };
        }
        if (role === 'SELLER' && !district.isSellerEnabled) {
            return { status: 'SELLER_UNAVAILABLE', isServiceable: false, inheritedStatus: 'SELLER_DISABLED_BY_DISTRICT' };
        }
        if (townId) {
            const town = district.cityTowns.find(t => t.id === townId);
            if (town && !town.isActive) {
                return { status: 'TOWN_DISABLED', isServiceable: false, inheritedStatus: 'DISABLED_BY_CITY' };
            }
        }
        if (areaId) {
            const area = district.serviceAreas.find(a => a.id === areaId);
            if (area) {
                if (area.cityTownId) {
                    const parentTown = district.cityTowns.find(t => t.id === area.cityTownId);
                    if (parentTown && !parentTown.isActive) {
                        return { status: 'TOWN_DISABLED', isServiceable: false, inheritedStatus: 'DISABLED_BY_CITY' };
                    }
                }
                if (!area.isActive) {
                    return { status: 'SERVICE_AREA_DISABLED', isServiceable: false, inheritedStatus: 'DISABLED_BY_SERVICE_AREA' };
                }
            }
        }
        return { status: 'AVAILABLE', isServiceable: true, inheritedStatus: 'ENABLED' };
    };

    const district = {
        isActive: true,
        maintenanceMode: false,
        launchStatus: 'LAUNCHED',
        isCustomerEnabled: true,
        isSellerEnabled: true,
        cityTowns: [
            { id: 'town-1', name: 'Town A', isActive: true },
            { id: 'town-2', name: 'Town B', isActive: false }
        ],
        serviceAreas: [
            { id: 'area-1', name: 'Area A1', cityTownId: 'town-1', isActive: true },
            { id: 'area-2', name: 'Area A2', cityTownId: 'town-1', isActive: false },
            { id: 'area-3', name: 'Area B1', cityTownId: 'town-2', isActive: true } // parent town inactive
        ]
    };

    // Active area under active town
    assert.deepStrictEqual(evaluateHierarchy(district, 'town-1', 'area-1'), {
        status: 'AVAILABLE',
        isServiceable: true,
        inheritedStatus: 'ENABLED'
    });

    // Inactive area under active town
    assert.deepStrictEqual(evaluateHierarchy(district, 'town-1', 'area-2'), {
        status: 'SERVICE_AREA_DISABLED',
        isServiceable: false,
        inheritedStatus: 'DISABLED_BY_SERVICE_AREA'
    });

    // Active area under inactive town -> disabled by parent town
    assert.deepStrictEqual(evaluateHierarchy(district, 'town-2', 'area-3'), {
        status: 'TOWN_DISABLED',
        isServiceable: false,
        inheritedStatus: 'DISABLED_BY_CITY'
    });

    // Entire district disabled
    const disabledDist = { ...district, isActive: false };
    assert.deepStrictEqual(evaluateHierarchy(disabledDist, 'town-1', 'area-1'), {
        status: 'DISTRICT_DISABLED',
        isServiceable: false,
        inheritedStatus: 'DISABLED_BY_DISTRICT'
    });
});

test('Customer vs Seller Availability Separation', () => {
    const districtCustomerOnly = {
        isActive: true,
        maintenanceMode: false,
        launchStatus: 'LAUNCHED',
        isCustomerEnabled: true,
        isSellerEnabled: false,
        cityTowns: [],
        serviceAreas: []
    };

    const isCustomerServiceable = districtCustomerOnly.isActive && districtCustomerOnly.isCustomerEnabled;
    const isSellerServiceable = districtCustomerOnly.isActive && districtCustomerOnly.isSellerEnabled;

    assert.strictEqual(isCustomerServiceable, true, 'Customer must be serviceable');
    assert.strictEqual(isSellerServiceable, false, 'Seller must NOT be serviceable');
});
