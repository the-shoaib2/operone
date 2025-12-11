import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Simulate fetching email templates
        const templates = [
            {
                id: 'welcome',
                name: 'Welcome Email',
                subject: 'Welcome to our platform!',
                category: 'Onboarding',
                enabled: true,
                lastUsed: '2024-03-15T10:30:00Z'
            },
            {
                id: 'password-reset',
                name: 'Password Reset',
                subject: 'Reset your password',
                category: 'Security',
                enabled: true,
                lastUsed: '2024-03-14T14:20:00Z'
            },
            {
                id: 'newsletter',
                name: 'Monthly Newsletter',
                subject: 'Your monthly updates',
                category: 'Marketing',
                enabled: false
            }
        ]

        return NextResponse.json({ templates })
    } catch (error) {
        console.error('Failed to fetch email templates:', error)
        return NextResponse.json(
            { error: 'Failed to fetch email templates' },
            { status: 500 }
        )
    }
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, subject, category, content } = body

        // Validate required fields
        if (!name || !subject || !category || !content) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        // Simulate creating email template
        const newTemplate = {
            id: Date.now().toString(),
            name,
            subject,
            category,
            enabled: true,
            createdAt: new Date().toISOString()
        }

        return NextResponse.json({ template: newTemplate })
    } catch (error) {
        console.error('Failed to create email template:', error)
        return NextResponse.json(
            { error: 'Failed to create email template' },
            { status: 500 }
        )
    }
}
