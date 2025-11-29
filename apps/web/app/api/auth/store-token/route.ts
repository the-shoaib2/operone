import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function generateToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

import { z } from 'zod'
import { storeTokenSchema } from '@/lib/validations/auth'
import { rateLimiter, RATE_LIMITS } from '@/lib/security/rate-limiter'
import { securityLogger, SecurityEventType, LogLevel } from '@/lib/security/logger'

export async function POST(request: NextRequest) {
    try {
        // Rate limiting
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
        
        const rateLimit = rateLimiter.check(`${ip}:store-token`, RATE_LIMITS.auth)
        
        if (!rateLimit.allowed) {
            securityLogger.logRateLimitExceeded(`${ip}:store-token`, '/api/auth/store-token', ip)
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429 }
            )
        }

        const body = await request.json()
        
        // Validation
        const result = storeTokenSchema.safeParse(body)
        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid input', details: result.error.flatten() },
                { status: 400 }
            )
        }

        const { token, userId } = result.data

        // Verify user is authenticated
        const session = await auth()
        if (!session?.user || session.user.id !== userId) {
            securityLogger.logUnauthorizedAccess('/api/auth/store-token', ip, userId)
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Generate a secure token if not provided
        const secureToken = token || generateToken()
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

        // Store token in database
        await prisma.desktopAuthToken.create({
            data: {
                token: secureToken,
                userId,
                expires: expiresAt
            }
        })

        securityLogger.log({
            type: SecurityEventType.AUTH_SUCCESS,
            level: LogLevel.INFO,
            message: 'Desktop auth token stored',
            userId,
            ip,
            path: '/api/auth/store-token'
        })

        return NextResponse.json({
            success: true,
            token: secureToken,
            expires: expiresAt
        })

    } catch (error) {
        console.error('Failed to store token:', error)
        return NextResponse.json(
            { error: 'Failed to store token' },
            { status: 500 }
        )
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')

        if (!token) {
            return NextResponse.json(
                { error: 'Token is required' },
                { status: 400 }
            )
        }

        // Find and validate token
        const authToken = await prisma.desktopAuthToken.findFirst({
            where: {
                token,
                expires: {
                    gt: new Date()
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        image: true
                    }
                }
            }
        })

        if (!authToken) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            )
        }

        return NextResponse.json({
            success: true,
            user: authToken.user,
            expires: authToken.expires
        })

    } catch (error) {
        console.error('Failed to validate token:', error)
        return NextResponse.json(
            { error: 'Failed to validate token' },
            { status: 500 }
        )
    }
}
