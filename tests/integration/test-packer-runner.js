/**
 * PACKCHECK AI — REGISTERED PACKERS & INSPECTION INTEGRATION TEST SUITE
 * 
 * Verifies end-to-end integration between:
 * 1. Registered Packers API (GET /api/companies, POST /api/companies)
 * 2. Rule 27 Registration Validation & Deduplication (Conflict 409)
 * 3. Inspection creation with automatic manufacturer/packer linkage
 * 4. 1 Inspection = 1 Audit metric calculation (no inflation)
 * 5. Packer Detail API (GET /api/companies/[id]) with linked inspections, findings, and audit logs
 * 6. Audit Trail logging for PACKER_REGISTERED event
 * 7. 404 Handling for invalid/missing company records
 */

const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function runPackerTests() {
  console.log("============================================================");
  console.log("PACKCHECK AI — REGISTERED PACKERS INTEGRATION TEST SUITE");
  console.log(`Target URL: ${BASE_URL}`);
  console.log("============================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = "") {
    totalTests++;
    if (condition) {
      console.log(`[PASS] Test ${testName}`);
      if (details) console.log(`       ${details}`);
      passedTests++;
    } else {
      console.error(`[FAIL] Test ${testName}`);
      if (details) console.error(`       ${details}`);
      throw new Error(`Assertion failed for: ${testName}`);
    }
  }

  const testSuffix = Date.now().toString().slice(-6);
  const testCompanyName = `Aura Organic Naturals Pvt Ltd ${testSuffix}`;
  const testBrandName = `Aura Pure ${testSuffix}`;
  const testRegNo = `IND-MH-2026-REG${testSuffix}`;
  let registeredPackerId = null;
  let createdInspectionId = null;

  // ------------------------------------------------------------
  // TEST 1: GET /api/companies
  // ------------------------------------------------------------
  console.log("\n--- TEST 1: Fetch Existing Registered Packers ---");
  try {
    const res = await fetch(`${BASE_URL}/api/companies`);
    assert(res.status === 200, "1.1: GET /api/companies returns 200 OK");

    const json = await res.json();
    assert(json.success === true, "1.2: API returns success: true");
    assert(Array.isArray(json.data), "1.3: Data payload is an array");
    assert(json.data.length >= 0, "1.4: Packers list retrieved cleanly", `Found ${json.data.length} registered pre-packers`);

    if (json.data.length > 0) {
      const sample = json.data[0];
      assert(typeof sample.name === "string", "1.5: Packer entity has valid string name");
      assert(typeof sample.totalAudits === "number", "1.6: Packer has numerical totalAudits");
    }
  } catch (err) {
    assert(false, "1.0: GET /api/companies failed", err.message);
  }

  // ------------------------------------------------------------
  // TEST 2: POST /api/companies (Register New Packer)
  // ------------------------------------------------------------
  console.log("\n--- TEST 2: Register New Pre-Packer under Rule 27 ---");
  try {
    const payload = {
      name: testCompanyName,
      brand: testBrandName,
      registrationNumber: testRegNo,
      registeredOffice: "Plot 42, MIDC Industrial Area, Pune, Maharashtra - 411018",
      state: "Maharashtra",
      district: "Pune",
      contactEmail: `compliance@aura-${testSuffix}.in`,
      contactPhone: "+91 20 2712 9900",
      categories: ["Food and Beverages", "Organic Grains"],
      status: "ACTIVE",
    };

    const res = await fetch(`${BASE_URL}/api/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert(res.status === 201, "2.1: POST /api/companies returns 201 Created", `Status: ${res.status}`);
    const json = await res.json();
    assert(json.success === true, "2.2: Register packer returns success: true");
    assert(json.data && json.data.id, "2.3: Returned packer has valid ID", `ID: ${json.data.id}`);
    assert(json.data.name === testCompanyName, "2.4: Packer name matches input");
    assert(json.data.registrationNumber === testRegNo, "2.5: Registration number matches input");
    assert(json.data.totalAudits === 0, "2.6: Initial total audits is 0 (authentic count)");

    registeredPackerId = json.data.id;
  } catch (err) {
    assert(false, "2.0: POST /api/companies failed", err.message);
  }

  // ------------------------------------------------------------
  // TEST 3: Duplicate Registration Prevention (409 Conflict)
  // ------------------------------------------------------------
  console.log("\n--- TEST 3: Prevent Duplicate Registration (Rule 27 Deduplication) ---");
  try {
    // Attempt 3A: Same registration certificate number
    const dupRes = await fetch(`${BASE_URL}/api/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Different Name ${testSuffix}`,
        registrationNumber: testRegNo, // Duplicate certificate
        registeredOffice: "Another Address",
        state: "Maharashtra",
        district: "Pune",
      }),
    });

    assert(dupRes.status === 409, "3.1: Duplicate registration number returns 409 Conflict", `Status: ${dupRes.status}`);
    const dupJson = await dupRes.json();
    assert(dupJson.success === false, "3.2: Duplicate response returns success: false");
    assert(dupJson.error && dupJson.error.code === "DUPLICATE_ENTITY", "3.3: Error code is DUPLICATE_ENTITY");

    // Attempt 3B: Minor name variation (e.g. "Private Limited" vs "Pvt Ltd")
    const nameVariation = testCompanyName.replace("Pvt Ltd", "Private Limited");
    const dupNameRes = await fetch(`${BASE_URL}/api/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameVariation,
        registrationNumber: `IND-MH-2026-DIFF${testSuffix}`,
        registeredOffice: "Plot 42, MIDC Industrial Area, Pune",
        state: "Maharashtra",
        district: "Pune",
      }),
    });

    assert(dupNameRes.status === 409, "3.4: Normalized corporate name variation returns 409 Conflict", `Status: ${dupNameRes.status}`);
  } catch (err) {
    assert(false, "3.0: Deduplication check failed", err.message);
  }

  // ------------------------------------------------------------
  // TEST 4: GET /api/companies/[id] Before Inspection
  // ------------------------------------------------------------
  console.log("\n--- TEST 4: Verify Packer Profile & Zero Audits Initially ---");
  try {
    const res = await fetch(`${BASE_URL}/api/companies/${registeredPackerId}`);
    assert(res.status === 200, "4.1: GET /api/companies/[id] returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "4.2: Response has success: true");
    assert(json.data.packer.id === registeredPackerId, "4.3: Correct packer profile retrieved");
    assert(json.data.packer.totalAudits === 0, "4.4: Profile shows 0 total audits");
    assert(json.data.inspections.length === 0, "4.5: Inspections list is empty");
    
    // Check audit log for registration event
    const regEvent = (json.data.auditLogs || []).find(
      (log) => log.action === "PACKER_REGISTERED"
    );
    assert(Boolean(regEvent), "4.6: Audit trail contains PACKER_REGISTERED event", regEvent?.details);
  } catch (err) {
    assert(false, "4.0: Packer detail query failed", err.message);
  }

  // ------------------------------------------------------------
  // TEST 5: Create Inspection with Manufacturer & Auto-Link
  // ------------------------------------------------------------
  console.log("\n--- TEST 5: Create Statutory Inspection Linked to Pre-Packer ---");
  try {
    const formData = new FormData();
    formData.append("product_type", "Aura 100% Whole Grain Rolled Oats 1kg");
    formData.append("manufacturer_name", testCompanyName);
    formData.append("brand_name", testBrandName);
    formData.append("inspector_id", "da39b5fa-0000-4000-8000-000000000001");

    // Dummy image blob with valid JPEG headers
    const dummyImageBytes = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0xff, 0xd9
    ]);
    const fileBlob = new Blob([dummyImageBytes], { type: "image/jpeg" });
    formData.append("file", fileBlob, "label-test.jpg");

    const res = await fetch(`${BASE_URL}/api/inspections`, {
      method: "POST",
      body: formData,
    });

    assert(res.status === 201, "5.1: POST /api/inspections returns 201 Created", `Status: ${res.status}`);
    const json = await res.json();
    assert(json.success === true, "5.2: Inspection creation returns success: true");
    assert(json.data && json.data.inspection_id, "5.3: Inspection has valid inspection_id", `ID: ${json.data?.inspection_id}`);

    createdInspectionId = json.data.inspection_id;

    // Verify inspection record via GET /api/inspections/${id}
    const inspGet = await fetch(`${BASE_URL}/api/inspections/${createdInspectionId}`);
    const inspJson = await inspGet.json();
    if (!inspJson.data?.company_name) {
      console.log("DEBUG: inspGet status:", inspGet.status, "data:", inspJson.data);
    }
    assert(
      inspJson.data?.company_name === testCompanyName ||
        inspJson.data?.company_id === registeredPackerId ||
        inspJson.data?.commodity?.manufacturerName === testCompanyName,
      "5.4: Inspection successfully linked to registered packer name or ID",
      `company_name: ${inspJson.data?.company_name}, company_id: ${inspJson.data?.company_id}`
    );
  } catch (err) {
    assert(false, "5.0: Create inspection linked to packer failed", err.message);
  }

  // ------------------------------------------------------------
  // TEST 6: Verify Exact "1 Inspection = 1 Audit" Metric
  // ------------------------------------------------------------
  console.log("\n--- TEST 6: Verify 1 Inspection = 1 Audit Sync ---");
  try {
    const res = await fetch(`${BASE_URL}/api/companies/${registeredPackerId}`);
    assert(res.status === 200, "6.1: GET /api/companies/[id] returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "6.2: Response has success: true");
    
    const p = json.data.packer;
    assert(p.totalAudits === 1, "6.3: Exactly 1 Inspection = 1 Audit counted", `totalAudits: ${p.totalAudits}`);
    assert(json.data.inspections.length === 1, "6.4: Inspections array has exactly 1 linked record");
    assert(
      json.data.inspections[0].id === createdInspectionId,
      "6.5: Linked inspection ID matches newly created inspection",
      `Inspection ID: ${json.data.inspections[0].id}`
    );
  } catch (err) {
    assert(false, "6.0: 1 Inspection = 1 Audit check failed", err.message);
  }

  // ------------------------------------------------------------
  // TEST 7: 404 Handling for Missing Company ID
  // ------------------------------------------------------------
  console.log("\n--- TEST 7: 404 Handling for Missing Company ID ---");
  try {
    const res = await fetch(`${BASE_URL}/api/companies/00000000-0000-0000-0000-000000000000`);
    assert(res.status === 404, "7.1: Non-existent packer ID returns 404 Not Found", `Status: ${res.status}`);
    const json = await res.json();
    assert(json.success === false, "7.2: 404 response returns success: false");
    assert(json.error && json.error.code === "NOT_FOUND", "7.3: Error code is NOT_FOUND");
  } catch (err) {
    assert(false, "7.0: 404 test failed", err.message);
  }

  // ------------------------------------------------------------
  // TEST 8: Search Filter Query
  // ------------------------------------------------------------
  console.log("\n--- TEST 8: Verify Search and State Filters ---");
  try {
    const searchUrl = `${BASE_URL}/api/companies?searchQuery=${encodeURIComponent(testBrandName)}&state=Maharashtra`;
    const res = await fetch(searchUrl);
    assert(res.status === 200, "8.1: Filtered query returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "8.2: Filter query returns success: true");
    const matched = json.data.some((c) => c.id === registeredPackerId);
    assert(matched, "8.3: Registered packer correctly found via search query filter", `Query: ${testBrandName}`);
  } catch (err) {
    assert(false, "8.0: Filter test failed", err.message);
  }

  // ------------------------------------------------------------
  // CLEANUP / TEARDOWN: Clean up temporary test packer & inspection link
  // ------------------------------------------------------------
  try {
    const dataDir = path.join(process.cwd(), ".data");
    const packersFile = path.join(dataDir, "registered_packers.json");
    const linksFile = path.join(dataDir, "inspection_companies.json");

    if (fs.existsSync(packersFile) && registeredPackerId) {
      const packers = JSON.parse(fs.readFileSync(packersFile, "utf8"));
      const filtered = packers.filter((p) => p.id !== registeredPackerId && !p.name.includes(testSuffix));
      fs.writeFileSync(packersFile, JSON.stringify(filtered, null, 2), "utf8");
    }

    if (fs.existsSync(linksFile) && createdInspectionId) {
      const links = JSON.parse(fs.readFileSync(linksFile, "utf8"));
      delete links[createdInspectionId];
      fs.writeFileSync(linksFile, JSON.stringify(links, null, 2), "utf8");
    }
  } catch (cleanErr) {
    console.warn("Could not clean up test artifacts:", cleanErr.message);
  }

  // ------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------
  console.log("\n============================================================");
  console.log(`TEST EXECUTION COMPLETE: ${passedTests}/${totalTests} PASSED`);
  console.log("============================================================\n");

  if (passedTests === totalTests) {
    console.log("ALL REGISTERED PACKERS & INSPECTION INTEGRATION TESTS PASSED!");
    process.exit(0);
  } else {
    console.error(`FAILED: ${totalTests - passedTests} tests failed.`);
    process.exit(1);
  }
}

runPackerTests().catch((err) => {
  console.error("FATAL ERROR in test runner:", err);
  process.exit(1);
});
