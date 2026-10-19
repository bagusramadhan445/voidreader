import dns from "dns";
import { promisify } from "util";
import { Agent as UndiciAgent } from "undici";

const lookupAsync = promisify(dns.lookup);

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxSizeBytes?: number;
  allowedContentTypes?: string[];
  maxRedirects?: number;
}


/**
 * Checks whether an IPv4 address belongs to a private, loopback, or reserved range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata: 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT: 100.64.0.0 - 100.127.255.255)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 192.0.0.0/24, 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0) return true;

  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51) return true;

  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (b0 >= 224) return true;

  return false;
}

/**
 * Checks whether an IPv6 address is loopback, unique local, link-local, or IPv4-mapped private.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim().replace(/^\[|\]$/g, "");


  // ::1 loopback, unspecified ::
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1" || normalized === "::") {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (normalized.startsWith("::ffff:") || normalized.startsWith("0:0:0:0:0:ffff:")) {
    const ipv4Part = normalized.split(":").pop();
    if (ipv4Part && ipv4Part.includes(".")) {
      return isPrivateIPv4(ipv4Part);
    }
  }

  // NAT64 / DNS64 prefix (e.g. 64:ff9b:: or ISP ULA mapped fd00:...::X:Y)
  // If the last 32 bits encode an IPv4 address, evaluate the underlying IPv4 address
  if (normalized.startsWith("64:ff9b::") || normalized.startsWith("fd") || normalized.startsWith("fc")) {
    const parts = normalized.split(":").filter(Boolean);
    if (parts.length >= 3) {
      const s1 = parseInt(parts[parts.length - 2], 16);
      const s2 = parseInt(parts[parts.length - 1], 16);
      if (!isNaN(s1) && !isNaN(s2) && s1 <= 0xffff && s2 <= 0xffff) {
        const embeddedIPv4 = `${(s1 >> 8) & 0xff}.${s1 & 0xff}.${(s2 >> 8) & 0xff}.${s2 & 0xff}`;
        // If it encodes an IPv4 address, check if that IPv4 address is private
        if (!isPrivateIPv4(embeddedIPv4)) {
          return false; // The embedded IPv4 is a legitimate public destination
        }
      }
    }
    return true;
  }

  // Link-local address (fe80::/10 -> fe8, fe9, fea, feb)
  if (
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  return false;
}

/**
 * Validates whether a target destination URL is safe to fetch server-side.
 * Rejects non-HTTP(S) protocols, localhost, cloud metadata, and internal IPs.
 */
export async function isSafeDestination(
  targetUrl: string | URL
): Promise<{ safe: boolean; reason?: string; parsedUrl?: URL }> {
  let parsed: URL;
  try {
    parsed = typeof targetUrl === "string" ? new URL(targetUrl) : targetUrl;
  } catch {
    return { safe: false, reason: "Malformed or invalid URL format." };
  }

  // 1. Strict Protocol Check (only http: and https:)
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      reason: `Unsupported protocol "${parsed.protocol}". Only HTTP and HTTPS are allowed.`,
    };
  }

  const host = parsed.hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");

  // 2. Blacklist forbidden hostnames
  const forbiddenHosts = [
    "localhost",
    "127.0.0.1",
    "::1",
    "0.0.0.0",
    "metadata.google.internal",
    "metadata",
    "instance-data",
  ];
  if (
    forbiddenHosts.includes(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".corp")
  ) {
    return {
      safe: false,
      reason: `Forbidden target hostname "${host}". Internal hosts are blocked.`,
    };
  }

  // 3. Directly check if hostname is already a numeric IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
    if (isPrivateIPv4(host)) {
      return {
        safe: false,
        reason: `Target IP "${host}" belongs to a private/loopback/cloud metadata address range.`,
      };
    }
    return { safe: true, parsedUrl: parsed };
  }

  if (host.includes(":")) {
    if (isPrivateIPv6(host)) {
      return {
        safe: false,
        reason: `Target IPv6 "${host}" belongs to a private/loopback address range.`,
      };
    }
    return { safe: true, parsedUrl: parsed };
  }

  // 4. DNS Resolution Check (prevents DNS rebinding and internal host aliases)
  try {
    const lookupResults = await lookupAsync(host, { all: true });
    const records = Array.isArray(lookupResults) ? lookupResults : [lookupResults];

    for (const record of records) {
      const address = record.address;
      if (record.family === 4 && isPrivateIPv4(address)) {
        return {
          safe: false,
          reason: `Resolved IP "${address}" for host "${host}" is in a private/restricted address range.`,
        };
      }
      if (record.family === 6 && isPrivateIPv6(address)) {
        return {
          safe: false,
          reason: `Resolved IPv6 "${address}" for host "${host}" is in a private/restricted address range.`,
        };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "DNS resolution failed";
    return {
      safe: false,
      reason: `DNS lookup failed for host "${host}": ${msg}`,
    };
  }

  return { safe: true, parsedUrl: parsed };
}

/**
 * Undici Agent hooking DNS resolution at TCP socket connection time.
 * Mitigates TOCTOU DNS Rebinding by validating that the exact IP returned
 * for socket creation does not belong to loopback, private, or metadata ranges.
 */
export const ssrfAgent = new UndiciAgent({
  connect: {
    lookup: (hostname, opts, cb) => {
      dns.lookup(hostname, opts, (err, addresses, family) => {
        if (err) return cb(err, addresses as unknown as string, family);
        const list: Array<{ address: string; family: number }> = Array.isArray(addresses)
          ? addresses
          : [{ address: addresses as string, family }];

        for (const item of list) {
          const addr = item.address;
          const fam = item.family;
          if (fam === 4 && isPrivateIPv4(addr)) {
            return cb(
              new Error(`[SSRF Blocked] Connection refused: ${hostname} resolved to private IPv4 ${addr}`),
              "",
              4
            );
          }
          if (fam === 6 && isPrivateIPv6(addr)) {
            return cb(
              new Error(`[SSRF Blocked] Connection refused: ${hostname} resolved to private IPv6 ${addr}`),
              "",
              6
            );
          }
        }

        cb(null, addresses as unknown as string, family);
      });
    },
  },
});

/**
 * SSRF-safe fetch wrapper with pre-flight IP validation, socket connection hook,
 * manual redirect validation, response size capping, and strict timeouts.
 */
export async function safeSsrfFetch(
  url: string,
  options?: SafeFetchOptions
): Promise<Response> {
  const timeoutMs = options?.timeoutMs || 10000;
  const maxSizeBytes = options?.maxSizeBytes || 10 * 1024 * 1024; // Default 10 MB limit
  const maxRedirects = options?.maxRedirects ?? 3;

  let currentUrl = url;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    // 1. Validate destination (Pre-flight check)
    const check = await isSafeDestination(currentUrl);
    if (!check.safe) {
      throw new Error(`[SSRF Blocked] ${check.reason || "Destination disallowed"}`);
    }

    // 2. Dispatch request with manual redirect and socket-level DNS verification agent
    const fetchOptions: RequestInit & { dispatcher?: unknown } = {
      ...options,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      dispatcher: ssrfAgent,
    };

    const response = await fetch(currentUrl, fetchOptions);


    // 3. Handle Redirects (301, 302, 303, 307, 308)
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`[SSRF Error] Redirect ${response.status} missing Location header.`);
      }

      // Resolve relative redirect against current URL
      const resolvedRedirect = new URL(location, currentUrl).href;
      currentUrl = resolvedRedirect;
      redirectCount++;
      continue;
    }

    // 4. Validate Content-Type if specified
    if (options?.allowedContentTypes && options.allowedContentTypes.length > 0) {
      const contentType = response.headers.get("content-type") || "";
      const matches = options.allowedContentTypes.some((allowed) =>
        contentType.toLowerCase().includes(allowed.toLowerCase())
      );
      if (!matches) {
        throw new Error(
          `[Content-Type Blocked] Expected one of [${options.allowedContentTypes.join(", ")}], got "${contentType}"`
        );
      }
    }

    // 5. Check Content-Length if reported
    const rawLen = response.headers.get("content-length");
    if (rawLen) {
      const len = parseInt(rawLen, 10);
      if (!isNaN(len) && len > maxSizeBytes) {
        throw new Error(
          `[Payload Too Large] Content-Length ${len} bytes exceeds maximum allowed ${maxSizeBytes} bytes.`
        );
      }
    }

    return response;
  }

  throw new Error(`[SSRF Error] Maximum redirect limit (${maxRedirects}) exceeded.`);
}
