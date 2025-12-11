import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export async function GET() {
    try {
        const session = await auth()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if prisma is available
        if (!prisma) {
            console.error('Prisma client not initialized')
            return NextResponse.json({ error: 'Database not available' }, { status: 500 })
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: {
                authenticators: true,
            },
        })

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Filter and map authenticators, handling null values
        const passkeys = user.authenticators
            .filter(auth => auth.createdAt !== null) // Filter out invalid entries
            .map(auth => ({
                id: auth.id,
                name: auth.name || 'Unnamed Passkey',
                credentialDeviceType: auth.credentialDeviceType || 'unknown',
                credentialBackedUp: auth.credentialBackedUp || false,
                createdAt: auth.createdAt || new Date(),
                updatedAt: auth.updatedAt || new Date(),
            }))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

        return NextResponse.json({ passkeys })
    } catch (error) {
        console.error('Error fetching passkeys:', error)
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')
        return NextResponse.json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
