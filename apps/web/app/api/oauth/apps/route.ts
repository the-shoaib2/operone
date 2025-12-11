import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const apps = await prisma.oAuthApp.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(apps)
}

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const body = await req.json()
        const clientId = `oauth_app_${crypto.randomBytes(16).toString('hex')}`
        const clientSecret = `sk_oauth_${crypto.randomBytes(32).toString('hex')}`

        const app = await prisma.oAuthApp.create({
            data: {
                userId: session.user.id,
                name: body.name,
                description: body.description,
                type: body.type,
                clientId,
                clientSecret,
                callbackUrl: body.callbackUrl,
                permissions: body.permissions,
                status: 'development'
            }
        })

        return NextResponse.json(app)
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 })
    }
}
