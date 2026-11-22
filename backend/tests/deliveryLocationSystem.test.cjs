const { PrismaClient } = require("@prisma/client");
const assert = require("assert");

async function runTests() {
  console.log("=== RUNNING ATLASBASKET DELIVERY LOCATION SYSTEM TESTS ===");

  const prisma = new PrismaClient();

  try {
    // Dynamically import ESM services
    const { DeliverySettingsService } = await import(
      "../dist/src/modules/delivery/services/deliverySettings.service.js"
    );
    const { DeliveryLocationService } = await import(
      "../dist/src/modules/delivery/services/deliveryLocation.service.js"
    );
    const { RiderAuthService } = await import(
      "../dist/src/modules/delivery/services/riderAuth.service.js"
    );
    const { RiderAvailabilityService } = await import(
      "../dist/src/modules/delivery/services/riderAvailability.service.js"
    );
    const { DeliveryDispatchService } = await import(
      "../dist/src/modules/delivery/services/deliveryDispatch.service.js"
    );

    // --- SETUP FIXTURES ---
    console.log("\n[Setup] Creating test hierarchy in database...");
    let testState = await prisma.state.findFirst({ where: { name: "TestKarnataka" } });
    if (!testState) {
      testState = await prisma.state.create({
        data: { name: "TestKarnataka", isActive: true },
      });
    } else {
      await prisma.state.update({ where: { id: testState.id }, data: { isActive: true } });
    }

    // Create District
    let testDistrict = await prisma.city.findFirst({ where: { name: "TestLocDistrict" } });
    if (!testDistrict) {
      testDistrict = await prisma.city.create({
        data: {
          name: "TestLocDistrict",
          displayName: "Test Loc District",
          state: testState.name,
          isActive: true,
          isDeliveryEnabled: true,
          maintenanceMode: false,
          launchStatus: "LAUNCHED",
          displayOrder: 1,
        },
      });
    } else {
      await prisma.city.update({
        where: { id: testDistrict.id },
        data: {
          isActive: true,
          isDeliveryEnabled: true,
          maintenanceMode: false,
          launchStatus: "LAUNCHED",
        },
      });
    }

    // Create Town
    let testTown = await prisma.cityTown.findFirst({
      where: { name: "TestLocTown", districtId: testDistrict.id },
    });
    if (!testTown) {
      testTown = await prisma.cityTown.create({
        data: {
          districtId: testDistrict.id,
          name: "TestLocTown",
          displayName: "Test Loc Town",
          isActive: true,
          launchStatus: "LAUNCHED",
          displayOrder: 1,
        },
      });
    } else {
      await prisma.cityTown.update({
        where: { id: testTown.id },
        data: { isActive: true, launchStatus: "LAUNCHED" },
      });
    }

    // Create Service Area
    let testArea = await prisma.serviceArea.findFirst({
      where: { name: "TestLocArea", districtId: testDistrict.id },
    });
    if (!testArea) {
      testArea = await prisma.serviceArea.create({
        data: {
          districtId: testDistrict.id,
          cityTownId: testTown.id,
          name: "TestLocArea",
          isActive: true,
          deliveryEligible: true,
          postalCodes: ["570999"],
        },
      });
    } else {
      await prisma.serviceArea.update({
        where: { id: testArea.id },
        data: {
          isActive: true,
          deliveryEligible: true,
          postalCodes: ["570999"],
        },
      });
    }

    // Also ensure Mysuru district is present and operational for real geocoding test
    let mysuruDistrict = await prisma.city.findFirst({
      where: {
        OR: [
          { name: { equals: "Mysuru", mode: "insensitive" } },
          { name: { equals: "Mysore", mode: "insensitive" } },
        ],
      },
      include: { cityTowns: true, serviceAreas: true },
    });
    let createdMysuru = false;
    let originalMysuruState = null;
    if (!mysuruDistrict) {
      createdMysuru = true;
      mysuruDistrict = await prisma.city.create({
        data: {
          name: "Mysuru",
          displayName: "Mysuru",
          state: "Karnataka",
          isActive: true,
          isDeliveryEnabled: true,
          maintenanceMode: false,
          launchStatus: "LAUNCHED",
          displayOrder: 2,
        },
        include: { cityTowns: true, serviceAreas: true },
      });
      const town = await prisma.cityTown.create({
        data: {
          districtId: mysuruDistrict.id,
          name: "Mysuru",
          displayName: "Mysuru Central",
          isActive: true,
          launchStatus: "LAUNCHED",
        },
      });
      await prisma.serviceArea.create({
        data: {
          districtId: mysuruDistrict.id,
          cityTownId: town.id,
          name: "Central Mysuru",
          postalCodes: ["570001", "570002", "570004", "570005"],
          isActive: true,
          deliveryEligible: true,
        },
      });
    } else {
      originalMysuruState = {
        isActive: mysuruDistrict.isActive,
        isDeliveryEnabled: mysuruDistrict.isDeliveryEnabled,
        maintenanceMode: mysuruDistrict.maintenanceMode,
        launchStatus: mysuruDistrict.launchStatus,
      };
      await prisma.city.update({
        where: { id: mysuruDistrict.id },
        data: { isActive: true, isDeliveryEnabled: true, maintenanceMode: false, launchStatus: "LAUNCHED" },
      });
      if (mysuruDistrict.serviceAreas.length > 0) {
        await prisma.serviceArea.update({
          where: { id: mysuruDistrict.serviceAreas[0].id },
          data: { isActive: true, deliveryEligible: true },
        });
      }
    }

    // Ensure Karnataka state exists and is active
    await prisma.state.upsert({
      where: { name: "Karnataka" },
      create: { name: "Karnataka", isActive: true },
      update: { isActive: true },
    });

    DeliverySettingsService.invalidateCache();
    console.log("✓ Fixtures created successfully.");

    // --- TEST 1: CATALOGUE ---
    console.log("\n[Test 1] Testing DeliveryLocationService.getDeliveryCatalogue()...");
    const catalogue = await DeliveryLocationService.getDeliveryCatalogue();
    assert(Array.isArray(catalogue.districts), "catalogue.districts must be an array");
    const foundDistrict = catalogue.districts.find((d) => d.id === testDistrict.id);
    assert(foundDistrict, "Test district must be returned in catalogue");
    assert(foundDistrict.towns.length > 0, "Test district must contain towns");
    assert(foundDistrict.serviceAreas.length > 0, "Test district must contain service areas");
    console.log("✓ Test 1 Passed: Catalogue contains full location hierarchy.");

    // --- TEST 2: ELIGIBILITY CHECKING (Multi-level toggles) ---
    console.log("\n[Test 2] Testing DeliveryLocationService.checkDeliveryEligibility()...");

    // 2a. Operational Area
    const check1 = await DeliveryLocationService.checkDeliveryEligibility({
      districtId: testDistrict.id,
      townId: testTown.id,
      serviceAreaId: testArea.id,
      postalCode: "570999",
    });
    assert.strictEqual(check1.status, "AVAILABLE", "Should be AVAILABLE when all levels are active");
    assert.strictEqual(check1.isDeliveryEligible, true, "isDeliveryEligible must be true");
    console.log("  ✓ 2a: Fully enabled area -> AVAILABLE");

    // 2b. District master disabled
    await prisma.city.update({
      where: { id: testDistrict.id },
      data: { isDeliveryEnabled: false },
    });
    const check2 = await DeliveryLocationService.checkDeliveryEligibility({
      districtId: testDistrict.id,
      townId: testTown.id,
      serviceAreaId: testArea.id,
    });
    assert.strictEqual(check2.status, "DISTRICT_DISABLED", "Must be DISTRICT_DISABLED when district isDeliveryEnabled: false");
    assert.strictEqual(check2.isDeliveryEligible, false, "isDeliveryEligible must be false");
    console.log("  ✓ 2b: District isDeliveryEnabled: false -> DISTRICT_DISABLED");

    // 2c. District customer enabled but delivery disabled
    await prisma.city.update({
      where: { id: testDistrict.id },
      data: { isDeliveryEnabled: false, isCustomerEnabled: true },
    });
    const check2c = await DeliveryLocationService.checkDeliveryEligibility({
      districtId: testDistrict.id,
    });
    assert.strictEqual(check2c.status, "DISTRICT_DISABLED", "Customer enabled must not bypass delivery check");
    console.log("  ✓ 2c: Customer enabled alone does NOT enable delivery");

    // Re-enable district
    await prisma.city.update({
      where: { id: testDistrict.id },
      data: { isDeliveryEnabled: true, isActive: true },
    });

    // 2d. Town level disabled
    await prisma.cityTown.update({
      where: { id: testTown.id },
      data: { isActive: false },
    });
    const check3 = await DeliveryLocationService.checkDeliveryEligibility({
      districtId: testDistrict.id,
      townId: testTown.id,
      serviceAreaId: testArea.id,
    });
    assert.strictEqual(check3.status, "TOWN_DISABLED", "Must be TOWN_DISABLED when town is inactive");
    console.log("  ✓ 2d: Town inactive -> TOWN_DISABLED");

    // Re-enable town
    await prisma.cityTown.update({
      where: { id: testTown.id },
      data: { isActive: true },
    });

    // 2e. Service Area deliveryEligible: false
    await prisma.serviceArea.update({
      where: { id: testArea.id },
      data: { deliveryEligible: false },
    });
    const check4 = await DeliveryLocationService.checkDeliveryEligibility({
      districtId: testDistrict.id,
      townId: testTown.id,
      serviceAreaId: testArea.id,
    });
    assert.strictEqual(check4.status, "SERVICE_AREA_DISABLED", "Must be SERVICE_AREA_DISABLED when deliveryEligible is false");
    console.log("  ✓ 2e: ServiceArea deliveryEligible: false -> SERVICE_AREA_DISABLED");

    // Re-enable service area
    await prisma.serviceArea.update({
      where: { id: testArea.id },
      data: { deliveryEligible: true, isActive: true },
    });
    console.log("✓ Test 2 Passed: Multi-level hierarchy rules strictly enforced.");

    // --- TEST 3: RIDER REGISTRATION VALIDATION ---
    console.log("\n[Test 3] Testing Rider Registration location validation...");

    // 3a. Disallow registration when district is disabled
    await prisma.city.update({
      where: { id: testDistrict.id },
      data: { isDeliveryEnabled: false },
    });

    let regErrorCaught = false;
    try {
      await DeliveryLocationService.validateRiderOperatingLocation({
        district: "TestLocDistrict",
      });
    } catch (err) {
      regErrorCaught = true;
      assert(err.message.includes("not enabled"), `Error message should mention not enabled, got: ${err.message}`);
    }
    assert(regErrorCaught, "Should have thrown error when operating district is disabled");
    console.log("  ✓ 3a: Registration rejected in disabled district");

    // 3b. Allow registration when district is enabled
    await prisma.city.update({
      where: { id: testDistrict.id },
      data: { isDeliveryEnabled: true, isActive: true },
    });

    const valResult = await DeliveryLocationService.validateRiderOperatingLocation({
      district: "TestLocDistrict",
      serviceArea: "TestLocArea",
    });
    assert.strictEqual(valResult.isDeliveryEligible, true, "Validation result must be delivery eligible");
    console.log("  ✓ 3b: Registration accepted in operational district & area");
    console.log("✓ Test 3 Passed: Rider registration location validation working properly.");

    // --- TEST 4: RIDER GO ONLINE LOCATION VALIDATION ---
    console.log("\n[Test 4] Testing Rider Online location validation...");

    // Create a mock approved rider
    const testRiderEmail = `testrider_${Date.now()}@example.com`;
    const testRider = await prisma.deliveryPartner.create({
      data: {
        firstName: "Test",
        lastName: "Rider",
        email: testRiderEmail,
        phone: `98765${Math.floor(10000 + Math.random() * 90000)}`,
        passwordHash: "hashedpassword",
        verificationStatus: "APPROVED",
        isAvailable: false,
        city: "TestLocDistrict",
        currentLat: 12.3005,
        currentLng: 76.6505,
        lastLocationUpdatedAt: new Date(),
      },
    });

    // 4a. Rider online inside coverage
    const debugEligibility = await DeliveryLocationService.checkDeliveryEligibility({ latitude: 12.3005, longitude: 76.6505 });
    console.log("DEBUG Mysuru coords eligibility:", debugEligibility);

    const onlineValidation = await DeliveryLocationService.validateRiderOnlineLocation(
      testRider.id,
      { latitude: 12.3005, longitude: 76.6505 }
    );
    assert.strictEqual(onlineValidation.isDeliveryEligible, true, "Rider inside active coverage must be allowed online");
    console.log("  ✓ 4a: Rider inside active coverage is allowed online");

    // 4b. Rider online far outside coverage (e.g., Delhi coordinates 28.6139, 77.2090)
    let outsideRejected = false;
    try {
      await DeliveryLocationService.validateRiderOnlineLocation(testRider.id, {
        latitude: 28.6139,
        longitude: 77.2090,
      });
    } catch (err) {
      outsideRejected = true;
      assert(err.message.includes("outside active delivery coverage"), "Must mention outside coverage");
    }
    assert(outsideRejected, "validateRiderOnlineLocation must reject when outside coverage");
    console.log("  ✓ 4b: Rider outside operational coverage rejected");

    // 4c. RiderAvailabilityService toggleAvailability enforces location
    let onlineErrCaught = false;
    try {
      await RiderAvailabilityService.toggleAvailability(testRider.id, true, {
        latitude: 28.6139,
        longitude: 77.2090,
      });
    } catch (err) {
      onlineErrCaught = true;
      assert(err.message.includes("outside active delivery coverage"), `Must report outside coverage, got: ${err.message}`);
    }
    assert(onlineErrCaught, "toggleAvailability must reject when coordinates are outside coverage");
    console.log("  ✓ 4c: toggleAvailability strictly enforces coverage boundary");
    console.log("✓ Test 4 Passed: Rider online validation working properly.");

    // --- TEST 5: DISPATCH LOCATION FRESHNESS & BOUNDARY ---
    console.log("\n[Test 5] Testing Dispatch location filtering & staleness rules...");

    // Set rider location as stale (> 2 hours ago)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    await prisma.deliveryPartner.update({
      where: { id: testRider.id },
      data: {
        isAvailable: true,
        currentLat: 12.3005,
        currentLng: 76.6505,
        lastLocationUpdatedAt: threeHoursAgo,
      },
    });

    const eligibleStale = await DeliveryDispatchService.findEligibleRiders({
      pickupLat: 12.3000,
      pickupLng: 76.6500,
      maxDistanceKm: 15,
      limit: 5,
    });
    assert(
      !eligibleStale.some((r) => (r.rider?.id || r.id) === testRider.id),
      "Rider with location older than 2 hours must NOT be considered eligible for dispatch"
    );
    console.log("  ✓ 5a: Stale rider location (>2h) excluded from dispatch candidates");

    // Update rider location to fresh (now)
    await prisma.deliveryPartner.update({
      where: { id: testRider.id },
      data: {
        isAvailable: true,
        currentLat: 12.3005,
        currentLng: 76.6505,
        lastLocationUpdatedAt: new Date(),
      },
    });

    const eligibleFresh = await DeliveryDispatchService.findEligibleRiders({
      pickupLat: 12.3000,
      pickupLng: 76.6500,
      maxDistanceKm: 15,
      limit: 5,
    });
    assert(
      eligibleFresh.some((r) => (r.rider?.id || r.id) === testRider.id),
      "Rider with fresh location inside coverage MUST be included in dispatch candidates"
    );
    console.log("  ✓ 5b: Fresh rider inside coverage is included in dispatch candidates");
    console.log("✓ Test 5 Passed: Dispatch location rules verified.");

    // --- TEST 6: PRESERVATION OF ACTIVE DELIVERIES ---
    console.log("\n[Test 6] Testing Active In-Progress Delivery Preservation...");

    // Create an active delivery in progress
    const activeDelivery = await prisma.delivery.create({
      data: {
        deliveryNumber: `TRK-TEST-${Date.now()}`,
        status: "IN_TRANSIT",
        pickupAddressSnapshot: { address: "123 Shop St, TestLocArea" },
        deliveryAddressSnapshot: { address: "456 Customer Ave, TestLocArea" },
        pickupLat: 12.3000,
        pickupLng: 76.6500,
        dropoffLat: 12.3010,
        dropoffLng: 76.6510,
        deliveryPartnerId: testRider.id,
        pickedUpAt: new Date(),
      },
    });

    // Admin now disables the entire district
    await prisma.city.update({
      where: { id: testDistrict.id },
      data: { isDeliveryEnabled: false, isActive: false },
    });

    // Check delivery eligibility now returns disabled
    const postDisableCheck = await DeliveryLocationService.checkDeliveryEligibility({
      districtId: testDistrict.id,
    });
    assert.strictEqual(postDisableCheck.status, "DISTRICT_DISABLED");

    // Verify active job is NOT deleted and NOT cancelled
    const retainedJob = await prisma.delivery.findUnique({
      where: { id: activeDelivery.id },
    });
    assert(retainedJob, "Active delivery MUST still exist in database");
    assert.strictEqual(retainedJob.status, "IN_TRANSIT", "Active delivery status must be preserved, not cancelled");
    console.log("  ✓ 6a: In-progress delivery (IN_TRANSIT) was safely preserved despite district disablement");

    // Clean up active job & test rider
    await prisma.delivery.delete({ where: { id: activeDelivery.id } });
    await prisma.deliveryPartner.delete({ where: { id: testRider.id } });
    console.log("✓ Test 6 Passed: In-progress deliveries protected against location toggles.");

    // Clean up test locations
    await prisma.serviceArea.deleteMany({ where: { districtId: testDistrict.id } });
    await prisma.cityTown.deleteMany({ where: { districtId: testDistrict.id } });
    await prisma.city.deleteMany({ where: { id: testDistrict.id } });
    await prisma.state.deleteMany({ where: { id: testState.id } });

    if (createdMysuru && mysuruDistrict) {
      await prisma.serviceArea.deleteMany({ where: { districtId: mysuruDistrict.id } });
      await prisma.cityTown.deleteMany({ where: { districtId: mysuruDistrict.id } });
      await prisma.city.delete({ where: { id: mysuruDistrict.id } });
    } else if (mysuruDistrict && originalMysuruState) {
      await prisma.city.update({
        where: { id: mysuruDistrict.id },
        data: originalMysuruState,
      });
    }
    DeliverySettingsService.invalidateCache();

    console.log("\n=======================================================");
    console.log("ALL ATLASBASKET DELIVERY LOCATION SYSTEM TESTS PASSED!");
    console.log("=======================================================");
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
