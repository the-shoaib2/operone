import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { rateLimiter, RATE_LIMITS, type RateLimitConfig } from './lib/security/rate-limiter'
import { handleCsrfProtection, requiresCsrfProtection } from './lib/security/csrf'
import { applySecurityHeaders, applyRateLimitHeaders } from './lib/security/headers'
import { securityLogger, SecurityEventType, LogLevel } from './lib/security/logger'

/**
 * Production-grade proxy with comprehensive security features
 */
export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const startTime = Date.now()

  // Get request metadata
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // Initialize response
  let response = NextResponse.next()

  // ============================================
  // 1. RATE LIMITING
  // ============================================
  const rateLimitKey = `${ip}:${pathname}`
  let rateLimitConfig: RateLimitConfig = RATE_LIMITS.page

  // Apply stricter rate limits for specific routes
  if (pathname.startsWith('/api/auth/validate-token')) {
    rateLimitConfig = RATE_LIMITS.tokenValidation
  } else if (pathname.startsWith('/api/auth')) {
    rateLimitConfig = RATE_LIMITS.auth
  } else if (pathname.startsWith('/api')) {
    rateLimitConfig = RATE_LIMITS.api
  } else if (pathname.startsWith('/login')) {
    rateLimitConfig = RATE_LIMITS.login
  }

  const rateLimit = rateLimiter.check(rateLimitKey, rateLimitConfig)

  if (!rateLimit.allowed) {
    securityLogger.logRateLimitExceeded(rateLimitKey, pathname, ip)
    
    const rateLimitResponse = NextResponse.json(
      { 
        error: 'Too many requests',
        retryAfter: new Date(rateLimit.reset).toISOString()
      },
      { status: 429 }
    )
    
    applyRateLimitHeaders(rateLimitResponse, rateLimit)
    applySecurityHeaders(rateLimitResponse, {
      allowedImageSources: [
        'https://lh3.googleusercontent.com',
        'https://*.googleusercontent.com',
        'https://avatars.githubusercontent.com',
        'https://*.gravatar.com'
      ]
    })
    
    return rateLimitResponse
  }

  // ============================================
  // 2. CSRF PROTECTION
  // ============================================
  // Skip CSRF for certain paths
  const csrfExemptPaths = [
    '/api/auth/callback',
    '/api/auth/signin',
    '/api/auth/signout',
    '/api/auth/session',
    '/api/auth/validate-token',
    '/api/auth/store-token',
     '/api/webauthn',
    '/_next',
    '/favicon.ico',
  ]

  const isCsrfExempt = csrfExemptPaths.some(path => pathname.startsWith(path))

  if (!isCsrfExempt && requiresCsrfProtection(request.method)) {
    const csrfResult = handleCsrfProtection(request, response)
    
    if (!csrfResult.valid) {
      securityLogger.logCsrfFailure(pathname, ip, userAgent)
      applySecurityHeaders(csrfResult.response, {
        allowedImageSources: [
          'https://lh3.googleusercontent.com',
          'https://*.googleusercontent.com',
          'https://avatars.githubusercontent.com',
          'https://*.gravatar.com'
        ]
      })
      return csrfResult.response
    }
    
    response = csrfResult.response
  }

  // ============================================
  // 3. AUTHENTICATION & AUTHORIZATION
  // ============================================
  const protectedRoutes = [
    '/auth-success',
    '/dashboard',
    '/api/auth/store-token',
  ]

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  if (isProtectedRoute) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      securityLogger.logUnauthorizedAccess(pathname, ip)

      // For API routes, return 401
      if (pathname.startsWith('/api')) {
        const unauthorizedResponse = NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
        applySecurityHeaders(unauthorizedResponse, {
          allowedImageSources: [
            'https://lh3.googleusercontent.com',
            'https://*.googleusercontent.com',
            'https://avatars.githubusercontent.com',
            'https://*.gravatar.com'
          ]
        })
        return unauthorizedResponse
      }

      // For pages, redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', request.url)
      
      const redirectResponse = NextResponse.redirect(loginUrl)
      applySecurityHeaders(redirectResponse, {
        allowedImageSources: [
          'https://lh3.googleusercontent.com',
          'https://*.googleusercontent.com',
          'https://avatars.githubusercontent.com',
          'https://*.gravatar.com'
        ]
      })
      return redirectResponse
    }

    // Log successful authentication for protected routes
    if (token.id) {
      securityLogger.log({
        type: SecurityEventType.AUTH_SUCCESS,
        level: LogLevel.INFO,
        message: `Authenticated access to ${pathname}`,
        userId: token.id as string,
        ip,
        path: pathname,
      })
    }
  }

  // ============================================
  // 4. DESKTOP AUTHENTICATION FLOW
  // ============================================
  const isFromDesktop = searchParams.get('from') === 'desktop'
  const isOnAuthSuccess = pathname.startsWith('/auth-success')
  const isOnLogin = pathname.startsWith('/login')

  if (isFromDesktop && !isOnAuthSuccess && !isOnLogin) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (token) {
      const authSuccessUrl = new URL('/auth-success?from=desktop', request.url)
      const redirectResponse = NextResponse.redirect(authSuccessUrl)
      applySecurityHeaders(redirectResponse, {
        allowedImageSources: [
          'https://lh3.googleusercontent.com',
          'https://*.googleusercontent.com',
          'https://avatars.githubusercontent.com',
          'https://*.gravatar.com'
        ]
      })
      return redirectResponse
    }
  }

  // ============================================
  // 5. SECURITY HEADERS
  // ============================================
  applySecurityHeaders(response, {
    allowedImageSources: [
      'https://lh3.googleusercontent.com',
      'https://*.googleusercontent.com',
      'https://avatars.githubusercontent.com',
      'https://*.gravatar.com'
    ]
  })
  applyRateLimitHeaders(response, rateLimit)

  // ============================================
  // 6. PERFORMANCE MONITORING
  // ============================================
  const duration = Date.now() - startTime
  
  // Log slow requests
  if (duration > 1000) {
    securityLogger.log({
      type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      level: LogLevel.WARN,
      message: `Slow request detected: ${pathname}`,
      path: pathname,
      metadata: { duration, ip },
    })
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (static assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
