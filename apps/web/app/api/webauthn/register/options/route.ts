import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRegistrationOptionsForUser } from '@/lib/webauthn'


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { authenticators: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Generate registration options
    const options = await generateRegistrationOptionsForUser(
      user.id,
      user.name || 'User',
      user.email!,
      user.authenticators.map((auth) => ({
        credentialID: auth.credentialID,
        credentialPublicKey: auth.credentialPublicKey,
        counter: auth.counter,
        transports: auth.transports || undefined,
      }))
    )

    // Store challenge in session or temporary storage
    // For simplicity, we'll return it and expect it back
    // In production, store this server-side with expiry

    return NextResponse.json({ options })
  } catch (error) {
    console.error('WebAuthn registration options error:', error)
    return NextResponse.json(
      { error: 'Failed to generate registration options' },
      { status: 500 }
    )
  }
}
