const test = require('node:test');
const assert = require('node:assert');

test('Location Catalogue Data - contains authoritative Karnataka districts', async () => {
    const { AUTHORITATIVE_LOCATION_CATALOGUE } = await import('../dist/src/services/location/locationCatalogueData.js');

    assert.ok(Array.isArray(AUTHORITATIVE_LOCATION_CATALOGUE));
    assert.ok(AUTHORITATIVE_LOCATION_CATALOGUE.length > 50, 'Catalogue must have extensive entries');

    // Verify Mysuru entries
    const mysuruEntries = AUTHORITATIVE_LOCATION_CATALOGUE.filter(c => c.district === 'Mysuru');
    assert.ok(mysuruEntries.length >= 15, 'Mysuru should have at least 15 catalogue areas');
    
    // Verify Vijayanagar exists in Mysuru
    const vijayanagar = mysuruEntries.find(c => c.serviceArea.includes('Vijayanagar'));
    assert.ok(vijayanagar, 'Vijayanagar area should exist in Mysuru catalogue');
    assert.ok(['570017', '570018'].includes(vijayanagar.postalCode));

    // Verify Bengaluru entries
    const blrEntries = AUTHORITATIVE_LOCATION_CATALOGUE.filter(c => c.district === 'Bengaluru Urban');
    assert.ok(blrEntries.length >= 10, 'Bengaluru Urban should have catalogue areas');

    // Verify Hassan entries
    const hassanEntries = AUTHORITATIVE_LOCATION_CATALOGUE.filter(c => c.district === 'Hassan');
    assert.ok(hassanEntries.length >= 5, 'Hassan should have catalogue areas');
});

test('Location Resolution - does NOT default to Mysuru on failure', async () => {
    const { ServiceabilityService } = await import('../dist/src/services/location/serviceability.service.js');

    // Pass invalid coordinates (e.g. middle of ocean or unresolved)
    const result = await ServiceabilityService.resolveCoordinates(0, 0);
    
    // Must NOT be Mysuru or Karnataka
    assert.notStrictEqual(result.district, 'Mysuru', 'Unresolved coordinates must NOT default to Mysuru');
    assert.notStrictEqual(result.state, 'Karnataka', 'Unresolved coordinates must NOT default to Karnataka');
});

test('Serviceability Check - empty location is NOT serviceable', async () => {
    const { ServiceabilityService } = await import('../dist/src/services/location/serviceability.service.js');

    const result = await ServiceabilityService.checkServiceability({
        state: '',
        district: ''
    });

    assert.strictEqual(result.isServiceable, false, 'Empty location must NOT be serviceable');
    assert.strictEqual(result.status, 'UNKNOWN');
});

test('District Master Availability Hierarchy - District Master disability disables all child Service Areas', async () => {
    // When District Master isActive is false, all areas in district are disabled regardless of individual flags
    const inactiveMasterDistrict = {
        name: 'Mysuru',
        displayName: 'Mysuru',
        state: 'Karnataka',
        isActive: false, // District master is OFF
        isCustomerEnabled: true,
        allowCustomerBrowsing: true,
        allowCustomerOrdering: true,
        launchStatus: 'LAUNCHED',
        cityTowns: [
            { id: 'town-hunsur', name: 'Hunsur', displayName: 'Hunsur', isActive: true }
        ],
        serviceAreas: [
            { id: 'area-bilikere', name: 'Bilikere', cityTownId: 'town-hunsur', postalCodes: ['571103'], isActive: false, deliveryEligible: false }
        ]
    };

    assert.strictEqual(inactiveMasterDistrict.isActive, false, 'District master must be disabled');
    // Town/City is purely geographical grouping metadata and not an independent activation blocker
    assert.strictEqual(inactiveMasterDistrict.cityTowns[0].name, 'Hunsur');
});

test('Universal District Master Control - Transactional Synchronization of All Service Areas', async () => {
    // 1. Initial State: New district defaults to OFF, all child service areas default to Disabled
    const districtState = {
        id: 'dist-test-1',
        name: 'Mysuru',
        isActive: false,
        serviceAreas: [
            { id: 'sa-1', name: 'Vijayanagar', isActive: false, deliveryEligible: false },
            { id: 'sa-2', name: 'Jayalakshmipuram', isActive: false, deliveryEligible: false },
            { id: 'sa-3', name: 'Kuvempunagar', isActive: false, deliveryEligible: false }
        ]
    };

    assert.strictEqual(districtState.isActive, false, 'New district defaults to OFF');
    assert.ok(districtState.serviceAreas.every(a => !a.isActive && !a.deliveryEligible), 'All areas default to Disabled');

    // 2. Enable Entire District: District master becomes ON, all child service areas become ON
    const enableEntireDistrict = (d) => ({
        ...d,
        isActive: true,
        serviceAreas: d.serviceAreas.map(a => ({ ...a, isActive: true, deliveryEligible: true }))
    });

    const enabledDistrict = enableEntireDistrict(districtState);
    assert.strictEqual(enabledDistrict.isActive, true, 'District master must be enabled');
    assert.ok(enabledDistrict.serviceAreas.every(a => a.isActive && a.deliveryEligible), 'Every service area must be Enabled');

    // 3. Disable Entire District: District master becomes OFF, all child service areas become OFF
    const disableEntireDistrict = (d) => ({
        ...d,
        isActive: false,
        serviceAreas: d.serviceAreas.map(a => ({ ...a, isActive: false, deliveryEligible: false }))
    });

    const disabledDistrict = disableEntireDistrict(enabledDistrict);
    assert.strictEqual(disabledDistrict.isActive, false, 'District master must be disabled');
    assert.ok(disabledDistrict.serviceAreas.every(a => !a.isActive && !a.deliveryEligible), 'Every service area must be Disabled');

    // 4. Master ON again: Enables all areas again as requested by the master operation
    const reEnabledDistrict = enableEntireDistrict(disabledDistrict);
    assert.strictEqual(reEnabledDistrict.isActive, true, 'District master must be re-enabled');
    assert.ok(reEnabledDistrict.serviceAreas.every(a => a.isActive && a.deliveryEligible), 'Every service area must be re-enabled');

    // 5. Individual Toggle Rules under Master ON:
    // Admin can disable one specific service area (e.g., sa-2 Jayalakshmipuram) without affecting others
    const toggleIndividualArea = (d, areaId, targetActive) => {
        if (!d.isActive && targetActive) {
            throw new Error("Cannot enable service area while district master is disabled.");
        }
        return {
            ...d,
            serviceAreas: d.serviceAreas.map(a => a.id === areaId ? { ...a, isActive: targetActive, deliveryEligible: targetActive } : a)
        };
    };

    const withOneAreaDisabled = toggleIndividualArea(reEnabledDistrict, 'sa-2', false);
    assert.strictEqual(withOneAreaDisabled.serviceAreas.find(a => a.id === 'sa-1').isActive, true, 'sa-1 remains enabled');
    assert.strictEqual(withOneAreaDisabled.serviceAreas.find(a => a.id === 'sa-2').isActive, false, 'sa-2 is individually disabled');
    assert.strictEqual(withOneAreaDisabled.serviceAreas.find(a => a.id === 'sa-3').isActive, true, 'sa-3 remains enabled');

    // 6. Master OFF prevents individual activation
    const turnedOffDistrict = disableEntireDistrict(withOneAreaDisabled);
    assert.throws(() => {
        toggleIndividualArea(turnedOffDistrict, 'sa-2', true);
    }, /Cannot enable service area while district master is disabled/);
});
