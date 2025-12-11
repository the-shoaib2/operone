import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Simulate fetching repositories
        const repositories = [
            {
                id: '1',
                name: 'operone',
                description: 'Main application repository',
                url: 'https://github.com/user/operone',
                private: false,
                language: 'TypeScript',
                size: '245 MB',
                lastCommit: '2024-03-15T10:30:00Z',
                status: 'active',
                branches: ['main', 'develop', 'feature/auth'],
                contributors: 5
            },
            {
                id: '2',
                name: 'operone-docs',
                description: 'Documentation repository',
                url: 'https://github.com/user/operone-docs',
                private: false,
                language: 'Markdown',
                size: '12 MB',
                lastCommit: '2024-03-14T14:20:00Z',
                status: 'active',
                branches: ['main'],
                contributors: 2
            },
            {
                id: '3',
                name: 'operone-config',
                description: 'Configuration and deployment files',
                url: 'https://github.com/user/operone-config',
                private: true,
                language: 'YAML',
                size: '8 MB',
                lastCommit: '2024-03-13T09:15:00Z',
                status: 'archived',
                branches: ['main'],
                contributors: 1
            }
        ]

        return NextResponse.json({ repositories })
    } catch (error) {
        console.error('Failed to fetch repositories:', error)
        return NextResponse.json(
            { error: 'Failed to fetch repositories' },
            { status: 500 }
        )
    }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, description, url, private: isPrivate, action } = body

        // Validate required fields
        if (!name || !action) {
            return NextResponse.json(
                { error: 'Missing required fields: name and action' },
                { status: 400 }
            )
        }

        // Simulate repository action
        let result
        switch (action) {
            case 'add':
                if (!url) {
                    return NextResponse.json(
                        { error: 'Repository URL required' },
                        { status: 400 }
                    )
                }
                result = {
                    id: Date.now().toString(),
                    name,
                    description: description || '',
                    url,
                    private: isPrivate || false,
                    status: 'active',
                    addedAt: new Date().toISOString()
                }
                break
            case 'sync':
                result = {
                    name,
                    syncResult: 'success',
                    lastSync: new Date().toISOString(),
                    changesFound: 3
                }
                break
            case 'archive':
                result = {
                    name,
                    status: 'archived',
                    archivedAt: new Date().toISOString()
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
        console.error('Failed to perform repository action:', error)
        return NextResponse.json(
            { error: 'Failed to perform repository action' },
            { status: 500 }
        )
    }
}
