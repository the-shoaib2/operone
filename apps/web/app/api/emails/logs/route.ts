import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter') || 'all'
        const limit = parseInt(searchParams.get('limit') || '50')

        // Simulate fetching email logs
        const logs = [
            {
                id: '1',
                to: 'user@example.com',
                subject: 'Welcome to our platform!',
                status: 'delivered',
                timestamp: '2024-03-15T10:30:00Z',
                templateId: 'welcome'
            },
            {
                id: '2',
                to: 'admin@example.com',
                subject: 'Reset your password',
                status: 'sent',
                timestamp: '2024-03-14T14:20:00Z',
                templateId: 'password-reset'
            },
            {
                id: '3',
                to: 'test@example.com',
                subject: 'Your monthly updates',
                status: 'failed',
                timestamp: '2024-03-13T09:15:00Z',
                templateId: 'newsletter'
            }
        ]

        const filteredLogs = filter === 'all' 
            ? logs 
            : logs.filter(log => log.status === filter)

        return NextResponse.json({ 
            logs: filteredLogs.slice(0, limit),
            total: filteredLogs.length
        })
    } catch (error) {
        console.error('Failed to fetch email logs:', error)
        return NextResponse.json(
            { error: 'Failed to fetch email logs' },
            { status: 500 }
        )
    }
}



export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { templateId, to, testMode = false } = body

        // Validate required fields
        if (!templateId || !to) {
            return NextResponse.json(
                { error: 'Missing required fields: templateId and to' },
                { status: 400 }
            )
        }

        // Simulate sending test email
        const log = {
            id: Date.now().toString(),
            to,
            subject: 'Test Email',
            status: testMode ? 'sent' : 'delivered',
            timestamp: new Date().toISOString(),
            templateId
        }

        return NextResponse.json({ log })
    } catch (error) {
        console.error('Failed to send test email:', error)
        return NextResponse.json(
            { error: 'Failed to send test email' },
            { status: 500 }
        )
    }
}
