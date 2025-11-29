// GitHub repository configuration
export const GITHUB_CONFIG = {
  owner: process.env.NEXT_PUBLIC_GITHUB_REPO_OWNER || "operone",
  repo: process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || "operone",
} as const;

// Static download configuration (used as fallback)
export const DOWNLOAD_CONFIG = {
  version: "1.0.0",
  releaseDate: "November 29, 2025",
  platforms: {
    windows: {
      name: "Windows",
      description: "Windows 10 & 11 (64-bit)",
      fileName: "Operone-Setup-1.0.0.exe",
      url: "https://github.com/operone/operone/releases/download/v1.0.0/Operone-Setup-1.0.0.exe",
      size: "125 MB",
      features: ["Windows 10/11 support", "Auto-updates", "System tray integration"],
    },
    mac: {
      name: "macOS",
      description: "macOS 12.0+ (Universal)",
      fileName: "Operone-1.0.0-universal.dmg",
      url: "https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0-universal.dmg",
      size: "98 MB",
      features: ["Apple Silicon & Intel", "Notarized by Apple", "Menu bar integration"],
    },
    linux: {
      name: "Linux",
      description: "AppImage (Universal)",
      fileName: "Operone-1.0.0.AppImage",
      url: "https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0.AppImage",
      size: "112 MB",
      features: ["AppImage support", "Package manager", "System integration"],
    },
  },
} as const;

export type PlatformKey = keyof typeof DOWNLOAD_CONFIG.platforms;

export interface DynamicPlatformData {
  url?: string;
  size?: string;
  fileName?: string;
}

export interface DynamicReleaseData {
  version?: string;
  releaseDate?: string;
  platforms?: {
    windows?: DynamicPlatformData;
    mac?: DynamicPlatformData;
    linux?: DynamicPlatformData;
  };
  changelog?: string;
}

/**
 * Merge static config with dynamic release data from GitHub
 */
export function mergeReleaseData(dynamicData?: DynamicReleaseData) {
  if (!dynamicData) {
    return DOWNLOAD_CONFIG;
  }

  return {
    version: dynamicData.version || DOWNLOAD_CONFIG.version,
    releaseDate: dynamicData.releaseDate || DOWNLOAD_CONFIG.releaseDate,
    changelog: dynamicData.changelog,
    platforms: {
      windows: {
        ...DOWNLOAD_CONFIG.platforms.windows,
        ...dynamicData.platforms?.windows,
      },
      mac: {
        ...DOWNLOAD_CONFIG.platforms.mac,
        ...dynamicData.platforms?.mac,
      },
      linux: {
        ...DOWNLOAD_CONFIG.platforms.linux,
        ...dynamicData.platforms?.linux,
      },
    },
  };
}
