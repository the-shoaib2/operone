'use client'

import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Button, Card, CardContent } from '@repo/ui'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { PasskeyIcon } from './icons/passkey'

export function PasskeyRegister() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()

    const handleRegister = async () => {
        setIsLoading(true)
        setError(null)

        try {
            // Get registration options from server
            const optionsResponse = await fetch('/api/webauthn/register/options', {
                method: 'POST',
            })

            if (!optionsResponse.ok) {
                throw new Error('Failed to get registration options')
            }

            const { options } = await optionsResponse.json()

            // Start registration with the browser
            const registrationResponse = await startRegistration(options)

            // Verify registration with server
            const verificationResponse = await fetch('/api/webauthn/register/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    response: registrationResponse,
                    challenge: options.challenge,
                }),
            })

            if (!verificationResponse.ok) {
                throw new Error('Failed to verify registration')
            }

            const { verified } = await verificationResponse.json()

            if (verified) {
                setSuccess(true)
                setTimeout(() => {
                    router.refresh()
                }, 1500)
            } else {
                throw new Error('Registration verification failed')
            }
        } catch (err) {
            console.error('Passkey registration error:', err)
            setError(err instanceof Error ? err.message : 'Failed to register passkey')
        } finally {
            setIsLoading(false)
        }
    }

    if (success) {
        return (
            <Card className="w-full">
                <CardContent className="p-6 text-center space-y-4">
                    <div className="flex justify-center">
                        <Image
                            src="/logo/passkey.svg"
                            alt="Success"
                            width={48}
                            height={48}
                            className="text-green-600"
                        />
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-400">
                        Passkey registered successfully!
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full">
            <CardContent className="p-6 space-y-4">
                <Button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-full"
                    size="lg"
                    variant="default"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Registering...
                        </>
                    ) : (
                        <>
                            <PasskeyIcon width={40} height={40} className="mr-2" />
                            Register Passkey
                        </>
                    )}
                </Button>
                {error && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
            </CardContent>
        </Card>
    )
}
