import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Image from 'next/image'

// In-memory token store (shared with validate-token API)
const tokenStore = new Map<string, { userId: string; expiresAt: number }>()

function generateToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function storeTokenForUser(userId: string): string {
    const token = generateToken()
    const expiresAt = Date.now() + 5 * 60 * 1000 // 5 minutes
    tokenStore.set(token, { userId, expiresAt })

    // Clean up expired tokens
    for (const [key, value] of tokenStore.entries()) {
        if (value.expiresAt < Date.now()) {
            tokenStore.delete(key)
        }
    }

    return token
}

// Export token store for use in API route
export { tokenStore }

export default async function AuthSuccessPage({
    searchParams,
}: {
    searchParams: { token?: string; from?: string }
}) {
    const session = await auth()

    if (!session || !session.user) {
        redirect('/login')
    }

    // If coming from desktop login or has token
    if (searchParams.token || searchParams.from === 'desktop') {
        // Generate a secure token for the desktop app
        const token = storeTokenForUser(session.user.id!)
        const deepLink = `operone://auth?token=${token}`

        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-center space-y-6 p-8">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto">
                        <svg
                            className="w-10 h-10 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white">Authentication Successful!</h1>
                    <p className="text-gray-300">Redirecting to Operone Desktop App...</p>
                    <a
                        href={deepLink}
                        className="inline-block px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition"
                    >
                        Open Operone Desktop
                    </a>
                    <p className="text-sm text-gray-400">
                        If the app doesn&apos;t open automatically, click the button above
                    </p>
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `
                                // Auto-redirect after 2 seconds
                                setTimeout(() => {
                                    window.location.href = '${deepLink}';
                                }, 2000);
                            `,
                        }}
                    />
                </div>
            </div>
        )
    }

    // Otherwise, just redirect to dashboard
    redirect('/dashboard')
}
