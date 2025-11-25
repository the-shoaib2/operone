import { useAuth } from '../../contexts/auth-context'
import { Button, Card, CardContent } from '@repo/ui'
import { Loader2, Shield } from 'lucide-react'
import faviconUrl from '../../assets/favicon.ico'

export function LoginScreen() {
    const { login, isLoading } = useAuth()

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Card className="w-full max-w-sm mx-4 bg-transparent border-none shadow-none">
                <CardContent className="flex flex-col items-center space-y-6 pt-6">
                    {/* App Icon */}
                        <img
                            src={faviconUrl}
                            alt="Operone"
                            className="w-20 h-20"
                        />

                    {/* App Name */}
                    <h1 className="text-3xl font-bold">Operone</h1>

                    {/* Login Button */}
                    <Button
                        onClick={login}
                        disabled={isLoading}
                        size="lg"
                        className="w-full"
                        variant="default"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Opening browser...
                            </>
                        ) : (
                            'Login with Operone'
                        )}
                    </Button>
                    
                    {/* Loading State Message */}
                    {isLoading && (
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Opening your browser...
                            </p>
                            <p className="text-xs text-muted-foreground">
                                You'll be redirected back automatically after login
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
