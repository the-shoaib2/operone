import { PeerConnectionManager, PeerMessage } from './connect';
import { EventEmitter } from 'events';
import { createReadStream, createWriteStream, stat } from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';

/**
 * File Synchronization
 * 
 * Synchronizes files between peer machines with conflict resolution.
 */

export interface SyncOptions {
  source: string;
  destination: string;
  recursive?: boolean;
  deleteExtra?: boolean;
  checksum?: boolean;
  conflictResolution?: 'newer' | 'larger' | 'ask' | 'skip';
}

export interface FileMetadata {
  path: string;
  size: number;
  mtime: number;
  checksum?: string;
  isDirectory: boolean;
}

export interface SyncProgress {
  totalFiles: number;
  completedFiles: number;
  totalBytes: number;
  transferredBytes: number;
  currentFile: string;
  speed: number; // bytes per second
}

export interface SyncResult {
  success: boolean;
  filesTransferred: number;
  bytesTransferred: number;
  errors: string[];
  duration: number;
}

export class FileSynchronizer extends EventEmitter {
  private connectionManager: PeerConnectionManager;
  private activeSyncs: Map<string, SyncProgress>;

  constructor(connectionManager: PeerConnectionManager) {
    super();
    this.connectionManager = connectionManager;
    this.activeSyncs = new Map();

    // Listen for file transfer messages
    this.connectionManager.on('message', (message: PeerMessage) => {
      if (message.type === 'file') {
        this.handleFileMessage(message);
      }
    });
  }

  /**
   * Synchronizes files to a remote peer
   */
  async syncToRemote(
    peerId: string,
    options: SyncOptions
  ): Promise<SyncResult> {
    if (!this.connectionManager.isConnected(peerId)) {
      throw new Error(`Not connected to peer: ${peerId}`);
    }

    const startTime = Date.now();
    const syncId = this.generateSyncId();
    const errors: string[] = [];
    let filesTransferred = 0;
    let bytesTransferred = 0;

    try {
      // Get file list
      const files = await this.getFileList(options.source, options.recursive);
      
      // Initialize progress
      const progress: SyncProgress = {
        totalFiles: files.length,
        completedFiles: 0,
        totalBytes: files.reduce((sum, f) => sum + f.size, 0),
        transferredBytes: 0,
        currentFile: '',
        speed: 0,
      };
      this.activeSyncs.set(syncId, progress);

      // Transfer each file
      for (const file of files) {
        try {
          progress.currentFile = file.path;
          this.emit('progress', progress);

          await this.transferFile(peerId, file, options.destination);
          
          filesTransferred++;
          bytesTransferred += file.size;
          progress.completedFiles++;
          progress.transferredBytes += file.size;
          
          // Calculate speed
          const elapsed = (Date.now() - startTime) / 1000;
          progress.speed = bytesTransferred / elapsed;
          
          this.emit('progress', progress);
        } catch (error) {
          errors.push(`Failed to transfer ${file.path}: ${error}`);
        }
      }

      return {
        success: errors.length === 0,
        filesTransferred,
        bytesTransferred,
        errors,
        duration: Date.now() - startTime,
      };
    } finally {
      this.activeSyncs.delete(syncId);
    }
  }

  /**
   * Synchronizes files from a remote peer
   */
  async syncFromRemote(
    peerId: string,
    options: SyncOptions
  ): Promise<SyncResult> {
    // Request file list from remote
    const remoteFiles = await this.requestFileList(peerId, options.source);
    
    // Download files
    return this.downloadFiles(peerId, remoteFiles, options.destination);
  }

  /**
   * Bidirectional sync with conflict resolution
   */
  async bidirectionalSync(
    peerId: string,
    localPath: string,
    remotePath: string,
    conflictResolution: 'newer' | 'larger' | 'ask' = 'newer'
  ): Promise<SyncResult> {
    // Get both file lists
    const localFiles = await this.getFileList(localPath, true);
    const remoteFiles = await this.requestFileList(peerId, remotePath);

    // Compare and resolve conflicts
    const { toUpload, toDownload } = await this.resolveConflicts(
      localFiles,
      remoteFiles,
      conflictResolution
    );

    // Perform sync
    const uploadResult = await this.uploadFiles(peerId, toUpload, remotePath);
    const downloadResult = await this.downloadFiles(peerId, toDownload, localPath);

    return {
      success: uploadResult.success && downloadResult.success,
      filesTransferred: uploadResult.filesTransferred + downloadResult.filesTransferred,
      bytesTransferred: uploadResult.bytesTransferred + downloadResult.bytesTransferred,
      errors: [...uploadResult.errors, ...downloadResult.errors],
      duration: uploadResult.duration + downloadResult.duration,
    };
  }

  /**
   * Gets list of files in a directory
   */
  private async getFileList(
    path: string,
    recursive: boolean = false
  ): Promise<FileMetadata[]> {
    const fs = require('fs').promises;
    const files: FileMetadata[] = [];

    async function scan(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const stats = await fs.stat(fullPath);

        if (entry.isDirectory()) {
          if (recursive) {
            await scan(fullPath);
          }
        } else {
          files.push({
            path: fullPath,
            size: stats.size,
            mtime: stats.mtimeMs,
            isDirectory: false,
          });
        }
      }
    }

    await scan(path);
    return files;
  }

  /**
   * Transfers a file to a remote peer
   */
  private async transferFile(
    peerId: string,
    file: FileMetadata,
    destinationPath: string
  ): Promise<void> {
    const fs = require('fs').promises;
    const content = await fs.readFile(file.path);
    
    const message: PeerMessage = {
      type: 'file',
      from: this.connectionManager.getLocalPeerInfo().id,
      to: peerId,
      payload: {
        action: 'transfer',
        path: join(destinationPath, basename(file.path)),
        content: content.toString('base64'),
        metadata: file,
      },
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    await this.connectionManager.sendMessage(peerId, message);
  }

  /**
   * Requests file list from remote peer
   */
  private async requestFileList(
    peerId: string,
    path: string
  ): Promise<FileMetadata[]> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      
      const message: PeerMessage = {
        type: 'file',
        from: this.connectionManager.getLocalPeerInfo().id,
        to: peerId,
        payload: {
          action: 'list',
          path,
        },
        timestamp: Date.now(),
        id: messageId,
      };

      const responseHandler = (msg: PeerMessage) => {
        if (msg.id === messageId && msg.type === 'response') {
          this.connectionManager.off('message', responseHandler);
          resolve(msg.payload.files);
        }
      };

      this.connectionManager.on('message', responseHandler);
      this.connectionManager.sendMessage(peerId, message).catch(reject);

      setTimeout(() => {
        this.connectionManager.off('message', responseHandler);
        reject(new Error('Request timeout'));
      }, 30000);
    });
  }

  /**
   * Resolves conflicts between local and remote files
   */
  private async resolveConflicts(
    localFiles: FileMetadata[],
    remoteFiles: FileMetadata[],
    strategy: 'newer' | 'larger' | 'ask'
  ): Promise<{ toUpload: FileMetadata[]; toDownload: FileMetadata[] }> {
    const toUpload: FileMetadata[] = [];
    const toDownload: FileMetadata[] = [];

    const remoteMap = new Map(remoteFiles.map(f => [basename(f.path), f]));

    for (const localFile of localFiles) {
      const fileName = basename(localFile.path);
      const remoteFile = remoteMap.get(fileName);

      if (!remoteFile) {
        // File only exists locally
        toUpload.push(localFile);
      } else {
        // File exists in both - resolve conflict
        if (strategy === 'newer') {
          if (localFile.mtime > remoteFile.mtime) {
            toUpload.push(localFile);
          } else if (remoteFile.mtime > localFile.mtime) {
            toDownload.push(remoteFile);
          }
        } else if (strategy === 'larger') {
          if (localFile.size > remoteFile.size) {
            toUpload.push(localFile);
          } else if (remoteFile.size > localFile.size) {
            toDownload.push(remoteFile);
          }
        }
        remoteMap.delete(fileName);
      }
    }

    // Remaining remote files don't exist locally
    toDownload.push(...Array.from(remoteMap.values()));

    return { toUpload, toDownload };
  }

  /**
   * Uploads multiple files
   */
  private async uploadFiles(
    peerId: string,
    files: FileMetadata[],
    remotePath: string
  ): Promise<SyncResult> {
    return this.syncToRemote(peerId, {
      source: '', // Not used in this context
      destination: remotePath,
    });
  }

  /**
   * Downloads multiple files
   */
  private async downloadFiles(
    peerId: string,
    files: FileMetadata[],
    localPath: string
  ): Promise<SyncResult> {
    const errors: string[] = [];
    let filesTransferred = 0;
    let bytesTransferred = 0;
    const startTime = Date.now();

    for (const file of files) {
      try {
        await this.downloadFile(peerId, file, localPath);
        filesTransferred++;
        bytesTransferred += file.size;
      } catch (error) {
        errors.push(`Failed to download ${file.path}: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      filesTransferred,
      bytesTransferred,
      errors,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Downloads a single file
   */
  private async downloadFile(
    peerId: string,
    file: FileMetadata,
    localPath: string
  ): Promise<void> {
    // Request file content
    const message: PeerMessage = {
      type: 'file',
      from: this.connectionManager.getLocalPeerInfo().id,
      to: peerId,
      payload: {
        action: 'download',
        path: file.path,
      },
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    await this.connectionManager.sendMessage(peerId, message);
  }

  /**
   * Handles file messages
   */
  private handleFileMessage(message: PeerMessage): void {
    const { action, path, content } = message.payload;

    if (action === 'transfer') {
      // Save received file
      const fs = require('fs');
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(path, buffer);
      this.emit('file-received', { path, size: buffer.length });
    }
  }

  /**
   * Generates sync ID
   */
  private generateSyncId(): string {
    return `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generates message ID
   */
  private generateMessageId(): string {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets active sync progress
   */
  getSyncProgress(syncId: string): SyncProgress | undefined {
    return this.activeSyncs.get(syncId);
  }
}

// Export factory
export function createFileSynchronizer(
  connectionManager: PeerConnectionManager
): FileSynchronizer {
  return new FileSynchronizer(connectionManager);
}
