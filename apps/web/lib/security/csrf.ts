import { NextRequest, NextResponse } from 'next/server'

/**
 * CSRF Protection Utilities
 * Implements double-submit cookie pattern for CSRF protection
 */

const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = 'csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a cryptographically secure random token
 */
export function generateCsrfToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Set CSRF token in response cookie
 */
export function setCsrfToken(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })
}

/**
 * Get CSRF token from request cookie
 */
export function getCsrfTokenFromCookie(request: NextRequest): string | undefined {
  return request.cookies.get(CSRF_COOKIE_NAME)?.value
}

/**
 * Get CSRF token from request header
 */
export function getCsrfTokenFromHeader(request: NextRequest): string | undefined {
  return request.headers.get(CSRF_HEADER_NAME) || undefined
}

/**
 * Validate CSRF token using double-submit cookie pattern
 * @returns true if valid, false otherwise
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = getCsrfTokenFromCookie(request)
  const headerToken = getCsrfTokenFromHeader(request)

  // Both tokens must exist and match
  if (!cookieToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken)
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Check if request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  return !safeMethods.includes(method.toUpperCase())
}

/**
 * Middleware helper to handle CSRF protection
 */
export function handleCsrfProtection(
  request: NextRequest,
  response: NextResponse
): { valid: boolean; response: NextResponse } {
  // Skip CSRF for safe methods
  if (!requiresCsrfProtection(request.method)) {
    // Generate and set token for safe methods if not present
    let token = getCsrfTokenFromCookie(request)
    if (!token) {
      token = generateCsrfToken()
      setCsrfToken(response, token)
    }
    return { valid: true, response }
  }

  // Validate CSRF token for unsafe methods
  const isValid = validateCsrfToken(request)

  if (!isValid) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      ),
    }
  }

  return { valid: true, response }
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME }
