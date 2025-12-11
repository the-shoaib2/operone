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

    const webhooks = await prisma.webhook.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(webhooks)
}

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const body = await req.json()
        const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`

        const webhook = await prisma.webhook.create({
            data: {
                userId: session.user.id,
                url: body.url,
                events: body.events,
                secret,
                active: true
            }
        })

        return NextResponse.json(webhook)
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 })
    }
}
