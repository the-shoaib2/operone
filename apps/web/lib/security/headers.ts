import { NextResponse } from 'next/server'

/**
 * Security Headers Configuration
 * Implements comprehensive security headers for production
 */

interface SecurityHeadersConfig {
  isDevelopment?: boolean
  allowedOrigins?: string[]
  allowedImageSources?: string[]
  allowedScriptSources?: string[]
}

/**
 * Build Content Security Policy header value
 */
export function buildCSP(config: SecurityHeadersConfig = {}): string {
  const { isDevelopment = false, allowedImageSources = [], allowedScriptSources = [] } = config

  // Base CSP directives
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      ...(isDevelopment ? ["'unsafe-eval'", "'unsafe-inline'"] : []),
      ...allowedScriptSources,
    ],
    'style-src': ["'self'", "'unsafe-inline'"], // unsafe-inline needed for styled-components, Tailwind
    'img-src': ["'self'", 'blob:', 'data:', ...allowedImageSources],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'frame-src': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  }

  // Add upgrade-insecure-requests in production
  const additionalDirectives = !isDevelopment ? ['upgrade-insecure-requests'] : []

  // Build CSP string
  const cspString = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .concat(additionalDirectives)
    .join('; ')

  return cspString
}

/**
 * Apply comprehensive security headers to response
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  const isDevelopment = process.env.NODE_ENV === 'development'

  // Strict Transport Security (HSTS)
  // Only set in production with HTTPS
  if (!isDevelopment) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    )
  }

  // Content Security Policy
  response.headers.set('Content-Security-Policy', buildCSP({ ...config, isDevelopment }))

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions Policy (formerly Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=(), browsing-topics=()'
  )

  // DNS Prefetch Control
  response.headers.set('X-DNS-Prefetch-Control', 'on')

  // XSS Protection (legacy, but still useful for older browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Cross-Origin Policies
  // In development, use less restrictive policies for external images
  if (!isDevelopment) {
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  } else {
    // In development, allow cross-origin images
    response.headers.set('Cross-Origin-Embedder-Policy', 'unsafe-none')
    response.headers.set('Cross-Origin-Opener-Policy', 'unsafe-none')
  }
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  return response
}

/**
 * Apply rate limit headers to response
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  rateLimit: {
    limit: number
    remaining: number
    reset: number
  }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString())
  response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString())
  response.headers.set('X-RateLimit-Reset', new Date(rateLimit.reset).toISOString())

  return response
}

/**
 * Security headers for API routes
 */
export function applyApiSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent caching of sensitive data
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  // Content type
  response.headers.set('Content-Type', 'application/json')

  return response
}
