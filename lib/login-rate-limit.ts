/**
 * Login endpoint için basit in-memory rate limiter.
 * IP başına dakikada maksimum MAX_ATTEMPTS deneme izin verilir.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 1 dakika

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * IP adresini kontrol eder ve rate limit aşılmışsa true döner.
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    // Yeni pencere başlat
    store.set(ip, { count: 1, windowStart: now });
    return false;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return true;
  }

  entry.count++;
  return false;
}

/**
 * Başarılı login sonrasında sayacı sıfırlar.
 */
export function resetRateLimit(ip: string): void {
  store.delete(ip);
}

/**
 * Kalan deneme hakkını ve pencere sıfırlanma süresini döner.
 */
export function getRateLimitInfo(ip: string): { remaining: number; resetInMs: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    return { remaining: MAX_ATTEMPTS, resetInMs: 0 };
  }

  return {
    remaining: Math.max(0, MAX_ATTEMPTS - entry.count),
    resetInMs: Math.max(0, WINDOW_MS - (now - entry.windowStart)),
  };
}
