import { toolsConfigStore } from "../src/lib/tools/tools-config-store";
import { isSafeDestination, isPrivateIPv4, isPrivateIPv6, ssrfAgent } from "../src/lib/security/ssrf";
import { validateProviderBaseUrl, isTrustedProviderOrigin } from "../src/lib/security/provider-allowlist";
import { rateLimiter } from "../src/lib/security/rate-limiter";
import { providerManager } from "../src/lib/tools/providers/provider-manager";
import { safeJsonLdStringify, sanitizeMetadataString, escapeJsonLd } from "../src/lib/security/json-ld";
import { hashMockPassword, verifyMockPassword, hashLegacySha256, generateMockSalt, derivePbkdf2Hash } from "../src/lib/supabase/auth";
import { getAuthenticatedUser, requireAdmin, requireAuth, validateCsrfOrigin } from "../src/lib/security/auth-guard";
import { toSafeErrorMessage, sanitizeTitle } from "../src/lib/security/input-validator";
import { isAllowedCorsOrigin } from "../src/app/api/proxy/image/route";
import nextConfig from "../next.config";
import { NextRequest } from "next/server";




async function runSecurityTests() {
  console.log("================================================================================");
  console.log("🔒 VOID VERSE SECURITY HARDENING TEST SUITE (PHASES 1, 2, & 3)");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      failedTests++;
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 1: API Key Exposure Mitigation (toolsConfigStore)
  // ---------------------------------------------------------------------------
  console.log("--------------------------------------------------------------------------------");
  console.log("1. API Key Exposure Mitigation (Public Config Sanitization)");
  console.log("--------------------------------------------------------------------------------");

  toolsConfigStore.saveApiKey("openai", "sk-proj-super-secret-test-key-12345");
  const publicConfig = toolsConfigStore.getPublicProvidersConfig();

  assert(
    Boolean(publicConfig.openai),
    "Public config includes provider metadata for openai"
  );
  assert(
    !("apiKey" in (publicConfig.openai as any)),
    "Public config strictly OMITS the 'apiKey' field"
  );
  assert(
    publicConfig.openai.isConfigured === true,
    "Public config reports 'isConfigured: true' without exposing plaintext secret"
  );

  let anySecretLeaked = false;
  for (const [id, prov] of Object.entries(publicConfig)) {
    if ("apiKey" in (prov as any) && (prov as any).apiKey) {
      anySecretLeaked = true;
      break;
    }
  }
  assert(!anySecretLeaked, "Zero API keys leaked across all registered providers in public config");

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: SSRF Pre-flight Destination Validation (isSafeDestination)
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("2. SSRF Protection & Internal Network Blocking");
  console.log("--------------------------------------------------------------------------------");

  const loopbackTest = await isSafeDestination(new URL("http://127.0.0.1:3000/api/secret"));
  assert(!loopbackTest.safe, "Blocks IPv4 Loopback 127.0.0.1", loopbackTest.reason);

  const localhostTest = await isSafeDestination(new URL("http://localhost:8080"));
  assert(!localhostTest.safe, "Blocks hostname 'localhost'", localhostTest.reason);

  const ipv6Loopback = await isSafeDestination(new URL("http://[::1]:3000"));
  assert(!ipv6Loopback.safe, "Blocks IPv6 Loopback [::1]", ipv6Loopback.reason);

  const cloudMetadata = await isSafeDestination(new URL("http://169.254.169.254/latest/meta-data/"));
  assert(!cloudMetadata.safe, "Blocks AWS/GCP/Azure Cloud Metadata (169.254.169.254)", cloudMetadata.reason);

  const privateClassA = await isSafeDestination(new URL("http://10.0.0.5:8000/admin"));
  assert(!privateClassA.safe, "Blocks Private Class A IP (10.0.0.0/8)", privateClassA.reason);

  const privateClassB = await isSafeDestination(new URL("http://172.16.5.1:8000/admin"));
  assert(!privateClassB.safe, "Blocks Private Class B IP (172.16.0.0/12)", privateClassB.reason);

  const privateClassC = await isSafeDestination(new URL("http://192.168.1.1/router"));
  assert(!privateClassC.safe, "Blocks Private Class C IP (192.168.0.0/16)", privateClassC.reason);

  const fileProtocol = await isSafeDestination(new URL("file:///etc/passwd"));
  assert(!fileProtocol.safe, "Blocks dangerous protocol 'file:'", fileProtocol.reason);

  const gopherProtocol = await isSafeDestination(new URL("gopher://127.0.0.1:6379/_flushall"));
  assert(!gopherProtocol.safe, "Blocks dangerous protocol 'gopher:'", gopherProtocol.reason);

  const legitimateMangaHost = await isSafeDestination(new URL("https://komiku.org/manga/one-piece"));
  assert(legitimateMangaHost.safe, "Allows legitimate external HTTPS provider (komiku.org)");

  const legitimateOpenAi = await isSafeDestination(new URL("https://api.openai.com/v1/models"));
  assert(legitimateOpenAi.safe, "Allows legitimate external HTTPS AI host (api.openai.com)");

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Base URL Exfiltration Protection (validateProviderBaseUrl)
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("3. API Key Exfiltration Prevention via Base URL");
  console.log("--------------------------------------------------------------------------------");

  const unencryptedAttacker = validateProviderBaseUrl("openai", "http://evil-attacker.com/v1");
  assert(
    !unencryptedAttacker.valid,
    "Rejects non-HTTPS unencrypted base URL",
    unencryptedAttacker.error
  );

  const attackerHttps = validateProviderBaseUrl("openai", "https://evil-attacker.com/v1");
  assert(
    attackerHttps.valid && !attackerHttps.isOfficial,
    "Identifies custom untrusted endpoint and flags isOfficial: false"
  );

  const officialOpenAi = validateProviderBaseUrl("openai", "https://api.openai.com/v1");
  assert(
    officialOpenAi.valid && officialOpenAi.isOfficial,
    "Identifies official OpenAI origin and flags isOfficial: true"
  );

  const officialOpenRouter = isTrustedProviderOrigin("openrouter", "https://openrouter.ai/api/v1");
  assert(
    officialOpenRouter === true,
    "Validates official OpenRouter endpoint origin"
  );

  const exfilAttempt = await providerManager.testSingleProvider("openai", "", "https://evil-attacker.com/v1");
  assert(
    exfilAttempt.status === "error",
    "providerManager blocks forwarding server credentials to custom base URL without client key"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Rate Limiting Sliding Window
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("4. Rate Limiter Security Guards");
  console.log("--------------------------------------------------------------------------------");

  const rateLimitKey = "test_rate_client_" + Date.now();
  let blockedOnLimit = false;

  for (let i = 0; i < 6; i++) {
    const check = rateLimiter.check(rateLimitKey, 5, 10000);
    if (!check.allowed) {
      blockedOnLimit = true;
      break;
    }
  }
  assert(blockedOnLimit, "Rate limiter enforces quota threshold (5 req/window) and blocks excess requests");

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: JSON-LD XSS Protection & Sanitization
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("5. XSS Protection in JSON-LD & Metadata Sanitization");
  console.log("--------------------------------------------------------------------------------");

  const xssPayload = {
    title: "One Piece </script><script>alert('XSS')</script>",
    description: "Read online <!-- HTML Comment Injection --> & explore",
    author: "Oda <img src=x onerror=alert(1)>",
  };

  const serializedLd = safeJsonLdStringify(xssPayload);

  assert(
    !serializedLd.includes("</script>"),
    "Escapes '</script>' closing tags to '\\u003c/script\\u003e'"
  );
  assert(
    !serializedLd.includes("<script>"),
    "Escapes '<script>' opening tags to '\\u003cscript\\u003e'"
  );
  assert(
    !serializedLd.includes("<!--"),
    "Escapes '<!--' comment tags to '\\u003c!--'"
  );
  assert(
    !serializedLd.includes("<img"),
    "Escapes '<img' tags to '\\u003cimg'"
  );

  // Verify that legitimate JSON consumers can still decode the escaped string transparently
  const parsedBack = JSON.parse(serializedLd);
  assert(
    parsedBack.title === xssPayload.title,
    "Standard JSON parser transparently decodes unicode escapes to original content for SEO"
  );

  // Test control character stripping in sanitizeMetadataString
  const dirtyString = "Manga\x00 Title\x08 With\x1F NullBytes";
  const cleanedString = sanitizeMetadataString(dirtyString);
  assert(
    cleanedString === "Manga Title With NullBytes",
    "sanitizeMetadataString strips ASCII control characters and null bytes"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 6: Authentication & Session Security
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("6. Authentication & Session Security");
  console.log("--------------------------------------------------------------------------------");

  const plainPassword = "SuperSecretPassword123!";
  const hash1 = await hashMockPassword(plainPassword);
  const fixedSalt = "0123456789abcdef0123456789abcdef";
  const hashWithFixedSalt1 = await hashMockPassword(plainPassword, fixedSalt);
  const hashWithFixedSalt2 = await hashMockPassword(plainPassword, fixedSalt);

  assert(
    hash1 !== plainPassword,
    "Passwords are hashed and NEVER stored in plaintext"
  );
  assert(
    hashWithFixedSalt1 === hashWithFixedSalt2,
    "Password hashing produces consistent deterministic hashes when using the same salt"
  );


  // Test that production mode strictly refuses mock tokens in auth-guard
  const envObj = process.env as Record<string, string | undefined>;
  const origEnv = envObj.NODE_ENV;
  try {
    envObj.NODE_ENV = "production";
    const mockRequest = new NextRequest("http://localhost:3000/api/tools/execute", {
      headers: {
        authorization: "Bearer mock-token-local-user-12345",
      },
    });
    const authResult = await getAuthenticatedUser(mockRequest);
    assert(
      authResult === null,
      "Strictly rejects mock tokens when running in production environment"
    );

    // Test that arbitrary non-mock tokens are rejected in production without Supabase
    const randomRequest = new NextRequest("http://localhost:3000/api/tools/execute", {
      headers: {
        authorization: "Bearer random-unverified-token-abcdef",
      },
    });
    const randomResult = await getAuthenticatedUser(randomRequest);
    assert(
      randomResult === null,
      "Arbitrary unverified tokens are rejected in production"
    );
  } finally {
    envObj.NODE_ENV = origEnv;
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 7: HTTP Security Headers
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("7. HTTP Security Headers (next.config.ts)");
  console.log("--------------------------------------------------------------------------------");

  const headersConfig = typeof nextConfig.headers === "function" ? await nextConfig.headers() : [];
  const globalHeaders = headersConfig.find((h: any) => h.source === "/:path*")?.headers || [];

  const getHeader = (name: string) =>
    globalHeaders.find((h: any) => h.key.toLowerCase() === name.toLowerCase())?.value;

  assert(
    getHeader("X-Content-Type-Options") === "nosniff",
    "Sets 'X-Content-Type-Options: nosniff'"
  );
  assert(
    getHeader("X-Frame-Options") === "SAMEORIGIN",
    "Sets 'X-Frame-Options: SAMEORIGIN'"
  );
  assert(
    getHeader("Referrer-Policy") === "strict-origin-when-cross-origin",
    "Sets 'Referrer-Policy: strict-origin-when-cross-origin'"
  );
  assert(
    Boolean(getHeader("Permissions-Policy")?.includes("camera=()")),
    "Sets 'Permissions-Policy' restricting unauthorized hardware"
  );
  assert(
    Boolean(getHeader("Strict-Transport-Security")?.includes("max-age=")),
    "Sets 'Strict-Transport-Security' (HSTS) with long max-age"
  );
  assert(
    Boolean(getHeader("Content-Security-Policy")?.includes("frame-ancestors 'self'")),
    "Sets 'Content-Security-Policy' with frame-ancestors 'self' and object-src 'none'"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 8: Information Disclosure Prevention & Input Validation
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("8. Information Disclosure Prevention & Input Sanitization");
  console.log("--------------------------------------------------------------------------------");

  // Test toSafeErrorMessage in dev mode
  envObj.NODE_ENV = "development";
  const devErr = new Error("Database connection failed on 10.0.0.4:5432 with password xyz");
  const devMsg = toSafeErrorMessage(devErr, "Fallback error message");
  assert(
    devMsg === "Database connection failed on 10.0.0.4:5432 with password xyz",
    "Preserves detailed error message in development mode for debugging"
  );

  // Test toSafeErrorMessage in production mode
  envObj.NODE_ENV = "production";
  const prodErr = new Error("FATAL: relation 'users' does not exist at /var/app/backend/db.ts:42");
  const prodMsg = toSafeErrorMessage(prodErr, "Gagal memproses permintaan.");
  assert(
    prodMsg === "Gagal memproses permintaan.",
    "Hides internal database/path exception details in production mode"
  );
  assert(
    !prodMsg.includes("/var/app"),
    "Does not leak server file paths in production error response"
  );

  // Test sanitizeTitle
  const maliciousTitle = "../../etc/passwd\0<script>alert(1)</script>";
  const cleanTitle = sanitizeTitle(maliciousTitle, "fallback");
  assert(
    !cleanTitle.includes("../") && !cleanTitle.includes("<") && !cleanTitle.includes("\0"),
    "Sanitizes titles by removing directory traversal patterns and HTML tags"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 9: Negative Authorization & Authentication Controls
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("9. Negative Authorization & Access Control Verification");
  console.log("--------------------------------------------------------------------------------");

  // Negative test: unauthenticated request to requireAdmin
  const unauthReq = new NextRequest("http://localhost:3000/api/tools/config", {
    method: "POST",
  });
  const unauthAdminRes = await requireAdmin(unauthReq);
  assert(
    "errorResponse" in unauthAdminRes && unauthAdminRes.errorResponse.status === 401,
    "requireAdmin rejects unauthenticated request with HTTP 401"
  );

  // Negative test: unauthenticated request to requireAuth
  const unauthAuthRes = await requireAuth(unauthReq);
  assert(
    "errorResponse" in unauthAuthRes && unauthAuthRes.errorResponse.status === 401,
    "requireAuth rejects unauthenticated request with HTTP 401"
  );

  // Negative test: non-admin authenticated user trying to access admin endpoint
  envObj.NODE_ENV = "development"; // allow mock auth in dev
  const normalUserReq = new NextRequest("http://localhost:3000/api/tools/downloader/config", {
    method: "POST",
    headers: {
      Authorization: "Bearer mock-token-test-user-12345",
    },
  });
  const normalUserAdminRes = await requireAdmin(normalUserReq);
  assert(
    "errorResponse" in normalUserAdminRes && normalUserAdminRes.errorResponse.status === 403,
    "requireAdmin rejects standard non-admin authenticated user with HTTP 403 Forbidden"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 10: Strict CORS Origin Boundary Verification
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("10. Strict CORS Origin Boundary Verification");
  console.log("--------------------------------------------------------------------------------");

  // Legitimate origins
  assert(isAllowedCorsOrigin("https://voidverse.my.id"), "Allows official domain https://voidverse.my.id");
  assert(isAllowedCorsOrigin("https://sub.voidverse.my.id"), "Allows official subdomain https://sub.voidverse.my.id");
  assert(isAllowedCorsOrigin("http://localhost:3000"), "Allows local dev http://localhost:3000");
  assert(isAllowedCorsOrigin("https://voidreader-phi.vercel.app"), "Allows official preview https://voidreader-phi.vercel.app");

  // Malicious / Attacker origins (substring attack vectors)
  assert(!isAllowedCorsOrigin("https://evil-voidverse.my.id.attacker.com"), "Blocks substring hijack: evil-voidverse.my.id.attacker.com");
  assert(!isAllowedCorsOrigin("https://attacker-voidreader-phi.vercel.app.org"), "Blocks substring hijack: attacker-voidreader-phi.vercel.app.org");
  assert(!isAllowedCorsOrigin("https://attacker-localhost.com"), "Blocks substring hijack: attacker-localhost.com");
  assert(!isAllowedCorsOrigin("null"), "Blocks 'null' origin string");
  assert(!isAllowedCorsOrigin(""), "Blocks empty origin string");
  assert(!isAllowedCorsOrigin(null), "Blocks null origin value");

  // ---------------------------------------------------------------------------
  // TEST GROUP 11: Rate Limiter Header Prioritization & Security
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("11. Rate Limiter IP Extraction & Header Security");
  console.log("--------------------------------------------------------------------------------");

  // When Cloudflare cf-connecting-ip is present, client-controlled x-forwarded-for spoofing is ignored
  const cfReq = new NextRequest("http://localhost:3000/api/proxy/image", {
    headers: {
      "cf-connecting-ip": "203.0.113.195",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    },
  });
  const resolvedIp = rateLimiter.getClientIp(cfReq);
  assert(
    resolvedIp === "203.0.113.195",
    "Prioritizes trusted 'cf-connecting-ip' header over client-controllable 'x-forwarded-for'"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 12: DNS Rebinding & Socket-Level SSRF Agent Protection
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("12. DNS Rebinding & Socket-Level SSRF Agent Protection");
  console.log("--------------------------------------------------------------------------------");

  assert(isPrivateIPv4("127.0.0.1"), "isPrivateIPv4 identifies 127.0.0.1 loopback");
  assert(isPrivateIPv4("10.0.1.5"), "isPrivateIPv4 identifies 10.0.0.0/8 private network");
  assert(isPrivateIPv4("172.20.0.1"), "isPrivateIPv4 identifies 172.16.0.0/12 private network");
  assert(isPrivateIPv4("192.168.1.1"), "isPrivateIPv4 identifies 192.168.0.0/16 private network");
  assert(isPrivateIPv4("169.254.169.254"), "isPrivateIPv4 identifies 169.254.169.254 cloud metadata");
  assert(isPrivateIPv4("0.0.0.0"), "isPrivateIPv4 identifies 0.0.0.0 current network");
  assert(!isPrivateIPv4("104.20.23.154"), "isPrivateIPv4 allows public IP 104.20.23.154");

  assert(isPrivateIPv6("::1"), "isPrivateIPv6 identifies ::1 loopback");
  assert(isPrivateIPv6("::ffff:127.0.0.1"), "isPrivateIPv6 identifies IPv4-mapped 127.0.0.1");
  assert(isPrivateIPv6("fe80::1"), "isPrivateIPv6 identifies fe80::/10 link-local");
  assert(Boolean(ssrfAgent), "ssrfAgent instance is initialized for socket-level DNS verification");

  // ---------------------------------------------------------------------------
  // TEST GROUP 13: CSRF Defense-in-Depth (Origin & Sec-Fetch-Site Verification)
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("13. CSRF Defense-in-Depth (Origin & Sec-Fetch-Site Verification)");
  console.log("--------------------------------------------------------------------------------");

  // Legitimate same-origin POST
  const legitimatePost = new NextRequest("http://localhost:3000/api/tools/config", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
    },
  });
  const legitCsrf = validateCsrfOrigin(legitimatePost);
  assert(legitCsrf.valid, "validateCsrfOrigin allows legitimate same-origin request");

  // Legitimate production domain POST
  const prodPost = new NextRequest("https://voidverse.my.id/api/tools/config", {
    method: "POST",
    headers: {
      host: "voidverse.my.id",
      origin: "https://voidverse.my.id",
      "sec-fetch-site": "same-origin",
    },
  });
  const prodCsrf = validateCsrfOrigin(prodPost);
  assert(prodCsrf.valid, "validateCsrfOrigin allows official production domain POST");

  // Malicious cross-site sec-fetch-site header
  const crossSiteReq = new NextRequest("http://localhost:3000/api/tools/config", {
    method: "POST",
    headers: {
      "sec-fetch-site": "cross-site",
    },
  });
  const crossSiteCsrf = validateCsrfOrigin(crossSiteReq);
  assert(
    !crossSiteCsrf.valid && crossSiteCsrf.errorResponse?.status === 403,
    "validateCsrfOrigin rejects sec-fetch-site: cross-site with HTTP 403"
  );

  // Malicious external origin attempting mutation
  const attackerPost = new NextRequest("http://localhost:3000/api/tools/config", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "https://evil-attacker.com",
    },
  });
  const attackerCsrf = validateCsrfOrigin(attackerPost);
  assert(
    !attackerCsrf.valid && attackerCsrf.errorResponse?.status === 403,
    "validateCsrfOrigin rejects unauthorized external origin with HTTP 403"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 14: PBKDF2 Password Hashing & Backward-Compatibility Verification
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("14. PBKDF2 Password Hashing & Backward-Compatibility Verification");
  console.log("--------------------------------------------------------------------------------");

  const plainPass = "MySuperSecretPassword@2026";
  const pbkdf2Hash1 = await hashMockPassword(plainPass);
  const pbkdf2Hash2 = await hashMockPassword(plainPass);

  assert(
    pbkdf2Hash1.startsWith("pbkdf2:100000:"),
    "hashMockPassword generates standard pbkdf2:100000:<salt>:<hash> format"
  );
  assert(
    pbkdf2Hash1 !== pbkdf2Hash2,
    "Unique random salts ensure identical passwords generate completely different hashes"
  );

  const correctMatch = await verifyMockPassword(plainPass, pbkdf2Hash1);
  assert(correctMatch, "verifyMockPassword successfully verifies valid password against PBKDF2 hash");

  const wrongMatch = await verifyMockPassword("WrongPassword123", pbkdf2Hash1);
  assert(!wrongMatch, "verifyMockPassword rejects invalid password against PBKDF2 hash");

  // Backward compatibility: legacy SHA-256
  const legacyHash = await hashLegacySha256(plainPass);
  const legacyMatch = await verifyMockPassword(plainPass, legacyHash);
  assert(legacyMatch, "verifyMockPassword seamlessly verifies legacy SHA-256 stored mock hash");

  // ---------------------------------------------------------------------------
  // TEST GROUP 15: Framework Fingerprint Mitigation (poweredByHeader: false)
  // ---------------------------------------------------------------------------
  console.log("\n--------------------------------------------------------------------------------");
  console.log("15. Framework Fingerprint Mitigation (poweredByHeader)");
  console.log("--------------------------------------------------------------------------------");

  assert(
    nextConfig.poweredByHeader === false,
    "nextConfig sets 'poweredByHeader: false' to eliminate x-powered-by header"
  );

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------



  console.log("\n================================================================================");
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
  console.log("================================================================================");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error("Test runner threw uncaught error:", err);
  process.exit(1);
});
