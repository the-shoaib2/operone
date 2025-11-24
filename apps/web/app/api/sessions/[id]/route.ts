import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get current session token
        const cookieStore = await cookies()
        const currentSessionToken = cookieStore.get('next-auth.session-token')?.value || 
                                   cookieStore.get('__Secure-next-auth.session-token')?.value

        // Verify the session belongs to the user
        const sessionToDelete = await prisma.session.findUnique({
            where: { id: params.id },
            include: { user: true },
        })

        if (!sessionToDelete || sessionToDelete.user.email !== session.user.email) {
            return NextResponse.json({ error: 'Session not found' }, { status: 404 })
        }

        // Prevent deleting current session
        if (sessionToDelete.sessionToken === currentSessionToken) {
            return NextResponse.json(
                { error: 'Cannot revoke current session' },
                { status: 400 }
            )
        }

        // Delete the session
        await prisma.session.delete({
            where: { id: params.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting session:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
