import { useState, useEffect } from 'react'
import { Button } from '@repo/ui'
import { Input } from '@repo/ui'
import { Card } from '@repo/ui'

export function SettingsPanel() {
    const [apiKey, setApiKey] = useState('')
    const [isSaved, setIsSaved] = useState(false)

    useEffect(() => {
        // Load settings
        window.electron?.getSettings().then((settings: any) => {
            if (settings.openaiApiKey) {
                setApiKey(settings.openaiApiKey)
            }
        })
    }, [])

    const handleSave = async () => {
        await window.electron?.updateSettings({ openaiApiKey: apiKey })
        setIsSaved(true)
        setTimeout(() => setIsSaved(false), 2000)
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage your AI configuration</p>
            </div>

            <Card className="p-6 space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium">OpenAI API Key</label>
                    <Input
                        type="password"
                        value={apiKey}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                    />
                    <p className="text-xs text-muted-foreground">
                        Your API key is stored locally and never shared.
                    </p>
                </div>
                <Button onClick={handleSave}>
                    {isSaved ? 'Saved!' : 'Save Changes'}
                </Button>
            </Card>
        </div>
    )
}
