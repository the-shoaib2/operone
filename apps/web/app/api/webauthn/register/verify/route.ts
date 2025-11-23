import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyRegistrationResponseForUser } from '@/lib/webauthn'
import type { RegistrationResponseJSON } from '@simplewebauthn/types'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { response, challenge } = body as {
      response: RegistrationResponseJSON
      challenge: string
    }

    if (!response || !challenge) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponseForUser(response, challenge)

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo

    // Save the authenticator to the database
    await prisma.authenticator.create({
      data: {
        credentialID: Buffer.from(credentialID).toString('base64url'),
        userId: user.id,
        providerAccountId: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
        counter,
        credentialDeviceType: verification.registrationInfo.credentialDeviceType,
        credentialBackedUp: verification.registrationInfo.credentialBackedUp,
        transports: response.response.transports
          ? JSON.stringify(response.response.transports)
          : null,
      },
    })

    return NextResponse.json({ verified: true })
  } catch (error) {
    console.error('WebAuthn registration verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify registration' },
      { status: 500 }
    )
  }
}
