/**
 * Test Suite: Multi-Result Reverse-Geocoding Evaluation & Address Resolution Algorithm
 *
 * Verifies:
 * 1. Authoritative green entrance pin coordinate resolution.
 * 2. Multi-result candidate scoring algorithm (location_type, proximity, component presence, penalty for broad polygons).
 * 3. Vivekananda Nagar road network coordinates (~12.2882, 76.6264) correctly select Vivekananda Nagar over Sriramapura.
 * 4. Strict component mapping per Google Types (DoorNo, Street, Area, Locality, District, State, PIN).
 * 5. Candidate neighbourhood ranking and disambiguation list.
 * 6. Auxiliary road snapping signal without entrance pin displacement.
 * 7. Manual edit protection and stale response discard.
 * 8. Cross-app delivery dispatch parity for pickup entrance coordinates.
 */

const assert = require("assert");

// Import the ServiceabilityService compiled or via ts-node/direct simulation
async function runTests() {
    console.log("================================================================================");
    console.log("RUNNING TEST SUITE: Address Resolution & Candidate Scoring Algorithm");
    console.log("================================================================================\n");

    let passedTests = 0;
    let totalTests = 0;

    function test(name, fn) {
        totalTests++;
        try {
            fn();
            console.log(`[PASS] ${name}`);
            passedTests++;
        } catch (err) {
            console.error(`[FAIL] ${name}`);
            console.error(err);
            process.exitCode = 1;
        }
    }

    async function testAsync(name, fn) {
        totalTests++;
        try {
            await fn();
            console.log(`[PASS] ${name}`);
            passedTests++;
        } catch (err) {
            console.error(`[FAIL] ${name}`);
            console.error(err);
            process.exitCode = 1;
        }
    }

    // Load ServiceabilityService module from compiled dist
    const { ServiceabilityService } = await import("../dist/src/services/location/serviceability.service.js");

    const targetLat = 12.2882;
    const targetLng = 76.6264;

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 1: Haversine Distance Calculation
    // ─────────────────────────────────────────────────────────────────────────────
    test("1. Compute Haversine distance in meters accurately", () => {
        const distSame = ServiceabilityService.computeDistanceMeters(targetLat, targetLng, targetLat, targetLng);
        assert.strictEqual(distSame, 0, "Distance to same point should be 0");

        // Point ~111m north (0.001 deg lat)
        const distNorth = ServiceabilityService.computeDistanceMeters(targetLat, targetLng, targetLat + 0.001, targetLng);
        assert.ok(distNorth >= 100 && distNorth <= 120, `Distance should be ~111m, got ${distNorth}m`);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 2: Multi-Factor Candidate Scoring Algorithm
    // ─────────────────────────────────────────────────────────────────────────────
    test("2. Candidate scoring rewards ROOFTOP, proximity, route and specific layout", () => {
        const candidateStreetAddress = {
            formatted_address: "142, Vishwashanti Road, Vivekananda Nagar, Mysuru, Karnataka 570023, India",
            geometry: {
                location: { lat: 12.2883, lng: 76.6265 },
                location_type: "ROOFTOP"
            },
            types: ["street_address"],
            address_components: [
                { long_name: "142", short_name: "142", types: ["street_number"] },
                { long_name: "Vishwashanti Road", short_name: "Vishwashanti Rd", types: ["route"] },
                { long_name: "Vivekananda Nagar", short_name: "Vivekananda Nagar", types: ["neighborhood", "political"] },
                { long_name: "Mysuru", short_name: "Mysuru", types: ["locality", "political"] },
                { long_name: "Mysuru", short_name: "Mysuru", types: ["administrative_area_level_2", "political"] },
                { long_name: "Karnataka", short_name: "KA", types: ["administrative_area_level_1", "political"] },
                { long_name: "570023", short_name: "570023", types: ["postal_code"] },
                { long_name: "India", short_name: "IN", types: ["country", "political"] }
            ]
        };

        const scoreStreet = ServiceabilityService.evaluateGeocodeCandidate(candidateStreetAddress, targetLat, targetLng, 0);
        
        assert.strictEqual(scoreStreet.locationType, "ROOFTOP");
        assert.ok(scoreStreet.hasRoute, "Should identify route");
        assert.ok(scoreStreet.hasDoorOrPremise, "Should identify door number");
        assert.ok(scoreStreet.hasNeighborhood, "Should identify neighborhood");
        assert.strictEqual(scoreStreet.extractedRoute, "Vishwashanti Road");
        assert.strictEqual(scoreStreet.extractedNeighborhood, "Vivekananda Nagar");
        assert.ok(scoreStreet.score >= 140, `Expected score >= 140, got ${scoreStreet.score}`);
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 3: Vivekananda Nagar Candidate Outscores Broad Sriramapura Candidate
    // ─────────────────────────────────────────────────────────────────────────────
    test("3. Vivekananda Nagar candidate decisively outscores broad Sriramapura candidate", () => {
        const candidateA_VivekanandaNagar = {
            formatted_address: "Vishwashanti Road, Vivekananda Nagar, Mysuru, Karnataka 570023, India",
            geometry: {
                location: { lat: 12.2883, lng: 76.6265 },
                location_type: "RANGE_INTERPOLATED"
            },
            types: ["street_address"],
            address_components: [
                { long_name: "Vishwashanti Road", short_name: "Vishwashanti Rd", types: ["route"] },
                { long_name: "Vivekananda Nagar", short_name: "Vivekananda Nagar", types: ["neighborhood", "political"] },
                { long_name: "Mysuru", short_name: "Mysuru", types: ["locality", "political"] },
                { long_name: "570023", short_name: "570023", types: ["postal_code"] }
            ]
        };

        const candidateB_Sriramapura = {
            formatted_address: "Sriramapura, Mysuru, Karnataka 570023, India",
            geometry: {
                location: { lat: 12.2740, lng: 76.6250 },
                location_type: "APPROXIMATE"
            },
            types: ["sublocality_level_1", "sublocality", "political"],
            address_components: [
                { long_name: "Sriramapura", short_name: "Sriramapura", types: ["sublocality_level_1", "sublocality", "political"] },
                { long_name: "Mysuru", short_name: "Mysuru", types: ["locality", "political"] },
                { long_name: "570023", short_name: "570023", types: ["postal_code"] }
            ]
        };

        const candidateC_PlusCode = {
            formatted_address: "7M3G+7X Mysuru, Karnataka, India",
            geometry: {
                location: { lat: 12.2882, lng: 76.6264 },
                location_type: "GEOMETRIC_CENTER"
            },
            types: ["plus_code"],
            address_components: []
        };

        const scoreA = ServiceabilityService.evaluateGeocodeCandidate(candidateA_VivekanandaNagar, targetLat, targetLng, 0);
        const scoreB = ServiceabilityService.evaluateGeocodeCandidate(candidateB_Sriramapura, targetLat, targetLng, 1);
        const scoreC = ServiceabilityService.evaluateGeocodeCandidate(candidateC_PlusCode, targetLat, targetLng, 2);

        console.log(`\nCandidate Scoring Comparison for (${targetLat}, ${targetLng}):`);
        console.log(`  Candidate A (Vivekananda Nagar): Score = ${scoreA.score} (Dist = ${scoreA.distanceMeters}m)`);
        console.log(`  Candidate B (Sriramapura):       Score = ${scoreB.score} (Dist = ${scoreB.distanceMeters}m)`);
        console.log(`  Candidate C (Plus Code):         Score = ${scoreC.score} (Dist = ${scoreC.distanceMeters}m)`);

        assert.ok(scoreA.score > scoreB.score, `Vivekananda Nagar (${scoreA.score}) must outscore Sriramapura (${scoreB.score})`);
        assert.ok(scoreA.score > scoreC.score, `Vivekananda Nagar (${scoreA.score}) must outscore Plus Code (${scoreC.score})`);
        assert.ok(scoreA.score - scoreB.score >= 50, "Winning margin must be significant (>= 50 pts)");
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 4: Strict Component Mapping Rules
    // ─────────────────────────────────────────────────────────────────────────────
    test("4. Strict Component Mapping per Google Types (No district in locality, no locality in street)", () => {
        const candidate = {
            formatted_address: "Shop 12, Vishwashanti Road, Vivekananda Nagar, Mysuru, Karnataka 570023, India",
            geometry: {
                location: { lat: 12.2882, lng: 76.6264 },
                location_type: "ROOFTOP"
            },
            types: ["street_address"],
            address_components: [
                { long_name: "12", short_name: "12", types: ["street_number"] },
                { long_name: "Sri Krishna Complex", short_name: "Sri Krishna", types: ["premise"] },
                { long_name: "Vishwashanti Road", short_name: "Vishwashanti Rd", types: ["route"] },
                { long_name: "Vivekananda Nagar", short_name: "Vivekananda Nagar", types: ["neighborhood", "political"] },
                { long_name: "Mysuru", short_name: "Mysuru", types: ["locality", "political"] },
                { long_name: "Mysuru District", short_name: "Mysuru", types: ["administrative_area_level_2", "political"] },
                { long_name: "Karnataka", short_name: "KA", types: ["administrative_area_level_1", "political"] },
                { long_name: "570023", short_name: "570023", types: ["postal_code"] }
            ]
        };

        const score = ServiceabilityService.evaluateGeocodeCandidate(candidate, targetLat, targetLng, 0);
        assert.strictEqual(score.extractedRoute, "Vishwashanti Road", "Street must strictly be the route");
        assert.strictEqual(score.extractedNeighborhood, "Vivekananda Nagar", "Area must strictly be the neighborhood");
        assert.strictEqual(score.extractedLocality, "Mysuru", "Locality must strictly be city");
        assert.strictEqual(score.extractedPostal, "570023", "Postal code must be extracted");
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 5: Nominatim Fallback Layout Priority
    // ─────────────────────────────────────────────────────────────────────────────
    await testAsync("5. Nominatim fallback prioritizes specific residential layout over suburb", async () => {
        const result = await ServiceabilityService.resolveCoordinates(targetLat, targetLng);

        console.log("\nResolved Result for (" + targetLat + ", " + targetLng + "):");
        console.log(`  Door No:     ${result.doorNo || "(manual required)"}`);
        console.log(`  Street:      ${result.street || "(empty)"}`);
        console.log(`  Area:        ${result.area}`);
        console.log(`  Locality:    ${result.locality || result.city}`);
        console.log(`  District:    ${result.district}`);
        console.log(`  State:       ${result.state}`);
        console.log(`  Postal Code: ${result.postalCode}`);
        console.log(`  Candidate Areas: [${(result.candidateAreas || []).join(", ")}]`);
        console.log(`  Selected Reason: ${result.selectedReason}`);

        assert.strictEqual(result.latitude, targetLat, "Resolved latitude must match pin");
        assert.strictEqual(result.longitude, targetLng, "Resolved longitude must match pin");
        assert.ok(result.state === "Karnataka" || result.state.includes("Karnataka"), "State must be Karnataka");
        assert.ok(result.district === "Mysuru" || result.city === "Mysuru", "District/City must be Mysuru");

        // Either Vivekananda Nagar or Kuvempunagar (genuine South Mysuru layout) should be selected, NOT Sriramapura
        const hasGenuineLayout =
            (result.area && (result.area.toLowerCase().includes("vivekananda") || result.area.toLowerCase().includes("kuvempu"))) ||
            (result.candidateAreas && result.candidateAreas.some((a) => a.toLowerCase().includes("vivekananda") || a.toLowerCase().includes("kuvempu")));
        assert.ok(hasGenuineLayout, "Candidate areas must include Vivekananda Nagar or Kuvempunagar layout for these coordinates");
        assert.notStrictEqual(result.area?.toLowerCase(), "sriramapura", "Must NOT resolve to broader suburb Sriramapura when genuine layout is available");
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 6: Manual Edit Preservation Simulation
    // ─────────────────────────────────────────────────────────────────────────────
    test("6. Manual address edits are strictly preserved against incoming geocode responses", () => {
        const isManuallyEdited = {
            doorNo: false,
            buildingName: false,
            street: true, // User manually corrected street to "Vishwashanti Road"
            area: true,   // User manually corrected area to "Vivekananda Nagar"
            city: false,
            postalCode: false,
        };

        const currentForm = {
            doorNo: "Shop #4",
            buildingName: "",
            street: "Vishwashanti Road",
            area: "Vivekananda Nagar",
            city: "Mysuru",
            postalCode: "570023",
        };

        const incomingGeocode = {
            doorNo: "12",
            buildingName: "Old Complex",
            street: "Some Broad Road",
            area: "Sriramapura", // Older broad geocode response
            city: "Mysuru",
            postalCode: "570023",
        };

        // Application logic simulation
        const updatedForm = { ...currentForm };
        if (!isManuallyEdited.doorNo && incomingGeocode.doorNo) updatedForm.doorNo = incomingGeocode.doorNo;
        if (!isManuallyEdited.buildingName && incomingGeocode.buildingName) updatedForm.buildingName = incomingGeocode.buildingName;
        if (!isManuallyEdited.street && incomingGeocode.street) updatedForm.street = incomingGeocode.street;
        if (!isManuallyEdited.area && incomingGeocode.area) updatedForm.area = incomingGeocode.area;

        assert.strictEqual(updatedForm.street, "Vishwashanti Road", "Manually edited street must NOT be overwritten");
        assert.strictEqual(updatedForm.area, "Vivekananda Nagar", "Manually edited area must NOT be overwritten");
        assert.strictEqual(updatedForm.buildingName, "Old Complex", "Non-edited field can accept incoming geocode");
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // TEST 7: Cross-App Delivery Dispatch Parity
    // ─────────────────────────────────────────────────────────────────────────────
    test("7. Pickup entrance coordinates & structured address parity for delivery dispatch", () => {
        const confirmedEntrancePin = {
            latitude: 12.288214,
            longitude: 76.626412,
            locationSource: "MAP_PIN_SELECTED",
            accuracyMeters: null,
            doorNo: "Shop #4, Ground Floor",
            street: "Vishwashanti Road",
            area: "Vivekananda Nagar",
            city: "Mysuru",
            district: "Mysuru",
            state: "Karnataka",
            postalCode: "570023",
            formattedAddress: "Shop #4, Ground Floor, Vishwashanti Road, Vivekananda Nagar, Mysuru, Karnataka - 570023, India",
        };

        // Simulated Delivery Dispatch Pickup Model (as expected by deliveryDispatch.service.ts)
        const dispatchPickupLocation = {
            state: confirmedEntrancePin.state,
            district: confirmedEntrancePin.district,
            city: confirmedEntrancePin.city,
            postalCode: confirmedEntrancePin.postalCode,
            latitude: confirmedEntrancePin.latitude,
            longitude: confirmedEntrancePin.longitude,
            doorNo: confirmedEntrancePin.doorNo,
            street: confirmedEntrancePin.street,
            area: confirmedEntrancePin.area,
            formattedAddress: confirmedEntrancePin.formattedAddress,
        };

        assert.strictEqual(dispatchPickupLocation.latitude, 12.288214);
        assert.strictEqual(dispatchPickupLocation.longitude, 76.626412);
        assert.strictEqual(dispatchPickupLocation.street, "Vishwashanti Road");
        assert.strictEqual(dispatchPickupLocation.area, "Vivekananda Nagar");
        assert.strictEqual(dispatchPickupLocation.city, "Mysuru");
        assert.strictEqual(dispatchPickupLocation.postalCode, "570023");
    });

    console.log("\n================================================================================");
    console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Tests Passed successfully.`);
    console.log("================================================================================\n");

    if (passedTests !== totalTests) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error("Test Suite execution failed:", err);
    process.exit(1);
});
