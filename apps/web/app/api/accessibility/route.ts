import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Simulate fetching user accessibility settings
        const settings = {
            highContrast: false,
            largeText: false,
            reduceMotion: false,
            keyboardNavigation: true,
            screenReader: true,
            focusIndicators: true,
            textSize: 16,
            lineHeight: 1.5,
            colorBlindness: 'none'
        }

        return NextResponse.json({ settings })
    } catch (error) {
        console.error('Failed to fetch accessibility settings:', error)
        return NextResponse.json(
            { error: 'Failed to fetch accessibility settings' },
            { status: 500 }
        )
    }
}



export async function PUT(request: NextRequest) {
    try {
        const body = await request.json()
        const { settings } = body

        // Validate settings
        if (!settings || typeof settings !== 'object') {
            return NextResponse.json(
                { error: 'Invalid settings object' },
                { status: 400 }
            )
        }

        // Simulate updating accessibility settings
        const updatedSettings = {
            ...settings,
            updatedAt: new Date().toISOString()
        }

        return NextResponse.json({ settings: updatedSettings })
    } catch (error) {
        console.error('Failed to update accessibility settings:', error)
        return NextResponse.json(
            { error: 'Failed to update accessibility settings' },
            { status: 500 }
        )
    }
}



export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { action, settingId, value } = body

        // Validate action
        if (!action || !settingId) {
            return NextResponse.json(
                { error: 'Missing required fields: action and settingId' },
                { status: 400 }
            )
        }

        // Simulate toggling a specific setting
        const result = {
            action,
            settingId,
            value,
            timestamp: new Date().toISOString()
        }

        return NextResponse.json({ result })
    } catch (error) {
        console.error('Failed to update accessibility setting:', error)
        return NextResponse.json(
            { error: 'Failed to update accessibility setting' },
            { status: 500 }
        )
    }
}
