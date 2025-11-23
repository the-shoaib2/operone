import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { authConfig } from './config'
import { prisma } from '../prisma'
import type { Adapter } from 'next-auth/adapters'

const nextAuth = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
      }
      return session
    },
  },
})

export const handlers = nextAuth.handlers
export const signIn = nextAuth.signIn as any
export const signOut = nextAuth.signOut
export const auth = nextAuth.auth as any
