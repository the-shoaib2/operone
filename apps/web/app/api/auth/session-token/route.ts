import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { securityLogger, SecurityEventType, LogLevel } from '@/lib/security/logger'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

function generateToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function POST(req: Request) {
    try {
        // Check if user is authenticated in web session
        const session = await auth()

        if (!session?.user) {
            return NextResponse.json(
                { error: 'No active web session found' },
                { status: 401 }
            )
        }

        // Generate a secure token for the desktop app
        const token = generateToken()
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

        // Store token directly in database
        await prisma.desktopAuthToken.create({
            data: {
                token,
                userId: session.user.id,
                expires: expiresAt
            }
        })

        // Log success
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        securityLogger.log({
            type: SecurityEventType.AUTH_SUCCESS,
            level: LogLevel.INFO,
            message: 'Desktop auth token generated from session',
            userId: session.user.id,
            ip,
            path: '/api/auth/session-token'
        })

        return NextResponse.json({
            success: true,
            token,
            user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                image: session.user.image
            }
        })

    } catch (error) {
        console.error('Failed to generate token from session:', error)
        return NextResponse.json(
            { error: 'Failed to generate token from session' },
            { status: 500 }
        )
    }
}
