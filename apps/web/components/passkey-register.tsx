'use client'

import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

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
            <div className="text-center space-y-2">
                <div className="text-4xl">✓</div>
                <p className="text-sm text-green-600 dark:text-green-400">
                    Passkey registered successfully!
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <Button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full"
                variant="outline"
            >
                {isLoading ? 'Registering...' : 'Register Passkey'}
            </Button>
            {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    )
}
