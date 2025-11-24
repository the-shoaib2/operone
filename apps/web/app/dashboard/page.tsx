import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PasskeyIcon } from '@/components/icons/passkey'
import { ProfileCard } from '@/components/profile-card'
import { PasskeyManagement } from '@/components/passkey-management'
import { SessionManagement } from '@/components/session-management'
import { Monitor } from 'lucide-react'

export default async function DashboardPage() {
    const session = await auth()

    if (!session) {
        redirect('/login')
    }

    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <Card>
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl font-bold">
                            Welcome {session.user?.name}!
                        </CardTitle>
                        <CardDescription>
                            You are successfully authenticated
                        </CardDescription>
                    </CardHeader>
                </Card>

                <ProfileCard />

                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <PasskeyIcon />
                            <div>
                                <CardTitle className="text-xl font-bold">
                                    Passkeys
                                </CardTitle>
                                <CardDescription>
                                    Manage your passwordless authentication methods
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <PasskeyManagement />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-3">
                            <Monitor className="h-6 w-6" />
                            <div>
                                <CardTitle className="text-xl font-bold">
                                    Active Sessions
                                </CardTitle>
                                <CardDescription>
                                    View and manage your active login sessions
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <SessionManagement />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
