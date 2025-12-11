import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'


// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await auth()
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({ session })
}
