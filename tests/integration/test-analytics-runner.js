/**
 * PACKCHECK AI — STATUTORY RULE ANALYTICS INTEGRATION TEST SUITE
 * 
 * Verifies:
 * 1. GET /api/analytics/rules live endpoint response structure
 * 2. Strict mathematical integrity:
 *    - totalInspections = compliantCount + nonCompliantCount + pendingReviewCount
 *    - evaluatedInspections = compliantCount + nonCompliantCount
 *    - overall compliance rate formula
 *    - rule-wise passedCount + failedCount = totalEvaluated
 *    - affected inspections <= total findings
 * 3. PCR 2011 Canonical Rules Coverage (Rules 6(1)(a)-(l), Rule 7, Rule 27)
 * 4. Finding details integrity (inspection links, manufacturer, severity, statutory refs)
 * 5. Deduplication on re-evaluation (Manual Review sync without orphaned findings)
 * 6. Cross-service consistency with Inspections API
 */

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function runAnalyticsTests() {
  console.log("============================================================");
  console.log("PACKCHECK AI — RULE ANALYTICS INTEGRATION TEST SUITE");
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

  // ------------------------------------------------------------
  // TEST 1: Fetch Rule Analytics API
  // ------------------------------------------------------------
  console.log("\n--- TEST 1: Fetch Live Rule Analytics ---");
  const res = await fetch(`${BASE_URL}/api/analytics/rules`);
  assert(res.status === 200, "1.1: GET /api/analytics/rules returns 200 OK");

  const json = await res.json();
  assert(json.success === true, "1.2: Response payload has success: true");
  assert(!!json.data, "1.3: Data payload is present");
  assert(!!json.data.overview, "1.4: Overview metrics present");
  assert(Array.isArray(json.data.rules), "1.5: Rules list is an array");

  const { overview, rules } = json.data;

  // ------------------------------------------------------------
  // TEST 2: Mathematical Integrity of Overview Metrics
  // ------------------------------------------------------------
  console.log("\n--- TEST 2: Mathematical Integrity of Overview Metrics ---");
  console.log("Overview state:", overview);

  assert(overview.totalInspections >= 0, "2.1: totalInspections is non-negative");
  
  const sumPartitions = overview.compliantCount + overview.nonCompliantCount + overview.pendingReviewCount;
  assert(
    sumPartitions === overview.totalInspections,
    "2.2: Partitions exactly equal total inspections (compliant + nonCompliant + pending === total)",
    `${overview.compliantCount} + ${overview.nonCompliantCount} + ${overview.pendingReviewCount} = ${sumPartitions} (Expected: ${overview.totalInspections})`
  );

  assert(
    overview.evaluatedInspections === overview.compliantCount + overview.nonCompliantCount,
    "2.3: evaluatedInspections equals compliantCount + nonCompliantCount",
    `${overview.evaluatedInspections} === ${overview.compliantCount + overview.nonCompliantCount}`
  );

  if (overview.evaluatedInspections > 0) {
    const expectedRate = Number(((overview.compliantCount / overview.evaluatedInspections) * 100).toFixed(1));
    const rateDiff = Math.abs(overview.complianceRate - expectedRate);
    assert(
      rateDiff <= 0.2,
      "2.4: Overall compliance rate accurately calculated",
      `Reported: ${overview.complianceRate}%, Expected: ${expectedRate}%`
    );
  }

  assert(
    overview.totalMonitoredRules >= 10,
    "2.5: Monitored rules count reflects statutory scope (>= 10)",
    `Monitored: ${overview.totalMonitoredRules}`
  );

  const sumTotalFindings = rules.reduce((acc, r) => acc + r.totalFindings, 0);
  assert(
    sumTotalFindings === overview.totalFindingsCount,
    "2.6: Total findings count across rules matches overview count",
    `Sum of rule findings: ${sumTotalFindings}, Overview: ${overview.totalFindingsCount}`
  );

  // ------------------------------------------------------------
  // TEST 3: Rule Performance Invariants
  // ------------------------------------------------------------
  console.log("\n--- TEST 3: Rule Performance Invariants ---");
  rules.forEach((rule, idx) => {
    assert(
      rule.totalEvaluated === overview.evaluatedInspections,
      `3.${idx + 1}.a: [${rule.ruleNumber}] evaluated count matches system evaluated count (${rule.totalEvaluated})`
    );

    assert(
      rule.passedCount + rule.failedCount === rule.totalEvaluated,
      `3.${idx + 1}.b: [${rule.ruleNumber}] passedCount + failedCount === totalEvaluated (${rule.passedCount} + ${rule.failedCount} = ${rule.totalEvaluated})`
    );

    assert(
      rule.failedCount <= rule.totalFindings,
      `3.${idx + 1}.c: [${rule.ruleNumber}] affected inspections (${rule.failedCount}) <= total findings (${rule.totalFindings})`
    );

    assert(
      rule.recentFindings.length === rule.totalFindings,
      `3.${idx + 1}.d: [${rule.ruleNumber}] recentFindings array length matches totalFindings (${rule.recentFindings.length})`
    );

    if (rule.totalEvaluated > 0) {
      const sumRates = Math.round((rule.complianceRate + rule.failureRate) * 10) / 10;
      assert(
        sumRates >= 99.8 && sumRates <= 100.2,
        `3.${idx + 1}.e: [${rule.ruleNumber}] complianceRate + failureRate === 100% (${rule.complianceRate}% + ${rule.failureRate}% = ${sumRates}%)`
      );
    }
  });

  // ------------------------------------------------------------
  // TEST 4: Canonical PCR 2011 Statutory Rules Verification
  // ------------------------------------------------------------
  console.log("\n--- TEST 4: Canonical PCR 2011 Coverage ---");
  const requiredCanonicalRules = [
    "rule_6_1_a",
    "rule_6_1_b",
    "rule_6_1_c",
    "rule_6_1_d",
    "rule_6_1_e",
    "rule_6_1_f",
    "rule_6_1_g",
    "rule_6_1_l",
    "rule_7",
    "rule_27"
  ];

  const presentRuleIds = rules.map((r) => r.ruleId);
  requiredCanonicalRules.forEach((canonId) => {
    assert(
      presentRuleIds.includes(canonId),
      `4.1: Canonical rule ${canonId} is present in analytics`,
      `Found rule: ${rules.find((r) => r.ruleId === canonId)?.ruleNumber}`
    );
  });

  // ------------------------------------------------------------
  // TEST 5: Findings Metadata & Statutory Traceability
  // ------------------------------------------------------------
  console.log("\n--- TEST 5: Finding Metadata & Statutory Traceability ---");
  const rulesWithFindings = rules.filter((r) => r.totalFindings > 0);
  console.log(`Found ${rulesWithFindings.length} rules with active findings.`);
  
  rulesWithFindings.forEach((rule) => {
    rule.recentFindings.forEach((finding, fIdx) => {
      assert(!!finding.inspectionId, `5.${rule.ruleId}.${fIdx}: Finding has valid inspectionId (${finding.inspectionId})`);
      assert(finding.inspectionNumber.startsWith("INSP-"), `5.${rule.ruleId}.${fIdx}: Finding has formatted inspectionNumber (${finding.inspectionNumber})`);
      assert(!!finding.productType, `5.${rule.ruleId}.${fIdx}: Finding has productType (${finding.productType})`);
      assert(!!finding.packerName, `5.${rule.ruleId}.${fIdx}: Finding has packerName (${finding.packerName})`);
      assert(!!finding.message, `5.${rule.ruleId}.${fIdx}: Finding has clear message`);
      assert(!!finding.severity, `5.${rule.ruleId}.${fIdx}: Finding has severity (${finding.severity})`);
    });
  });

  // ------------------------------------------------------------
  // TEST 6: Deduplication on Re-evaluation (Manual Review Sync)
  // ------------------------------------------------------------
  console.log("\n--- TEST 6: Deduplication on Compliance Re-evaluation ---");
  // 1. Create a temporary inspection via Supabase
  const { createClient } = require("@supabase/supabase-js");
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(process.cwd(), ".env.local");
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) url = trimmed.split("=")[1].trim();
      if (trimmed.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) key = trimmed.split("=")[1].trim();
      if (!key && trimmed.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) key = trimmed.split("=")[1].trim();
    }
  }
  const supabase = createClient(url, key);

  const { data: testInsp, error: inspInsertErr } = await supabase
    .from("inspections")
    .insert({
      product_type: "Test Organic Wheat Flour",
      inspector_id: "da39b5fa-0000-4000-8000-000000000001",
      status: "PENDING"
    })
    .select()
    .single();

  assert(!inspInsertErr && !!testInsp?.id, "6.1: Temporary inspection created for re-eval test", `ID: ${testInsp?.id}`);
  const testInspId = testInsp.id;

  try {
    // 2. Post initial compliance findings (2 findings)
    const initialRunRes = await fetch(`${BASE_URL}/api/inspections/${testInspId}/compliance-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "FAIL",
        findings: [
          {
            rule_id: "rule_6_1_a",
            rule_name: "Manufacturer Identity",
            violation_type: "MISSING",
            severity: "HIGH",
            message: "Initial missing manufacturer address"
          },
          {
            rule_id: "rule_6_1_c",
            rule_name: "Net Quantity",
            violation_type: "FORMAT",
            severity: "HIGH",
            message: "Initial net quantity symbol format error"
          }
        ]
      })
    });
    assert(initialRunRes.status === 200, "6.2: Initial compliance results saved");

    // 3. Post updated compliance findings (e.g. Officer verified manufacturer, leaving only 1 finding)
    const reEvalRunRes = await fetch(`${BASE_URL}/api/inspections/${testInspId}/compliance-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "FAIL",
        findings: [
          {
            rule_id: "rule_6_1_c",
            rule_name: "Net Quantity",
            violation_type: "FORMAT",
            severity: "HIGH",
            message: "Updated net quantity finding"
          }
        ]
      })
    });
    assert(reEvalRunRes.status === 200, "6.3: Re-evaluation compliance results saved");

    // 4. Verify analytics: the test inspection should have exactly 1 finding for rule_6_1_c and 0 for rule_6_1_a
    const verifyAnalyticsRes = await fetch(`${BASE_URL}/api/analytics/rules`);
    const verifyJson = await verifyAnalyticsRes.json();
    const verifiedRules = verifyJson.data.rules;

    const verifiedRuleA = verifiedRules.find((r) => r.ruleId === "rule_6_1_a");
    const testFindingsInA = (verifiedRuleA?.recentFindings || []).filter((f) => f.inspectionId === testInspId);
    assert(
      testFindingsInA.length === 0,
      "6.4: Prior rule_6_1_a finding was cleanly deleted upon re-evaluation (not orphaned)",
      `Found ${testFindingsInA.length} findings for test inspection in rule_6_1_a`
    );

    const verifiedRuleC = verifiedRules.find((r) => r.ruleId === "rule_6_1_c");
    const testFindingsInC = (verifiedRuleC?.recentFindings || []).filter((f) => f.inspectionId === testInspId);
    assert(
      testFindingsInC.length === 1,
      "6.5: Updated rule_6_1_c finding is present exactly once (no duplicates)",
      `Found ${testFindingsInC.length} findings for test inspection in rule_6_1_c`
    );

    // 5. Post third re-evaluation with 100% PASS (0 findings)
    const passRunRes = await fetch(`${BASE_URL}/api/inspections/${testInspId}/compliance-results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "PASS",
        findings: []
      })
    });
    assert(passRunRes.status === 200, "6.6: Compliant outcome with 0 findings saved");

    const finalVerifyRes = await fetch(`${BASE_URL}/api/analytics/rules`);
    const finalVerifyJson = await finalVerifyRes.json();
    const finalRules = finalVerifyJson.data.rules;
    const finalRuleC = finalRules.find((r) => r.ruleId === "rule_6_1_c");
    const finalFindingsInC = (finalRuleC?.recentFindings || []).filter((f) => f.inspectionId === testInspId);
    assert(
      finalFindingsInC.length === 0,
      "6.7: All findings cleared when inspection becomes 100% compliant",
      `Found ${finalFindingsInC.length} findings for test inspection`
    );
  } finally {
    // Clean up test inspection from DB
    try {
      const { createClient } = require("@supabase/supabase-js");
      const fs = require("fs");
      const env = fs.readFileSync(".env.local", "utf8");
      let url, key;
      env.split("\n").forEach((l) => {
        if (l.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) url = l.split("=")[1].trim();
        if (l.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) key = l.split("=")[1].trim();
        if (!key && l.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) key = l.split("=")[1].trim();
      });
      const sb = createClient(url, key);
      await sb.from("compliance_findings").delete().eq("inspection_id", testInspId);
      await sb.from("final_results").delete().eq("inspection_id", testInspId);
      await sb.from("inspections").delete().eq("id", testInspId);
      console.log(`[CLEANUP] Cleaned up temporary test inspection ${testInspId}`);
    } catch (cleanupErr) {
      console.warn("Cleanup warning:", cleanupErr.message);
    }
  }

  // ------------------------------------------------------------
  // TEST 7: Cross-Check with Inspections API
  // ------------------------------------------------------------
  console.log("\n--- TEST 7: Cross-Service Consistency ---");
  const inspRes = await fetch(`${BASE_URL}/api/inspections`);
  assert(inspRes.status === 200, "7.1: GET /api/inspections returns 200 OK");
  const inspJson = await inspRes.json();
  const inspTotal = inspJson.data?.total !== undefined ? inspJson.data.total : (Array.isArray(inspJson.data) ? inspJson.data.length : (inspJson.data?.inspections?.length || 0));

  const latestAnalyticsRes = await fetch(`${BASE_URL}/api/analytics/rules`);
  const latestAnalyticsJson = await latestAnalyticsRes.json();
  const currentTotal = latestAnalyticsJson.data.overview.totalInspections;

  assert(
    inspTotal === currentTotal,
    "7.2: Total inspections count in Rule Analytics matches /api/inspections exactly",
    `Analytics Total: ${currentTotal}, Inspections API Total: ${inspTotal}`
  );

  console.log("\n============================================================");
  console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests})`);
  console.log("============================================================\n");
}

runAnalyticsTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
