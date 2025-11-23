import NextAuth from 'next-auth'
import type { NextMiddleware } from 'next/server'
import { authConfig } from './lib/auth/config'

const middleware = NextAuth(authConfig).auth as NextMiddleware

export default middleware

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
