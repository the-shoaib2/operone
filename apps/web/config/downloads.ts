
export const DOWNLOAD_CONFIG = {
  version: "1.0.0",
  releaseDate: "November 29, 2025",
  platforms: {
    windows: {
      name: "Windows",
      description: "Windows 10 & 11 (64-bit)",
      fileName: "Operone-Setup-1.0.0.exe",
      url: "https://github.com/operone/operone/releases/download/v1.0.0/Operone-Setup-1.0.0.exe", // Placeholder
      size: "125 MB",
      features: ["Windows 10/11 support", "Auto-updates", "System tray integration"],
    },
    mac: {
      name: "macOS",
      description: "macOS 12.0+ (Universal)",
      fileName: "Operone-1.0.0-universal.dmg",
      url: "https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0-universal.dmg", // Placeholder
      size: "98 MB",
      features: ["Apple Silicon & Intel", "Notarized by Apple", "Menu bar integration"],
    },
    linux: {
      name: "Linux",
      description: "AppImage (Universal)",
      fileName: "Operone-1.0.0.AppImage",
      url: "https://github.com/operone/operone/releases/download/v1.0.0/Operone-1.0.0.AppImage", // Placeholder
      size: "112 MB",
      features: ["AppImage support", "Package manager", "System integration"],
    },
  },
} as const;

export type PlatformKey = keyof typeof DOWNLOAD_CONFIG.platforms;
