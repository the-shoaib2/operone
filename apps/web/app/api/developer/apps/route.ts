import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Simulate fetching OAuth apps
        const apps = [
            {
                id: '1',
                name: 'Operone Desktop',
                description: 'Desktop application for local development',
                clientId: 'desktop_app_123',
                callbackUrls: ['http://localhost:3000/callback'],
                status: 'active',
                createdAt: '2024-01-15T10:30:00Z',
                lastUsed: '2024-03-15T14:20:00Z',
                permissions: ['read:profile', 'read:repositories', 'write:webhooks']
            },
            {
                id: '2',
                name: 'CI/CD Integration',
                description: 'Continuous integration and deployment',
                clientId: 'cicd_app_456',
                callbackUrls: ['https://ci.example.com/callback'],
                status: 'active',
                createdAt: '2024-02-01T09:15:00Z',
                lastUsed: '2024-03-14T16:45:00Z',
                permissions: ['read:repositories', 'write:deployments', 'read:builds']
            },
            {
                id: '3',
                name: 'Mobile App',
                description: 'Mobile application for on-the-go access',
                clientId: 'mobile_app_789',
                callbackUrls: ['operone://callback'],
                status: 'inactive',
                createdAt: '2024-01-20T11:30:00Z',
                lastUsed: '2024-02-28T13:20:00Z',
                permissions: ['read:profile', 'read:notifications']
            }
        ]

        return NextResponse.json({ apps })
    } catch (error) {
        console.error('Failed to fetch OAuth apps:', error)
        return NextResponse.json(
            { error: 'Failed to fetch OAuth apps' },
            { status: 500 }
        )
    }
}



export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, callbackUrls, permissions, action } = body

        // Validate required fields
        if (!name || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: name and action' },
                { status: 400 }
            )
        }

        // Simulate OAuth app action
        let result
        switch (action) {
            case 'create':
                if (!callbackUrls || callbackUrls.length === 0) {
                    return NextResponse.json(
                        { error: 'At least one callback URL is required' },
                        { status: 400 }
                    )
                }
                result = {
                    id: Date.now().toString(),
                    name,
                    description: description || '',
                    clientId: `app_${Date.now()}`,
                    clientSecret: `secret_${Math.random().toString(36).substring(2, 15)}`,
                    callbackUrls,
                    permissions: permissions || ['read:profile'],
                    status: 'active',
                    createdAt: new Date().toISOString()
                }
                break
            case 'regenerate_secret':
                result = {
                    name,
                    newClientSecret: `secret_${Math.random().toString(36).substring(2, 15)}`,
                    regeneratedAt: new Date().toISOString()
                }
                break
            case 'revoke':
                result = {
                    name,
                    status: 'revoked',
                    revokedAt: new Date().toISOString()
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
        console.error('Failed to perform OAuth app action:', error)
        return NextResponse.json(
            { error: 'Failed to perform OAuth app action' },
            { status: 500 }
        )
    }
}
