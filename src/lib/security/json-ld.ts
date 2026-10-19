/**
 * JSON-LD and Structured Data Security Utilities for Void Verse
 * Mitigates XSS vulnerabilities caused by untrusted external provider metadata
 * embedded in <script type="application/ld+json"> tags.
 */

/**
 * Escapes characters that can prematurely close or manipulate HTML <script> tags.
 * Replaces '<', '>', '&', and Unicode line/paragraph separators with JSON-safe escape sequences.
 * Standard JSON parsers (including Googlebot / Schema.org) transparently decode these.
 */
export function escapeJsonLd(jsonString: string): string {
  return jsonString
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Safely stringifies data for inclusion inside <script type="application/ld+json">.
 * Prevents script injection like </script><script>alert(1)</script>.
 */
export function safeJsonLdStringify(data: unknown): string {
  if (data === null || data === undefined) {
    return "{}";
  }
  const serialized = JSON.stringify(data);
  return escapeJsonLd(serialized);
}

/**
 * Sanitizes raw text fields (title, synopsis, author, etc.) from external manga providers.
 * Strips dangerous control characters and null bytes while preserving legitimate Unicode/Indonesian text.
 */
export function sanitizeMetadataString(input?: unknown, maxLength: number = 2000): string {
  if (typeof input !== "string") {
    return "";
  }
  // Remove null bytes and unprintable ASCII control characters (keep \t, \n, \r)
  const cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return cleaned.slice(0, maxLength);
}
