import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const session = await auth()
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const sessions = await prisma.session.findMany({
            where: { userId: session.user.id },
            orderBy: { lastActivity: 'desc' }
        })

        // Get current session token to identify current session
        const currentSessionToken = session.sessionToken

        const formattedSessions = sessions.map((s: typeof sessions[0]) => ({
            id: s.id,
            userAgent: s.userAgent,
            ipAddress: s.ipAddress,
            deviceName: s.deviceName,
            lastActivity: s.lastActivity.toISOString(),
            createdAt: s.createdAt.toISOString(),
            isCurrent: s.sessionToken === currentSessionToken
        }))

        return NextResponse.json({ sessions: formattedSessions })
    } catch (error) {
        console.error('Error fetching sessions:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
