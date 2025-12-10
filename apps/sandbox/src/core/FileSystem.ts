export class FileSystem {
  private files: Map<string, string>;

  constructor() {
    this.files = new Map();
    // Default files
    this.files.set('/home/readme.txt', 'Welcome to the simulation!');
  }

  writeFile(path: string, content: string) {
    this.files.set(path, content);
  }

  readFile(path: string): string | null {
    return this.files.get(path) || null;
  }

  deleteFile(path: string): boolean {
    return this.files.delete(path);
  }

  ls(path: string): string[] {
    // Simple filter for simulation
    const results: string[] = [];
    // If path is root '/', return all files
    if (path === '/') {
      return Array.from(this.files.keys());
    }

    // Check virtual directories
    for (const [filePath] of this.files) {
      if (filePath.startsWith(path)) {
        const relative = filePath.replace(path, '');
        const parts = relative.split('/').filter(Boolean);
        if (parts.length > 0) results.push(parts[0]);
      }
    }
    return [...new Set(results)]; // unique
  }
}
