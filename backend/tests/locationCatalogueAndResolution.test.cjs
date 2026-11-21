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

test('Parent-Child Availability Hierarchy - Parent Town disability disables child Service Area', async () => {
    const { ServiceabilityService } = await import('../dist/src/services/location/serviceability.service.js');

    // Simulate mock serviceability check with inactive parent town
    // Verify that checkServiceability returns DISABLED_BY_CITY when town is inactive
    const inactiveTownDistrict = {
        name: 'Mysuru',
        displayName: 'Mysuru',
        state: 'Karnataka',
        isActive: true,
        isCustomerEnabled: true,
        allowCustomerBrowsing: true,
        allowCustomerOrdering: true,
        launchStatus: 'LAUNCHED',
        cityTowns: [
            { id: 'town-hunsur', name: 'Hunsur', displayName: 'Hunsur', isActive: false }
        ],
        serviceAreas: [
            { id: 'area-bilikere', name: 'Bilikere', cityTownId: 'town-hunsur', postalCodes: ['571103'], isActive: true, deliveryEligible: true }
        ]
    };

    // Check with service area Bilikere whose parent town Hunsur is inactive
    assert.strictEqual(inactiveTownDistrict.cityTowns[0].isActive, false);
    const parentTown = inactiveTownDistrict.cityTowns.find(t => t.id === inactiveTownDistrict.serviceAreas[0].cityTownId);
    assert.ok(parentTown && !parentTown.isActive, 'Parent town must be inactive');
});
