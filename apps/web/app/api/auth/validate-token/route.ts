import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

import { z } from 'zod'
import { validateTokenSchema } from '@/lib/validations/auth'
import { rateLimiter, RATE_LIMITS } from '@/lib/security/rate-limiter'
import { securityLogger, SecurityEventType, LogLevel } from '@/lib/security/logger'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'
    
    const rateLimit = rateLimiter.check(`${ip}:validate-token`, RATE_LIMITS.tokenValidation)
    
    if (!rateLimit.allowed) {
      securityLogger.logRateLimitExceeded(`${ip}:validate-token`, '/api/auth/validate-token', ip)
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const body = await req.json()
    
    // Validation
    const result = validateTokenSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { token } = result.data

    // Find token in DB
    const tokenData = await prisma.desktopAuthToken.findUnique({
      where: { token },
      include: { user: true }
    })

    if (!tokenData) {
      securityLogger.log({
        type: SecurityEventType.TOKEN_VALIDATION_FAILED,
        level: LogLevel.WARN,
        message: 'Invalid token validation attempt',
        ip,
        path: '/api/auth/validate-token'
      })
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Check expiry
    if (tokenData.expires < new Date()) {
      await prisma.desktopAuthToken.delete({ where: { id: tokenData.id } })
      securityLogger.log({
        type: SecurityEventType.TOKEN_VALIDATION_FAILED,
        level: LogLevel.WARN,
        message: 'Expired token validation attempt',
        ip,
        path: '/api/auth/validate-token'
      })
      return NextResponse.json({ error: 'Token has expired' }, { status: 401 })
    }

    // Delete token (single-use)
    await prisma.desktopAuthToken.delete({ where: { id: tokenData.id } })

    securityLogger.log({
      type: SecurityEventType.TOKEN_VALIDATION_SUCCESS,
      level: LogLevel.INFO,
      message: 'Token validated successfully',
      userId: tokenData.user.id,
      ip,
      path: '/api/auth/validate-token'
    })

    // Return user data
    return NextResponse.json({
      user: {
        id: tokenData.user.id,
        email: tokenData.user.email,
        name: tokenData.user.name,
        image: tokenData.user.image,
      },
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    )
  }
}
