import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export async function GET(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    const repositories = await prisma.repository.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(repositories)
}

export async function POST(req: NextRequest) {
    const session = await auth()
    if (!session?.user?.id) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    try {
        const body = await req.json()
        const repository = await prisma.repository.create({
            data: {
                userId: session.user.id,
                name: body.name,
                description: body.description,
                language: body.language,
                private: body.private,
                defaultBranch: body.defaultBranch || 'main',
                status: 'active'
            }
        })

        return NextResponse.json(repository)
    } catch (error) {
        return new NextResponse('Internal Error', { status: 500 })
    }
}
