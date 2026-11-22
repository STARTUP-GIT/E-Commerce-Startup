const { PrismaClient } = require("@prisma/client");
const assert = require("assert");

async function runTests() {
  console.log("=== RUNNING DELIVERY BRANDING LOCATION SYNCHRONIZATION TESTS ===");

  const prisma = new PrismaClient();

  try {
    // Dynamically import ESM DeliverySettingsService and cache middleware
    const { DeliverySettingsService } = await import(
      "../dist/src/modules/delivery/services/deliverySettings.service.js"
    );
    const { invalidatePublicCache } = await import("../dist/src/middleware/cache.js");

    console.log("[Test 1] Testing DeliverySettingsService.getOperationalDeliveryCoverage()...");
    const coverage = await DeliverySettingsService.getOperationalDeliveryCoverage();
    console.log("Operational coverage result:", {
      primaryActiveCity: coverage.primaryActiveCity,
      totalOperationalDistricts: coverage.totalOperationalDistricts,
      totalOperationalTowns: coverage.totalOperationalTowns,
      totalOperationalServiceAreas: coverage.totalOperationalServiceAreas,
      activeLocationsCount: coverage.activeLocations.length,
      isCoverageOperational: coverage.isCoverageOperational,
      statusMessage: coverage.statusMessage,
    });

    assert(typeof coverage.totalOperationalDistricts === "number", "totalOperationalDistricts must be a number");
    assert(typeof coverage.totalOperationalTowns === "number", "totalOperationalTowns must be a number");
    assert(typeof coverage.totalOperationalServiceAreas === "number", "totalOperationalServiceAreas must be a number");
    assert(Array.isArray(coverage.operationalDistricts), "operationalDistricts must be an array");
    assert(Array.isArray(coverage.activeLocations), "activeLocations must be an array");
    assert(typeof coverage.isCoverageOperational === "boolean", "isCoverageOperational must be a boolean");

    // Check delivery operational invariants:
    // If operational, primaryActiveCity must not be null and must match the first district
    if (coverage.isCoverageOperational) {
      assert(coverage.primaryActiveCity !== null, "primaryActiveCity must not be null when operational");
      const firstDistrictName = coverage.operationalDistricts[0].displayName || coverage.operationalDistricts[0].name;
      assert.strictEqual(coverage.primaryActiveCity, firstDistrictName, "primaryActiveCity must match first operational district");
      assert.strictEqual(coverage.statusMessage, "Database synchronized", "Status message must indicate database synchronized");
    } else {
      assert.strictEqual(coverage.primaryActiveCity, null, "primaryActiveCity must be null when not operational");
      assert.strictEqual(coverage.statusMessage, "No delivery locations are currently operational.", "Status message must indicate non-operational");
    }
    console.log("✓ Test 1 Passed: Operational delivery coverage calculated correctly.");

    console.log("\n[Test 2] Testing getEffectiveSettings() synchronizes with database operational coverage...");
    DeliverySettingsService.invalidateCache();
    const effectiveSettings = await DeliverySettingsService.getEffectiveSettings();

    assert(effectiveSettings.operationalCoverage, "operationalCoverage must be attached to effectiveSettings");
    if (coverage.isCoverageOperational) {
      assert.strictEqual(effectiveSettings.activeCity, coverage.primaryActiveCity, "effectiveSettings.activeCity must equal coverage.primaryActiveCity");
    }
    assert.deepStrictEqual(effectiveSettings.activeCities, coverage.activeLocations, "effectiveSettings.activeCities must match coverage.activeLocations");
    console.log("✓ Test 2 Passed: getEffectiveSettings() reflects authoritative DB locations.");

    console.log("\n[Test 3] Testing updateSettings() strips manually supplied activeCity and activeCities...");
    const updateResult = await DeliverySettingsService.updateSettings(
      "test-admin",
      {
        brandTagline: "Test Fleet " + Date.now(),
        activeCity: "HACKED_MANUAL_CITY",
        activeCities: ["HACKED_CITY_1", "HACKED_CITY_2"],
      },
      "Test manual city bypass rejection"
    );

    // It must NOT have stored HACKED_MANUAL_CITY; it must remain synced with DB coverage
    assert.notStrictEqual(updateResult.activeCity, "HACKED_MANUAL_CITY", "Manual activeCity override must be rejected");
    if (coverage.isCoverageOperational) {
      assert.strictEqual(updateResult.activeCity, coverage.primaryActiveCity, "updateSettings must preserve DB synchronized primaryActiveCity");
    }
    assert.deepStrictEqual(updateResult.activeCities, coverage.activeLocations, "updateSettings must preserve DB synchronized activeCities");
    console.log("✓ Test 3 Passed: Manual city entry is completely ignored and protected against drift.");

    console.log("\n[Test 4] Testing dynamic synchronization when a district has isDeliveryEnabled toggled...");
    // Find or create a test district
    const testState = await prisma.state.findFirst({ where: { isActive: true } }) ||
                      await prisma.state.create({ data: { name: "Karnataka", isActive: true } });

    let testDistrict = await prisma.city.findFirst({ where: { name: "TestDeliveryDistrict" } });
    if (!testDistrict) {
      testDistrict = await prisma.city.create({
        data: {
          name: "TestDeliveryDistrict",
          displayName: "Test Delivery District",
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

    // Also add a test town and service area
    let testTown = await prisma.cityTown.findFirst({ where: { name: "TestTown", districtId: testDistrict.id } });
    if (!testTown) {
      testTown = await prisma.cityTown.create({
        data: {
          districtId: testDistrict.id,
          name: "TestTown",
          displayName: "Test Town",
          isActive: true,
          launchStatus: "LAUNCHED",
          displayOrder: 1,
        },
      });
    }

    let testArea = await prisma.serviceArea.findFirst({ where: { name: "TestArea", districtId: testDistrict.id } });
    if (!testArea) {
      testArea = await prisma.serviceArea.create({
        data: {
          districtId: testDistrict.id,
          cityTownId: testTown.id,
          name: "TestArea",
          isActive: true,
          deliveryEligible: true,
          postalCodes: ["570001"],
        },
      });
    }

    // Now test coverage with active delivery district
    DeliverySettingsService.invalidateCache();
    const activeCoverage = await DeliverySettingsService.getOperationalDeliveryCoverage();
    console.log("Active coverage result with enabled district:", {
      primaryActiveCity: activeCoverage.primaryActiveCity,
      totalOperationalDistricts: activeCoverage.totalOperationalDistricts,
      totalOperationalTowns: activeCoverage.totalOperationalTowns,
      totalOperationalServiceAreas: activeCoverage.totalOperationalServiceAreas,
      activeLocations: activeCoverage.activeLocations,
      isCoverageOperational: activeCoverage.isCoverageOperational,
    });

    assert(activeCoverage.isCoverageOperational === true, "Coverage must be operational");
    assert(activeCoverage.primaryActiveCity === "Test Delivery District", "Primary active city must match test district");
    assert(activeCoverage.activeLocations.includes("Test Delivery District"), "Active locations must include district");
    assert(activeCoverage.activeLocations.includes("Test Town"), "Active locations must include town");
    assert(activeCoverage.activeLocations.includes("TestArea"), "Active locations must include service area");

    // Test that customer-only enablement (isDeliveryEnabled: false) does NOT qualify for delivery
    await prisma.city.update({
      where: { id: testDistrict.id },
      data: { isDeliveryEnabled: false, isCustomerEnabled: true },
    });
    DeliverySettingsService.invalidateCache();
    const disabledCoverage = await DeliverySettingsService.getOperationalDeliveryCoverage();
    assert(
      !disabledCoverage.operationalDistricts.some((d) => d.name === "TestDeliveryDistrict"),
      "District with isDeliveryEnabled: false must NOT be included in operational delivery coverage even if isCustomerEnabled is true"
    );

    // Clean up test records
    await prisma.serviceArea.deleteMany({ where: { districtId: testDistrict.id } });
    await prisma.cityTown.deleteMany({ where: { districtId: testDistrict.id } });
    await prisma.city.deleteMany({ where: { id: testDistrict.id } });

    console.log("✓ Test 4 Passed: Dynamic district toggle and delivery eligibility strictly validated.");

    console.log("\n[Test 5] Testing cache invalidation hook...");
    // Calling invalidatePublicCache should safely execute without error and clear settings cache
    invalidatePublicCache();
    console.log("✓ Test 5 Passed: invalidatePublicCache() executed cleanly.");

    console.log("\n=======================================================");
    console.log("ALL DELIVERY BRANDING SYNCHRONIZATION TESTS PASSED!");
    console.log("=======================================================");
  } finally {
    await prisma.$disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
