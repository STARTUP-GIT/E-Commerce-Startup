/**
 * Lightweight in-memory cache with a Redis-ready interface.
 *
 * Production note:
 * - In this implementation a single-process in-memory `Map` is used (per server
 *   instance). For multi-instance deployments, swap `cacheStore` with a Redis
 *   store implementing the same interface (`get` / `set` / `delByPrefix` / `flush`).
 * - Only public, idempotent GET responses are cached. Auth, payments, orders,
 *   checkout and admin mutations are NEVER cached (see src/middleware/cache.ts).
 */

export interface CacheStore {
  get(key: string): string | undefined;
  set(key: string, value: string, ttlMs: number): void;
  delByPrefix(prefix: string): number;
  flush(): void;
  readonly size: number;
}

class MemoryCacheStore implements CacheStore {
  private readonly store = new Map<string, { value: string; expiresAt: number }>();
  private readonly maxEntries = 5000;

  get(key: string): string | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: string, ttlMs: number): void {
    if (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  delByPrefix(prefix: string): number {
    let removed = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  flush(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}

export const cacheStore: CacheStore = new MemoryCacheStore();
