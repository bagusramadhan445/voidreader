interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Global singleton across server invocations
const globalForCache = global as unknown as { appCache?: MemoryCache };
export const appCache = globalForCache.appCache ?? new MemoryCache();
if (process.env.NODE_ENV !== "production") globalForCache.appCache = appCache;
