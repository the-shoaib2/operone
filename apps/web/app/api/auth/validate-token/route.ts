import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { tokenStore } from '@/app/auth-success/page'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Get token data
    const tokenData = tokenStore.get(token)

    if (!tokenData) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Check if token is expired
    if (tokenData.expiresAt < Date.now()) {
      tokenStore.delete(token)
      return NextResponse.json({ error: 'Token has expired' }, { status: 401 })
    }

    // Get user from session (the token was created during an authenticated session)
    const session = await auth()
    
    if (!session || !session.user) {
      tokenStore.delete(token)
      return NextResponse.json({ error: 'Session not found' }, { status: 401 })
    }

    // Verify the token belongs to this user
    if (session.user.id !== tokenData.userId) {
      tokenStore.delete(token)
      return NextResponse.json({ error: 'Token mismatch' }, { status: 401 })
    }

    // Delete token (single-use)
    tokenStore.delete(token)

    // Return user data
    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
    })
  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate token' },
      { status: 500 }
    )
  }
}
