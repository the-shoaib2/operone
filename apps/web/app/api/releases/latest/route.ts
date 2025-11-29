import { NextResponse } from 'next/server';
import { fetchLatestRelease } from '@/lib/github-releases';

export const runtime = 'edge'; // Use Edge Runtime for better performance
export const revalidate = 3600; // Revalidate every hour

/**
 * GET /api/releases/latest
 * Fetches the latest release data from GitHub
 */
export async function GET() {
  try {
    const release = await fetchLatestRelease();

    if (!release) {
      return NextResponse.json(
        { error: 'Failed to fetch release data' },
        { status: 500 }
      );
    }

    return NextResponse.json(release, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error in /api/releases/latest:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
