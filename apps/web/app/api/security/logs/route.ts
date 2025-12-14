import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const filter = searchParams.get('filter') || 'all'
        const severity = searchParams.get('severity') || 'all'
        const search = searchParams.get('search') || ''
        const limit = parseInt(searchParams.get('limit') || '50')

        // Simulate fetching security logs
        const logs = [
            {
                id: '1',
                type: 'login',
                description: 'Successful login from Chrome on MacBook Pro',
                timestamp: '2024-03-15T10:30:00Z',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                location: 'San Francisco, CA',
                severity: 'low'
            },
            {
                id: '2',
                type: 'failed_login',
                description: 'Failed login attempt - incorrect password',
                timestamp: '2024-03-15T09:15:00Z',
                ipAddress: '192.168.1.101',
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                location: 'New York, NY',
                severity: 'medium'
            },
            {
                id: '3',
                type: '2fa_enabled',
                description: 'Two-factor authentication enabled',
                timestamp: '2024-03-14T14:20:00Z',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                location: 'San Francisco, CA',
                severity: 'low'
            },
            {
                id: '4',
                type: 'password_change',
                description: 'Password changed successfully',
                timestamp: '2024-03-13T16:45:00Z',
                ipAddress: '192.168.1.100',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                location: 'San Francisco, CA',
                severity: 'medium'
            },
            {
                id: '5',
                type: 'api_access',
                description: 'API key used for repository access',
                timestamp: '2024-03-12T11:30:00Z',
                ipAddress: '10.0.0.50',
                userAgent: 'curl/7.68.0',
                location: 'AWS Server',
                severity: 'low'
            },
            {
                id: '6',
                type: 'suspicious',
                description: 'Multiple failed login attempts from unusual location',
                timestamp: '2024-03-11T03:45:00Z',
                ipAddress: '203.0.113.1',
                userAgent: 'Mozilla/5.0 (compatible; bot)',
                location: 'Unknown',
                severity: 'high'
            }
        ]

        // Apply filters
        let filteredLogs = logs

        if (search) {
            filteredLogs = filteredLogs.filter(log => 
                log.description.toLowerCase().includes(search.toLowerCase())
            )
        }

        if (filter !== 'all') {
            switch (filter) {
                case 'login':
                    filteredLogs = filteredLogs.filter(log => 
                        ['login', 'logout', 'failed_login'].includes(log.type)
                    )
                    break
                case 'security':
                    filteredLogs = filteredLogs.filter(log => 
                        ['password_change', '2fa_enabled', '2fa_disabled', 'suspicious'].includes(log.type)
                    )
                    break
                case 'api':
                    filteredLogs = filteredLogs.filter(log => log.type === 'api_access')
                    break
                case 'suspicious':
                    filteredLogs = filteredLogs.filter(log => 
                        log.type === 'suspicious' || log.severity === 'high'
                    )
                    break
            }
        }

        if (severity !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.severity === severity)
        }

        return NextResponse.json({ 
            logs: filteredLogs.slice(0, limit),
            total: filteredLogs.length
        })
    } catch (error) {
        console.error('Failed to fetch security logs:', error)
        return NextResponse.json(
            { error: 'Failed to fetch security logs' },
            { status: 500 }
        )
    }
}



export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { type, description, ipAddress, userAgent, location, severity } = body

        // Validate required fields
        if (!type || !description) {
            return NextResponse.json(
                { error: 'Missing required fields: type and description' },
                { status: 400 }
            )
        }

        // Simulate creating a new security log entry
        const newLog = {
            id: Date.now().toString(),
            type,
            description,
            timestamp: new Date().toISOString(),
            ipAddress: ipAddress || 'unknown',
            userAgent: userAgent || 'unknown',
            location: location || 'unknown',
            severity: severity || 'low'
        }

        return NextResponse.json({ log: newLog })
    } catch (error) {
        console.error('Failed to create security log entry:', error)
        return NextResponse.json(
            { error: 'Failed to create security log entry' },
            { status: 500 }
        )
    }
}
