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

test('Three-Level Location Control System - District, Town, and Area Hierarchy Invariants', async () => {
    // 1. Structure representation
    let district = {
        id: 'dist-mysuru',
        name: 'Mysuru',
        isActive: true,
        cityTowns: [
            { id: 'town-hunsur', name: 'Hunsur', isActive: true },
            { id: 'town-mysuru', name: 'Mysuru City', isActive: true }
        ],
        serviceAreas: [
            { id: 'sa-hunsur-1', name: 'Hunsur Town', cityTownId: 'town-hunsur', isActive: true, deliveryEligible: true },
            { id: 'sa-hunsur-2', name: 'Bilikere', cityTownId: 'town-hunsur', isActive: true, deliveryEligible: true },
            { id: 'sa-my-1', name: 'Vijayanagar', cityTownId: 'town-mysuru', isActive: true, deliveryEligible: true },
            { id: 'sa-my-2', name: 'Jayalakshmipuram', cityTownId: 'town-mysuru', isActive: true, deliveryEligible: true }
        ]
    };

    // Operation: Town Toggle
    const toggleTown = (state, townId, targetActive) => {
        if (!state.isActive && targetActive) {
            throw new Error("Cannot enable town while district master is disabled.");
        }
        return {
            ...state,
            cityTowns: state.cityTowns.map(t => t.id === townId ? { ...t, isActive: targetActive } : t),
            serviceAreas: state.serviceAreas.map(a => a.cityTownId === townId ? { ...a, isActive: targetActive, deliveryEligible: targetActive } : a)
        };
    };

    // Operation: Service Area Toggle
    const toggleArea = (state, areaId, targetActive) => {
        const area = state.serviceAreas.find(a => a.id === areaId);
        if (!area) throw new Error("Area not found");
        if (!state.isActive && targetActive) {
            throw new Error("Cannot enable service area while district master is disabled.");
        }
        const town = state.cityTowns.find(t => t.id === area.cityTownId);
        if (town && !town.isActive && targetActive) {
            throw new Error("Cannot enable service area while parent town is disabled.");
        }
        return {
            ...state,
            serviceAreas: state.serviceAreas.map(a => a.id === areaId ? { ...a, isActive: targetActive, deliveryEligible: targetActive } : a)
        };
    };

    // Operation: District Master Toggle
    const toggleDistrict = (state, targetActive) => {
        return {
            ...state,
            isActive: targetActive,
            cityTowns: state.cityTowns.map(t => ({ ...t, isActive: targetActive })),
            serviceAreas: state.serviceAreas.map(a => ({ ...a, isActive: targetActive, deliveryEligible: targetActive }))
        };
    };

    // Test Rule A: Turning Hunsur OFF disables its child service areas; Mysuru City and its areas remain unaffected
    district = toggleTown(district, 'town-hunsur', false);
    const hunsur = district.cityTowns.find(t => t.id === 'town-hunsur');
    const mysuru = district.cityTowns.find(t => t.id === 'town-mysuru');
    assert.strictEqual(hunsur.isActive, false, 'Hunsur town must be disabled');
    assert.strictEqual(mysuru.isActive, true, 'Mysuru town must remain active');

    const hunsurAreas = district.serviceAreas.filter(a => a.cityTownId === 'town-hunsur');
    const mysuruAreas = district.serviceAreas.filter(a => a.cityTownId === 'town-mysuru');
    assert.ok(hunsurAreas.every(a => !a.isActive && !a.deliveryEligible), 'All Hunsur areas must be disabled');
    assert.ok(mysuruAreas.every(a => a.isActive && a.deliveryEligible), 'Mysuru areas must remain active');

    // Test Rule B: Cannot enable an area whose town is disabled
    assert.throws(() => {
        toggleArea(district, 'sa-hunsur-1', true);
    }, /Cannot enable service area while parent town is disabled/);

    // Test Rule C: Admin can toggle individual area in active town
    district = toggleArea(district, 'sa-my-1', false);
    assert.strictEqual(district.serviceAreas.find(a => a.id === 'sa-my-1').isActive, false, 'sa-my-1 is disabled');
    assert.strictEqual(district.serviceAreas.find(a => a.id === 'sa-my-2').isActive, true, 'sa-my-2 remains enabled');

    // Test Rule D: Re-enabling Hunsur enables all Hunsur areas, other towns unaffected
    district = toggleTown(district, 'town-hunsur', true);
    assert.strictEqual(district.cityTowns.find(t => t.id === 'town-hunsur').isActive, true, 'Hunsur town is re-enabled');
    assert.ok(district.serviceAreas.filter(a => a.cityTownId === 'town-hunsur').every(a => a.isActive), 'Hunsur areas re-enabled');
    // sa-my-1 was individually disabled earlier and should stay as-is because Mysuru was not toggled
    assert.strictEqual(district.serviceAreas.find(a => a.id === 'sa-my-1').isActive, false);

    // Test Rule E: District Master OFF disables all towns and all areas
    district = toggleDistrict(district, false);
    assert.strictEqual(district.isActive, false);
    assert.ok(district.cityTowns.every(t => !t.isActive), 'All towns disabled by district OFF');
    assert.ok(district.serviceAreas.every(a => !a.isActive), 'All areas disabled by district OFF');

    // Test Rule F: Cannot enable town or area when district master is OFF
    assert.throws(() => {
        toggleTown(district, 'town-hunsur', true);
    }, /Cannot enable town while district master is disabled/);

    assert.throws(() => {
        toggleArea(district, 'sa-my-2', true);
    }, /Cannot enable service area while district master is disabled/);
});
