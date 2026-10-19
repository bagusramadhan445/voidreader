import { NextRequest } from "next/server";

interface RateLimitRecord {
  timestamps: number[];
}

class MemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Periodically clean up records older than 10 minutes
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000;
    for (const [key, record] of this.store.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < maxAge);
      if (record.timestamps.length === 0) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Checks and consumes a token for a given key.
   * @param key Unique identifier (IP, user token, etc.)
   * @param limit Maximum allowed requests in window
   * @param windowMs Window duration in milliseconds
   */
  check(
    key: string,
    limit: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out timestamps outside window
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const resetMs = Math.max(0, oldest + windowMs - now);
      return {
        allowed: false,
        remaining: 0,
        resetMs,
      };
    }

    record.timestamps.push(now);
    return {
      allowed: true,
      remaining: limit - record.timestamps.length,
      resetMs: windowMs,
    };
  }

  /**
   * Helper to extract client IP from Next.js request headers
   */
  getClientIp(request: NextRequest): string {
    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    if (cfConnectingIp) return cfConnectingIp.trim();

    const xRealIp = request.headers.get("x-real-ip");
    if (xRealIp) return xRealIp.trim();

    const xForwardedFor = request.headers.get("x-forwarded-for");
    if (xForwardedFor) {
      const ips = xForwardedFor.split(",").map((s) => s.trim());
      if (ips[0]) return ips[0];
    }

    return "127.0.0.1";
  }

}

export const rateLimiter = new MemoryRateLimiter();
