import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PasskeyRegister } from '@/components/passkey-register'
import { prisma } from '@/lib/prisma'

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    // Get user's passkeys
    const user = await prisma.user.findUnique({
        where: { email: session.user?.email! },
        include: { authenticators: true },
    })

    const passkeyCount = user?.authenticators.length || 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card className="backdrop-blur-sm bg-white/10 border-white/20">
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold text-white">
                            Welcome, {session.user?.name || 'User'}!
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                            You are successfully authenticated
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center space-x-4">
                            {session.user?.image && (
                                <img
                                    src={session.user.image}
                                    alt={session.user.name || 'User'}
                                    className="w-16 h-16 rounded-full border-2 border-white/20"
                                />
                            )}
                            <div className="text-white">
                                <p className="font-semibold">{session.user?.name}</p>
                                <p className="text-sm text-gray-300">{session.user?.email}</p>
                            </div>
                        </div>

                        <form
                            action={async () => {
                                'use server'
                                await signOut({ redirectTo: '/login' })
                            }}
                        >
                            <Button
                                type="submit"
                                variant="destructive"
                                className="mt-4"
                            >
                                Sign Out
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="backdrop-blur-sm bg-white/10 border-white/20">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-white">
                            Passkey
                        </CardTitle>
                        <CardDescription className="text-gray-300">
                            {passkeyCount > 0
                                ? `You have ${passkeyCount} passkey${passkeyCount > 1 ? 's' : ''} registered`
                                : 'Register a passkey for passwordless authentication'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PasskeyRegister />
                    </CardContent>
                </Card>

                <Card className="backdrop-blur-sm bg-white/10 border-white/20">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-white">
                            Session Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="text-xs text-gray-300 overflow-auto p-4 bg-black/20 rounded">
                            {JSON.stringify(session, null, 2)}
                        </pre>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
