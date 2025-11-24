import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                sessions: {
                    where: {
                        expires: {
                            gt: new Date(), // Only active sessions
                        },
                    },
                    select: {
                        id: true,
                        sessionToken: true,
                        userAgent: true,
                        ipAddress: true,
                        deviceName: true,
                        lastActivity: true,
                        createdAt: true,
                        expires: true,
                    },
                    orderBy: {
                        lastActivity: 'desc',
                    },
                },
            },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Get current session token from cookies
        const cookieStore = await cookies()
        const currentSessionToken = cookieStore.get('next-auth.session-token')?.value || 
                                   cookieStore.get('__Secure-next-auth.session-token')?.value

        // Mark current session
        const sessions = user.sessions.map(s => ({
            ...s,
            isCurrent: s.sessionToken === currentSessionToken,
        }))

        return NextResponse.json({ sessions })
    } catch (error) {
        console.error('Error fetching sessions:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
