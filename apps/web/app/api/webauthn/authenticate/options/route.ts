import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAuthenticationOptionsForUser } from '@/lib/webauthn'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { email } = body

    if (!email) {
      // For discoverable credentials, we can generate options without email
      const options = await generateAuthenticationOptionsForUser([])
      return NextResponse.json({ options })
    }

    // Get user and their authenticators
    const user = await prisma.user.findUnique({
      where: { email },
      include: { authenticators: true },
    })

    if (!user || user.authenticators.length === 0) {
      return NextResponse.json(
        { error: 'No passkeys found for this user' },
        { status: 404 }
      )
    }

    // Generate authentication options
    const options = await generateAuthenticationOptionsForUser(
      user.authenticators.map((auth) => ({
        credentialID: auth.credentialID,
        transports: auth.transports || undefined,
      }))
    )

    return NextResponse.json({ options, userId: user.id })
  } catch (error) {
    console.error('WebAuthn authentication options error:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication options' },
      { status: 500 }
    )
  }
}
