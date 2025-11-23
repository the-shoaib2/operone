import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AuthSuccessPage({
    searchParams,
}: {
    searchParams: { token?: string }
}) {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    // If there's a token in the URL, redirect to the desktop app
    if (searchParams.token) {
        const deepLink = `operone://auth?token=${searchParams.token}`

        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <div className="text-center space-y-6 p-8">
                    <div className="text-6xl">✓</div>
                    <h1 className="text-3xl font-bold text-white">Authentication Successful!</h1>
                    <p className="text-gray-300">Redirecting to Operone Desktop App...</p>
                    <a
                        href={deepLink}
                        className="inline-block px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition"
                    >
                        Open Operone Desktop
                    </a>
                    <p className="text-sm text-gray-400">
                        If the app doesn't open automatically, click the button above
                    </p>
                </div>
            </div>
        )
    }

    // Otherwise, just redirect to dashboard
    redirect('/dashboard')
}
