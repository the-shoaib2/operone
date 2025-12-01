import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { authConfig } from './auth.config'
import { prisma } from '../prisma'
import type { Adapter } from 'next-auth/adapters'
import Credentials from 'next-auth/providers/credentials'
import { verifyAuthenticationResponseForUser } from '../webauthn'

const nextAuth = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      id: 'webauthn',
      name: 'WebAuthn',
      credentials: {
        response: { label: 'Response', type: 'text' },
        challenge: { label: 'Challenge', type: 'text' },
      },
      async authorize(credentials) {
        const { response, challenge } = credentials as any
        
        if (!response || !challenge) {
          console.error('[WebAuthn] Missing credentials')
          return null
        }

        try {
          const responseJson = JSON.parse(response)
          const credentialID = responseJson.id

          if (!credentialID) {
            console.error('[WebAuthn] Missing credentialID in response')
            return null
          }

          // Find authenticator - select only needed fields for performance
          const authenticator = await prisma.authenticator.findUnique({
            where: { credentialID },
            select: {
              credentialID: true,
              credentialPublicKey: true,
              counter: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  image: true,
                }
              }
            },
          })

          if (!authenticator) {
            console.error('[WebAuthn] Authenticator not found for credentialID:', credentialID)
            return null
          }

          // Verify
          const verification = await verifyAuthenticationResponseForUser(
            responseJson,
            challenge,
            {
              credentialID: authenticator.credentialID,
              credentialPublicKey: authenticator.credentialPublicKey,
              counter: authenticator.counter,
            }
          )

          if (!verification.verified) {
            console.error('[WebAuthn] Verification failed for user:', authenticator.user.email)
            return null
          }

          // Update counter asynchronously (don't wait)
          prisma.authenticator.update({
            where: { credentialID },
            data: { counter: verification.authenticationInfo.newCounter },
          }).catch(err => console.error('[WebAuthn] Counter update failed:', err))

          return {
            id: authenticator.user.id,
            email: authenticator.user.email,
            name: authenticator.user.name,
            image: authenticator.user.image,
          }
        } catch (e) {
          console.error('[WebAuthn] Authorization error:', e)
          return null
        }
      }
    }),
  ],
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, account, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }

      // Add account provider info
      if (account) {
        token.provider = account.provider
      }

      // Handle token refresh
      if (trigger === 'update') {
        // You can update token data here if needed
      }

      return token
    },
    
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      if (!user.email) return

      try {
        const { headers } = await import('next/headers')
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   headersList.get('x-real-ip') || 
                   'Unknown IP'
        const userAgent = headersList.get('user-agent') || 'Unknown Device'
        
        // Detect platform
        const isElectron = userAgent.includes('Electron') || userAgent.includes('OperonDesktop')
        const platform = isElectron ? 'Operon Desktop App' : 'Web Browser'

        const { sendLoginNotification } = await import('../mail')
        
        await sendLoginNotification({
          email: user.email,
          name: user.name,
          time: new Date(),
          ip,
          userAgent,
          platform
        })

        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Sign in: ${user.email} (${account?.provider || 'unknown'}) - ${isNewUser ? 'New User' : 'Existing User'}`)
        }
      } catch (error) {
        console.error('Error sending login notification:', error)
      }
    },

    async signOut() {
      if (process.env.NODE_ENV === 'development') {
        console.log(`👋 Sign out event triggered`)
      }
    },

    async createUser({ user }) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`🆕 New user created: ${user.email}`)
      }
    },

    async updateUser({ user }) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`📝 User updated: ${user.email}`)
      }
    },

    async session({ session }) {
      // Track session activity
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 Session accessed: ${session.user?.email || 'Unknown'}`)
      }
    },
  },
})

export const handlers = nextAuth.handlers
export const signIn = nextAuth.signIn as any
export const signOut = nextAuth.signOut
export const auth = nextAuth.auth as any

