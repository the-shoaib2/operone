import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                authenticators: {
                    select: {
                        id: true,
                        name: true,
                        credentialDeviceType: true,
                        credentialBackedUp: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        return NextResponse.json({ passkeys: user.authenticators })
    } catch (error) {
        console.error('Error fetching passkeys:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
