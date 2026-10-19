import { runAutomatedTestSuite, generateMarkdownReport } from "../src/lib/tools/testing/automated-test-suite";
import { toolsConfigStore } from "../src/lib/tools/tools-config-store";
import { providerManager } from "../src/lib/tools/providers/provider-manager";
import fs from "fs";
import path from "path";

async function main() {
  console.log("================================================================================");
  console.log("🚀 STARTING AUTOMATED TEST SUITE FOR ALL 60 VOID TOOLS");
  console.log("================================================================================\n");

  // 1. Detect application configuration (file .void_tools_config.json, .env, .env.local, process.env)
  toolsConfigStore.loadEnvFiles();
  const activeKeys = toolsConfigStore.getApiKeysMap();

  console.log("--------------------------------------------------------------------------------");
  console.log("🔑 DETECTED APPLICATION API CONFIGURATION SOURCE:");
  console.log("--------------------------------------------------------------------------------");
  const configuredProviders = Object.keys(activeKeys).filter(
    (k) => !k.endsWith("_base_url") && !k.endsWith("_model")
  );

  if (configuredProviders.length === 0) {
    console.log("  ⚠️  Tidak ada kunci API AI yang dikonfigurasi di .void_tools_config.json atau .env/.env.local");
    console.log("     Alat AI eksternal akan berada dalam status 'CONFIG REQUIRED'.");
  } else {
    for (const p of configuredProviders) {
      const keyVal = activeKeys[p] || "";
      const masked =
        keyVal.length > 8
          ? keyVal.slice(0, 4) + "••••••••" + keyVal.slice(-4)
          : "••••••••";
      console.log(`  • ${p.toUpperCase().padEnd(16)}: Terdeteksi (${masked})`);
    }
  }

  // 2. Audit Provider Connectivity
  console.log("\n--------------------------------------------------------------------------------");
  console.log("🔌 AUDITING LIVE PROVIDER CONNECTIONS:");
  console.log("--------------------------------------------------------------------------------");
  const providerStatuses = await providerManager.getAllProvidersStatus(activeKeys);
  for (const prov of providerStatuses) {
    const icon = prov.status === "connected" ? "🟢" : prov.status === "error" ? "🔴" : "🟡";
    console.log(
      `  [${icon} ${prov.status.padEnd(12)}] ${prov.name.padEnd(25)} | Configured: ${prov.isKeyConfigured ? "Yes" : "No "} | Note: ${prov.statusMessage}`
    );
  }
  console.log("");

  const startTime = Date.now();
  const suiteResult = await runAutomatedTestSuite(activeKeys);
  const totalElapsed = Date.now() - startTime;

  console.log("\n================================================================================");
  console.log("📊 TEST RUN COMPLETE - SUMMARY OF 60 VOID TOOLS");
  console.log("================================================================================");
  console.log(`Total Tools: ${suiteResult.summary.totalTools}`);
  console.log(`🟢 Passed: ${suiteResult.summary.passed}`);
  console.log(`🟡 Missing Configuration: ${suiteResult.summary.configRequired}`);
  console.log(`🔴 Failed: ${suiteResult.summary.failed}`);
  console.log(`⏱️ Total Time: ${totalElapsed}ms\n`);

  console.log("--------------------------------------------------------------------------------");
  console.log("CATEGORY BREAKDOWN:");
  console.log("--------------------------------------------------------------------------------");
  for (const [cat, stat] of Object.entries(suiteResult.summary.categoryStats)) {
    console.log(
      `  • ${cat.padEnd(12)}: Total ${stat.total} | 🟢 Pass: ${stat.passed} | 🟡 Config Req: ${stat.configRequired} | 🔴 Fail: ${stat.failed}`
    );
  }

  const reportMarkdown = generateMarkdownReport(suiteResult);

  // Save report to disk
  const reportPath = path.join(process.cwd(), "VOID_TOOLS_TEST_REPORT.md");
  fs.writeFileSync(reportPath, reportMarkdown, "utf8");
  console.log(`\n📄 Report saved to: ${reportPath}`);

  // Also print all 60 tool details to stdout
  console.log("\n================================================================================");
  console.log("DETAILED TEST RESULTS (ALL 60 TOOLS):");
  console.log("================================================================================");
  for (const r of suiteResult.results) {
    console.log(
      `[${r.statusIcon} ${r.status.padEnd(15)}] ${r.toolName.padEnd(28)} | ${r.categoryName.padEnd(16)} | ${r.responseTimeMs.toString().padStart(4)}ms | Provider: ${r.provider}`
    );
    if (r.error) {
      console.log(`   └─ Note: ${r.error}`);
    }
  }

  // Print raw json summary for programmatic capture
  console.log("\n__JSON_SUMMARY__" + JSON.stringify(suiteResult.summary) + "__JSON_SUMMARY__");
}

main().catch((err) => {
  console.error("❌ Fatal error running test suite:", err);
  process.exit(1);
});
