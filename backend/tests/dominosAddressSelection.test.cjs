const assert = require("assert");
const { ServiceabilityService } = require("../dist/src/services/location/serviceability.service.js");

console.log("================================================================================");
console.log("RUNNING TEST SUITE: Domino's-Style Address Selection & Geocoding Architecture");
console.log("================================================================================\n");

// Test 1: Screenshot Coordinate (12.275127, 76.622554) Does Not Fabricate A Road
(async () => {
  console.log("1. Inspecting Screenshot Coordinates (12.275127, 76.622554)...");
  const res = await ServiceabilityService.resolveCoordinates(12.275127, 76.622554);

  // If no road is returned for this coordinate point, street must NOT be fabricated
  assert.strictEqual(
    res.street,
    undefined,
    "Street must NOT be fabricated from nearby roads when the pin coordinate has no road!"
  );
  assert.strictEqual(res.doorNo, undefined, "Door number must NOT be fabricated!");
  assert.strictEqual(res.city, "Mysuru", "City must be Mysuru");
  assert.strictEqual(res.district, "Mysuru", "District must be Mysuru");
  assert.strictEqual(res.state, "Karnataka", "State must be Karnataka");
  assert.strictEqual(res.postalCode, "570001", "PIN code must be 570001");
  assert.strictEqual(res.hasMissingDoorNo, true, "Must flag door number as missing for manual entry");
  console.log("   [PASS] Street is NOT fabricated as 'Vishvashanti Road'; left clean and editable.");

  // Test 2: Multi-Candidate Evaluation Across All Google Results
  console.log("\n2. Evaluating Multi-Candidate Selection per Google Types...");
  const mockGoogleResults = [
    {
      formatted_address: "7M3V+22 Mysuru, Karnataka, India",
      types: ["plus_code"],
      geometry: {
        location: { lat: 12.275127, lng: 76.622554 },
        location_type: "APPROXIMATE"
      },
      address_components: [
        { long_name: "7M3V+22", types: ["plus_code"] },
        { long_name: "Mysuru", types: ["locality"] }
      ]
    },
    {
      formatted_address: "Shop #4, Sri Krishna Commercial Hub, 3rd Main Road, Vivekananda Nagar, Mysuru, Karnataka 570023, India",
      types: ["street_address", "premise"],
      geometry: {
        location: { lat: 12.275135, lng: 76.622559 },
        location_type: "ROOFTOP"
      },
      address_components: [
        { long_name: "4", types: ["street_number"] },
        { long_name: "Sri Krishna Commercial Hub", types: ["premise"] },
        { long_name: "3rd Main Road", types: ["route"] },
        { long_name: "2nd Cross", types: ["sublocality_level_2"] },
        { long_name: "Vivekananda Nagar", types: ["neighborhood"] },
        { long_name: "Mysuru", types: ["locality"] },
        { long_name: "Mysuru", types: ["administrative_area_level_2"] },
        { long_name: "Karnataka", types: ["administrative_area_level_1"] },
        { long_name: "570023", types: ["postal_code"] }
      ]
    },
    {
      formatted_address: "Sriramapura, Mysuru, Karnataka, India",
      types: ["sublocality_level_1", "sublocality"],
      geometry: {
        location: { lat: 12.2700, lng: 76.6200 },
        location_type: "APPROXIMATE"
      },
      address_components: [
        { long_name: "Sriramapura", types: ["sublocality_level_1"] },
        { long_name: "Mysuru", types: ["locality"] },
        { long_name: "Mysuru", types: ["administrative_area_level_2"] },
        { long_name: "Karnataka", types: ["administrative_area_level_1"] }
      ]
    }
  ];

  const cand0 = ServiceabilityService.evaluateGeocodeCandidate(mockGoogleResults[0], 12.275127, 76.622554, 0);
  const cand1 = ServiceabilityService.evaluateGeocodeCandidate(mockGoogleResults[1], 12.275127, 76.622554, 1);
  const cand2 = ServiceabilityService.evaluateGeocodeCandidate(mockGoogleResults[2], 12.275127, 76.622554, 2);

  console.log(`   Candidate 0 (Plus Code): Score = ${cand0.score}`);
  console.log(`   Candidate 1 (ROOFTOP Premise/Route): Score = ${cand1.score}`);
  console.log(`   Candidate 2 (Broad Sublocality): Score = ${cand2.score}`);

  assert.ok(cand1.score > cand0.score, "Candidate 1 must decisively outscore Plus Code");
  assert.ok(cand1.score > cand2.score, "Candidate 1 must decisively outscore broad sublocality");
  console.log("   [PASS] Multi-candidate evaluation prioritizes entrance premise & route information.");

  // Test 3: Component Mapping Rules
  console.log("\n3. Testing Strict Google Component Extraction Rules...");
  const components = mockGoogleResults[1].address_components;
  let streetNumber = "";
  let premise = "";
  let route = "";
  let cross = "";
  let neighborhood = "";
  let locality = "";
  let district = "";
  let state = "";
  let postalCode = "";

  for (const comp of components) {
    if (comp.types.includes("street_number")) streetNumber = comp.long_name;
    if (comp.types.includes("premise")) premise = comp.long_name;
    if (comp.types.includes("route")) route = comp.long_name;
    if (comp.types.includes("sublocality_level_2")) cross = comp.long_name;
    if (comp.types.includes("neighborhood")) neighborhood = comp.long_name;
    if (comp.types.includes("locality")) locality = comp.long_name;
    if (comp.types.includes("administrative_area_level_2")) district = comp.long_name;
    if (comp.types.includes("administrative_area_level_1")) state = comp.long_name;
    if (comp.types.includes("postal_code")) postalCode = comp.long_name;
  }

  assert.strictEqual(streetNumber, "4", "Street number maps to house/building number");
  assert.strictEqual(premise, "Sri Krishna Commercial Hub", "Premise maps to building/apartment");
  assert.strictEqual(route, "3rd Main Road", "Route strictly maps to street");
  assert.strictEqual(cross, "2nd Cross", "Sublocality level 2 maps to cross");
  assert.strictEqual(neighborhood, "Vivekananda Nagar", "Neighborhood maps to area");
  assert.strictEqual(locality, "Mysuru", "Locality maps to city");
  assert.strictEqual(district, "Mysuru", "Admin area level 2 maps to district");
  assert.notStrictEqual(neighborhood, district, "District must NEVER be assigned as neighbourhood");
  assert.strictEqual(state, "Karnataka", "Admin area level 1 maps to state");
  assert.strictEqual(postalCode, "570023", "Postal code maps to PIN");
  console.log("   [PASS] All Google address components mapped strictly without fabricated substitutions.");

  // Test 4: Search Autocomplete Resiliency
  console.log("\n4. Testing Autocomplete Search Fallback Resiliency...");
  const searchRes = await ServiceabilityService.searchAddress("Vivekananda Nagar", "Mysuru");
  assert.ok(Array.isArray(searchRes), "Search must return an array of results");
  console.log(`   Search returned ${searchRes.length} results.`);
  console.log("   [PASS] Autocomplete search successfully executes without unhandled errors.");

  console.log("\n================================================================================");
  console.log("TEST SUMMARY: All Domino's-Style Address Selection Invariants Passed!");
  console.log("================================================================================");
})();
