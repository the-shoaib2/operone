import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Simulate fetching AI providers
        const providers = [
            {
                id: 'openai',
                name: 'OpenAI',
                description: 'GPT-4, GPT-3.5 Turbo, and other OpenAI models',
                status: 'connected',
                models: ['gpt-4', 'gpt-3.5-turbo', 'text-davinci-003'],
                apiKey: 'sk-...key',
                lastUsed: '2024-03-15T10:30:00Z'
            },
            {
                id: 'anthropic',
                name: 'Anthropic',
                description: 'Claude models for conversational AI',
                status: 'disconnected',
                models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
                apiKey: null,
                lastUsed: null
            },
            {
                id: 'google',
                name: 'Google AI',
                description: 'Gemini and other Google AI models',
                status: 'connected',
                models: ['gemini-pro', 'gemini-pro-vision'],
                apiKey: 'AI...key',
                lastUsed: '2024-03-14T14:20:00Z'
            }
        ]

        return NextResponse.json({ providers })
    } catch (error) {
        console.error('Failed to fetch AI providers:', error)
        return NextResponse.json(
            { error: 'Failed to fetch AI providers' },
            { status: 500 }
        )
    }
}



export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { providerId, apiKey, action } = body

        // Validate required fields
        if (!providerId || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: providerId and action' },
                { status: 400 }
            )
        }

        // Simulate provider action (connect/disconnect/test)
        let result
        switch (action) {
            case 'connect':
                if (!apiKey) {
                    return NextResponse.json(
                        { error: 'API key required for connection' },
                        { status: 400 }
                    )
                }
                result = {
                    providerId,
                    status: 'connected',
                    apiKey: apiKey.substring(0, 8) + '...',
                    connectedAt: new Date().toISOString()
                }
                break
            case 'disconnect':
                result = {
                    providerId,
                    status: 'disconnected',
                    apiKey: null,
                    disconnectedAt: new Date().toISOString()
                }
                break
            case 'test':
                result = {
                    providerId,
                    testResult: 'success',
                    responseTime: '245ms',
                    testedAt: new Date().toISOString()
                }
                break
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                )
        }

        return NextResponse.json({ result })
    } catch (error) {
        console.error('Failed to perform AI provider action:', error)
        return NextResponse.json(
            { error: 'Failed to perform AI provider action' },
            { status: 500 }
        )
    }
}
