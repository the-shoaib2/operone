import { useAuth } from './auth-context'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Loader2 } from 'lucide-react'

export function LoginScreen() {
    const { login, isLoading } = useAuth()

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Card className="w-full max-w-sm mx-4 bg-transparent border-none shadow-none">
                <CardContent className="flex flex-col items-center space-y-6 pt-6">
                    {/* App Icon */}
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <svg
                            className="w-12 h-12 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>

                    {/* App Name */}
                    <h1 className="text-3xl font-bold">Operone</h1>

                    {/* Login Button */}
                    <Button
                        onClick={login}
                        disabled={isLoading}
                        size="lg"
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Opening browser...
                            </>
                        ) : (
                            'Login'
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
