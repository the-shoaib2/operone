/**
 * GitHub Releases Integration
 * Fetches latest release data from GitHub API
 */

export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: GitHubAsset[];
  body?: string;
}

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface ReleaseData {
  version: string;
  releaseDate: string;
  platforms: {
    windows?: PlatformRelease;
    mac?: PlatformRelease;
    linux?: PlatformRelease;
  };
  changelog?: string;
}

export interface PlatformRelease {
  url: string;
  size: string;
  fileName: string;
}

// Configuration
const GITHUB_API_BASE = 'https://api.github.com';
const REPO_OWNER = process.env.GITHUB_REPO_OWNER || 'operone';
const REPO_NAME = process.env.GITHUB_REPO_NAME || 'operone';
const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN;

// Cache configuration
const CACHE_TTL = parseInt(process.env.RELEASES_CACHE_TTL || '3600', 10) * 1000; // Convert to milliseconds
let cachedRelease: { data: ReleaseData; timestamp: number } | null = null;

/**
 * Format file size from bytes to human-readable format
 */
function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${Math.round(mb)} MB`;
}

/**
 * Format release date
 */
function formatReleaseDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Map GitHub assets to platform releases
 */
function mapAssetsToPlatforms(assets: GitHubAsset[]): ReleaseData['platforms'] {
  const platforms: ReleaseData['platforms'] = {};

  for (const asset of assets) {
    const name = asset.name.toLowerCase();

    // Windows (.exe)
    if (name.endsWith('.exe')) {
      platforms.windows = {
        url: asset.browser_download_url,
        size: formatFileSize(asset.size),
        fileName: asset.name,
      };
    }
    // macOS (.dmg)
    else if (name.endsWith('.dmg')) {
      platforms.mac = {
        url: asset.browser_download_url,
        size: formatFileSize(asset.size),
        fileName: asset.name,
      };
    }
    // Linux (.AppImage)
    else if (name.endsWith('.appimage')) {
      platforms.linux = {
        url: asset.browser_download_url,
        size: formatFileSize(asset.size),
        fileName: asset.name,
      };
    }
  }

  return platforms;
}

/**
 * Fetch latest release from GitHub API
 */
export async function fetchLatestRelease(): Promise<ReleaseData | null> {
  // Check cache first
  if (cachedRelease && Date.now() - cachedRelease.timestamp < CACHE_TTL) {
    console.log('Returning cached release data');
    return cachedRelease.data;
  }

  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Operone-Download-Page',
    };

    // Add token if available for higher rate limits
    if (GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }

    const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`;
    console.log('Fetching latest release from:', url);

    const response = await fetch(url, {
      headers,
      next: { revalidate: CACHE_TTL / 1000 }, // Next.js cache revalidation
    });

    if (!response.ok) {
      console.error('GitHub API error:', response.status, response.statusText);
      return null;
    }

    const release: GitHubRelease = await response.json();

    // Map release data
    const releaseData: ReleaseData = {
      version: release.tag_name.replace(/^v/, ''), // Remove 'v' prefix if present
      releaseDate: formatReleaseDate(release.published_at),
      platforms: mapAssetsToPlatforms(release.assets),
      changelog: release.body,
    };

    // Update cache
    cachedRelease = {
      data: releaseData,
      timestamp: Date.now(),
    };

    console.log('Successfully fetched and cached release data');
    return releaseData;
  } catch (error) {
    console.error('Error fetching GitHub release:', error);
    return null;
  }
}

/**
 * Get release data with fallback to static config
 */
export async function getReleaseData(staticConfig: ReleaseData): Promise<ReleaseData> {
  const githubRelease = await fetchLatestRelease();

  if (!githubRelease) {
    console.log('Using static config as fallback');
    return staticConfig;
  }

  // Merge GitHub data with static config (GitHub data takes precedence)
  return {
    version: githubRelease.version || staticConfig.version,
    releaseDate: githubRelease.releaseDate || staticConfig.releaseDate,
    platforms: {
      windows: githubRelease.platforms.windows || staticConfig.platforms.windows,
      mac: githubRelease.platforms.mac || staticConfig.platforms.mac,
      linux: githubRelease.platforms.linux || staticConfig.platforms.linux,
    },
    changelog: githubRelease.changelog,
  };
}

/**
 * Clear cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
  cachedRelease = null;
  console.log('Release cache cleared');
}
