import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuthenticationResponseForUser } from '@/lib/webauthn'
import { signIn } from '@/lib/auth'
import type { AuthenticationResponseJSON } from '@simplewebauthn/types'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { response, challenge, email } = body as {
      response: AuthenticationResponseJSON
      challenge: string
      email?: string
    }

    if (!response || !challenge) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find the authenticator by credential ID
    const credentialID = response.id

    const authenticator = await prisma.authenticator.findUnique({
      where: { credentialID },
      include: { user: true },
    })

    if (!authenticator) {
      return NextResponse.json({ error: 'Authenticator not found' }, { status: 404 })
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponseForUser(
      response,
      challenge,
      {
        credentialID: authenticator.credentialID,
        credentialPublicKey: authenticator.credentialPublicKey,
        counter: authenticator.counter,
      }
    )

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    // Update the counter
    await prisma.authenticator.update({
      where: { credentialID },
      data: { counter: verification.authenticationInfo.newCounter },
    })

    // Create a session for the user
    // Since we're using NextAuth with JWT, we need to sign them in
    // This is a simplified approach - in production, you'd want to create a proper session

    return NextResponse.json({
      verified: true,
      user: {
        id: authenticator.user.id,
        email: authenticator.user.email,
        name: authenticator.user.name,
      },
    })
  } catch (error) {
    console.error('WebAuthn authentication verification error:', error)
    return NextResponse.json(
      { error: 'Failed to verify authentication' },
      { status: 500 }
    )
  }
}
