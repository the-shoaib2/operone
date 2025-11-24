import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { name } = await request.json()

        if (!name || typeof name !== 'string') {
            return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
        }

        // Verify the authenticator belongs to the user
        const authenticator = await prisma.authenticator.findUnique({
            where: { id: params.id },
            include: { user: true },
        })

        if (!authenticator || authenticator.user.email !== session.user.email) {
            return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
        }

        // Update the passkey name
        const updated = await prisma.authenticator.update({
            where: { id: params.id },
            data: { name },
        })

        return NextResponse.json({ passkey: updated })
    } catch (error) {
        console.error('Error updating passkey:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth()

        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Verify the authenticator belongs to the user
        const authenticator = await prisma.authenticator.findUnique({
            where: { id: params.id },
            include: { user: true },
        })

        if (!authenticator || authenticator.user.email !== session.user.email) {
            return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
        }

        // Delete the passkey
        await prisma.authenticator.delete({
            where: { id: params.id },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting passkey:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
