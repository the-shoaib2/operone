/**
 * In-memory rate limiter using sliding window algorithm
 * For production, consider using Redis or a distributed cache
 */

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Check if a request should be rate limited
   * @param identifier - Unique identifier (e.g., IP address, user ID)
   * @param config - Rate limit configuration
   * @returns Object with allowed status and rate limit info
   */
  check(
    identifier: string,
    config: RateLimitConfig
  ): {
    allowed: boolean
    limit: number
    remaining: number
    reset: number
  } {
    const now = Date.now()
    const entry = this.store.get(identifier)

    // If no entry or entry expired, create new one
    if (!entry || now > entry.resetTime) {
      const resetTime = now + config.windowMs
      this.store.set(identifier, { count: 1, resetTime })
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        reset: resetTime,
      }
    }

    // Increment count
    entry.count++

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      return {
        allowed: false,
        limit: config.maxRequests,
        remaining: 0,
        reset: entry.resetTime,
      }
    }

    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      reset: entry.resetTime,
    }
  }

  /**
   * Reset rate limit for a specific identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier)
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Destroy the rate limiter and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.store.clear()
  }
}

// Singleton instance
const rateLimiter = new RateLimiter()

// Rate limit configurations for different route types
export const RATE_LIMITS = {
  // General API routes
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, 
  },
  // Authentication routes
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, 
  },
  // Token validation (more restrictive)
  tokenValidation: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, 
  },
  // Login attempts (very restrictive)
  login: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, 
  },
  // General page requests
  page: {
    windowMs: 1 * 60 * 1000, // 1 minute
    maxRequests: 1000,
  },
} as const

export { rateLimiter, type RateLimitConfig }
