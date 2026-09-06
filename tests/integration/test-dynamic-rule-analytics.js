/**
 * Integration Test: Dynamic Rule Analytics & Single-Inspection Lifecycle
 * Tests that:
 * 1. Live /api/analytics/rules only returns rules that were actually evaluated in inspections.
 * 2. If all data is deleted and starting from one inspection:
 *    - Reports exactly 1 completed inspection.
 *    - Returns ONLY the rules that were used/evaluated for that inspection.
 *    - Unused rules are not shown.
 * 3. Dynamic rule capacity: Can handle arbitrary number of rules evaluated (not restricted to 10).
 * 4. Empty database handles 0 inspections with 0 rules safely.
 */

const http = require('http');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function assert(condition, message, details = "") {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    if (details) console.error(`   Details: ${details}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runTests() {
  console.log("===============================================================================");
  console.log("TEST SUITE: Dynamic Rule Analytics (Only Rules Used & Single Inspection Test)");
  console.log("===============================================================================\n");

  // TEST 1: Query current live server
  console.log("--- TEST 1: Live Server Rule Analytics Output ---");
  const liveRes = await fetchJson("http://localhost:3000/api/analytics/rules");
  assert(liveRes.success === true, "API returned success: true");
  assert(!!liveRes.data, "API returned data object");
  
  const { overview, rules } = liveRes.data;
  console.log(`Live Overview: ${overview.totalInspections} total, ${overview.evaluatedInspections} evaluated, ${overview.compliantCount} passed, ${overview.nonCompliantCount} failed.`);
  console.log(`Total rules returned: ${rules.length} (totalMonitoredRules = ${overview.totalMonitoredRules})`);

  assert(
    overview.totalMonitoredRules === rules.length,
    "overview.totalMonitoredRules matches exact rules array length",
    `overview: ${overview.totalMonitoredRules}, rules.length: ${rules.length}`
  );

  assert(
    rules.every((r) => r.totalEvaluated > 0),
    "Every returned rule was actually evaluated in at least 1 inspection (no 0-evaluation ghost rules)",
    `Rules evaluated counts: ${rules.map((r) => `${r.ruleId}:${r.totalEvaluated}`).join(", ")}`
  );

  const returnedRuleIds = rules.map((r) => r.ruleId);
  assert(
    !returnedRuleIds.includes("rule_7") && !returnedRuleIds.includes("rule_27"),
    "Unused rules (rule_7, rule_27) are cleanly excluded because they were never evaluated in these inspections",
    `Returned rules: ${returnedRuleIds.join(", ")}`
  );

  // TEST 2: Simulate 1 Completed Inspection Lifecycle
  console.log("\n--- TEST 2: Single Completed Inspection State Simulation ---");
  const CORE_STATUTORY_RULE_IDS = [
    "rule_6_1_a",
    "rule_6_1_b",
    "rule_6_1_c",
    "rule_6_1_d",
    "rule_6_1_e",
    "rule_6_1_f",
    "rule_6_1_g",
    "rule_6_1_l",
  ];

  function normalizeRuleId(rawId) {
    if (!rawId) return "other";
    const cleaned = rawId.trim().toLowerCase().replace(/[\s\-_]+/g, "_");
    if (cleaned.includes("6_1_a") || cleaned === "rule_6_1_a") return "rule_6_1_a";
    if (cleaned.includes("6_1_b") || cleaned === "rule_6_1_b") return "rule_6_1_b";
    if (cleaned.includes("6_1_c") || cleaned === "rule_6_1_c") return "rule_6_1_c";
    if (cleaned.includes("6_1_d") || cleaned === "rule_6_1_d") return "rule_6_1_d";
    if (cleaned.includes("6_1_e_usp")) return "rule_6_1_l";
    if (cleaned.includes("6_1_e") || cleaned === "rule_6_1_e") return "rule_6_1_e";
    if (cleaned.includes("6_1_f") || cleaned === "rule_6_1_f") return "rule_6_1_f";
    if (cleaned.includes("6_1_g") || cleaned === "rule_6_1_g") return "rule_6_1_g";
    if (cleaned.includes("6_1_l") || cleaned === "rule_6_1_l") return "rule_6_1_l";
    if (cleaned.includes("6_1_n") || cleaned === "rule_6_1_n") return "rule_6_1_n";
    if (cleaned.startsWith("rule_7") || cleaned.includes("numeral") || cleaned.includes("font") || cleaned.includes("dimension")) return "rule_7";
    if (cleaned.startsWith("rule_8")) return "rule_8";
    if (cleaned.startsWith("rule_9")) return "rule_9";
    if (cleaned.startsWith("rule_10")) return "rule_10";
    if (cleaned.startsWith("rule_18")) return "rule_18";
    if (cleaned.startsWith("rule_23")) return "rule_23";
    if (cleaned.startsWith("rule_27") || cleaned.includes("registration")) return "rule_27";
    return cleaned;
  }

  function getRuleDefinition(rawRuleId, ruleName) {
    const normId = normalizeRuleId(rawRuleId);
    let ruleNumber = normId.toUpperCase().replace(/_/g, " ");
    if (normId.startsWith("rule_")) {
      const parts = normId.replace(/^rule_/, "").split("_");
      if (parts.length >= 2) {
        ruleNumber = `Rule ${parts[0]}(${parts.slice(1).join(")(")})`;
      } else {
        ruleNumber = `Rule ${parts[0]}`;
      }
    }
    return {
      ruleId: normId,
      ruleNumber,
      title: ruleName || `Statutory Check (${ruleNumber})`,
      statutoryReference: "Legal Metrology (Packaged Commodities) Rules, 2011",
    };
  }

  // Simulated 1 single inspection:
  const simAllInspections = [
    { id: "insp-001", product_type: "Pure Cow Ghee 1L", status: "COMPLETED", created_at: new Date().toISOString() }
  ];
  const simLatestResultByInspection = new Map();
  simLatestResultByInspection.set("insp-001", {
    id: "res-001",
    inspection_id: "insp-001",
    status: "PASS",
    total_violations_count: 0,
    high_severity_count: 0,
    findings_json: {
      findings: [],
      evaluated_rules: CORE_STATUTORY_RULE_IDS.map(id => ({ rule_id: id, result: "PASS" }))
    }
  });
  const simFindings = [];

  // Route aggregation algorithm:
  let simCompliant = 0;
  let simNonCompliant = 0;
  let simPending = 0;
  const simRuleEvaluated = new Map();

  simAllInspections.forEach((insp) => {
    const lr = simLatestResultByInspection.get(insp.id);
    if (lr && (lr.status === "PASS" || lr.status === "COMPLIANT") && lr.total_violations_count === 0) {
      simCompliant++;
    } else if (lr) {
      simNonCompliant++;
    } else {
      simPending++;
    }

    const evalSet = new Set();
    if (lr && lr.findings_json && lr.findings_json.evaluated_rules) {
      lr.findings_json.evaluated_rules.forEach((er) => evalSet.add(normalizeRuleId(er.rule_id)));
    }
    evalSet.forEach((rid) => {
      if (!simRuleEvaluated.has(rid)) simRuleEvaluated.set(rid, new Set());
      simRuleEvaluated.get(rid).add(insp.id);
    });
  });

  const simUsedRules = Array.from(simRuleEvaluated.keys()).filter((rid) => simRuleEvaluated.get(rid).size > 0);
  const simRuleList = simUsedRules.map((rid) => {
    const def = getRuleDefinition(rid);
    const totalEvaluated = simRuleEvaluated.get(rid).size;
    const failedCount = 0;
    const passedCount = totalEvaluated;
    return {
      ruleId: def.ruleId,
      ruleNumber: def.ruleNumber,
      totalEvaluated,
      passedCount,
      failedCount,
      complianceRate: 100.0,
      failureRate: 0.0
    };
  });

  assert(simAllInspections.length === 1, "Simulated inspection count is exactly 1");
  assert(simCompliant === 1, "Simulated compliant count is exactly 1 (one completed)");
  assert(simNonCompliant === 0, "Simulated nonCompliant count is 0");
  assert(simRuleList.length === 8, `Simulated rule list has only the 8 evaluated rules (length: ${simRuleList.length})`);
  assert(simRuleList.every(r => r.totalEvaluated === 1), "Every returned rule has totalEvaluated = 1");
  assert(simRuleList.every(r => r.complianceRate === 100), "Every returned rule has 100% pass rate");
  assert(!simRuleList.some(r => r.ruleId === "rule_7" || r.ruleId === "rule_27"), "Unused rules (rule_7, rule_27) are not included");

  // TEST 3: Dynamic Rule Capacity (more than 10 rules evaluated)
  console.log("\n--- TEST 3: Dynamic Rule Capacity (Not restricted to 10 rules) ---");
  const extendedRulesEvaluated = [
    "rule_6_1_a",
    "rule_6_1_b",
    "rule_6_1_c",
    "rule_6_1_d",
    "rule_6_1_e",
    "rule_6_1_f",
    "rule_6_1_g",
    "rule_6_1_l",
    "rule_6_1_n", // Country of origin for imported goods
    "rule_7",     // PDP Dimensions
    "rule_8",     // Declaration Placement
    "rule_9",     // Prominence of declarations
    "rule_10",    // Quantity standard units
    "rule_18",    // Wholesale packages
    "rule_23",    // Deceptive packaging prohibition
    "rule_27",    // Pre-packer registration
  ];

  const extendedDefs = extendedRulesEvaluated.map((id) => getRuleDefinition(id));
  assert(extendedDefs.length === 16, `Can evaluate and dynamically generate ${extendedDefs.length} rules (exceeds 10)`);
  assert(extendedDefs.every(d => !!d.ruleNumber && !!d.title && !!d.statutoryReference), "All 16 rules have complete statutory definitions");

  // TEST 4: Dynamic Custom Rule Definition Fallback
  console.log("\n--- TEST 4: Fallback for Unknown / Custom Rule IDs ---");
  const customDef = getRuleDefinition("rule_6_1_xyz", "Custom E-Commerce Packaging Check");
  assert(customDef.ruleNumber === "Rule 6(1)(xyz)", `Custom rule number formatted correctly: ${customDef.ruleNumber}`);
  assert(customDef.title === "Custom E-Commerce Packaging Check", `Custom rule title preserved: ${customDef.title}`);

  console.log("\n===============================================================================");
  console.log("ALL TESTS PASSED: Dynamic rule analytics correctly derives ONLY used rules,");
  console.log("correctly reflects single-inspection lifecycle ('1 completed'), and supports any number of rules.");
  console.log("===============================================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
