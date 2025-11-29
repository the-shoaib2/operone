import { PeerConnectionManager } from './connect';

/**
 * Peer Information Fetcher
 * 
 * Retrieves system information from remote peers.
 */

export interface SystemInfo {
  platform: string;
  arch: string;
  hostname: string;
  cpus: number;
  totalMemory: number;
  freeMemory: number;
  uptime: number;
  nodeVersion: string;
  operoneVersion: string;
}

export interface NetworkInfo {
  interfaces: Array<{
    name: string;
    address: string;
    netmask: string;
    family: string;
    mac: string;
  }>;
}

export interface ProcessInfo {
  pid: number;
  ppid: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    user: number;
    system: number;
  };
}

export interface PeerSystemInfo {
  system: SystemInfo;
  network: NetworkInfo;
  process: ProcessInfo;
  timestamp: number;
}

export class PeerInfoFetcher {
  private connectionManager: PeerConnectionManager;
  private cache: Map<string, { info: PeerSystemInfo; expiry: number }>;
  private cacheDuration: number;

  constructor(
    connectionManager: PeerConnectionManager,
    cacheDuration: number = 60000 // 1 minute default
  ) {
    this.connectionManager = connectionManager;
    this.cache = new Map();
    this.cacheDuration = cacheDuration;
  }

  /**
   * Fetches system information from a peer
   */
  async fetchSystemInfo(peerId: string, useCache: boolean = true): Promise<PeerSystemInfo> {
    // Check cache first
    if (useCache) {
      const cached = this.cache.get(peerId);
      if (cached && cached.expiry > Date.now()) {
        return cached.info;
      }
    }

    if (!this.connectionManager.isConnected(peerId)) {
      throw new Error(`Not connected to peer: ${peerId}`);
    }

    // Request system info
    const response = await this.sendInfoRequest(peerId, 'system');
    
    // Cache the result
    this.cache.set(peerId, {
      info: response,
      expiry: Date.now() + this.cacheDuration,
    });

    return response;
  }

  /**
   * Fetches system info from all connected peers
   */
  async fetchAllPeersInfo(): Promise<Map<string, PeerSystemInfo>> {
    const results = new Map<string, PeerSystemInfo>();
    const peers = this.connectionManager.getConnectedPeers();

    const promises = peers.map(async (peer) => {
      try {
        const info = await this.fetchSystemInfo(peer.id);
        results.set(peer.id, info);
      } catch (error) {
        console.error(`Failed to fetch info from peer ${peer.id}:`, error);
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Gets local system information
   */
  getLocalSystemInfo(): PeerSystemInfo {
    const os = require('os');

    return {
      system: {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        nodeVersion: process.version,
        operoneVersion: '1.0.0',
      },
      network: {
        interfaces: this.getNetworkInterfaces(),
      },
      process: {
        pid: process.pid,
        ppid: process.ppid || 0,
        memory: {
          rss: process.memoryUsage().rss,
          heapTotal: process.memoryUsage().heapTotal,
          heapUsed: process.memoryUsage().heapUsed,
          external: process.memoryUsage().external,
        },
        cpu: process.cpuUsage(),
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Compares system info between peers
   */
  compareSystemInfo(info1: PeerSystemInfo, info2: PeerSystemInfo): {
    platformMatch: boolean;
    archMatch: boolean;
    versionMatch: boolean;
    memoryDiff: number;
    cpuDiff: number;
  } {
    return {
      platformMatch: info1.system.platform === info2.system.platform,
      archMatch: info1.system.arch === info2.system.arch,
      versionMatch: info1.system.operoneVersion === info2.system.operoneVersion,
      memoryDiff: info1.system.totalMemory - info2.system.totalMemory,
      cpuDiff: info1.system.cpus - info2.system.cpus,
    };
  }

  /**
   * Clears the cache
   */
  clearCache(peerId?: string): void {
    if (peerId) {
      this.cache.delete(peerId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Sends an info request to a peer
   */
  private async sendInfoRequest(peerId: string, type: string): Promise<PeerSystemInfo> {
    return new Promise((resolve, reject) => {
      const messageId = `info-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const message = {
        type: 'command' as const,
        from: this.connectionManager.getLocalPeerInfo().id,
        to: peerId,
        payload: {
          command: 'get-system-info',
          type,
        },
        timestamp: Date.now(),
        id: messageId,
      };

      // Listen for response
      const responseHandler = (msg: any) => {
        if (msg.id === messageId && msg.type === 'response') {
          this.connectionManager.off('message', responseHandler);
          
          if (msg.payload.success) {
            resolve(msg.payload.data);
          } else {
            reject(new Error(msg.payload.error || 'Failed to fetch system info'));
          }
        }
      };

      this.connectionManager.on('message', responseHandler);

      // Send request
      this.connectionManager.sendMessage(peerId, message).catch(reject);

      // Timeout after 10 seconds
      setTimeout(() => {
        this.connectionManager.off('message', responseHandler);
        reject(new Error('Request timeout'));
      }, 10000);
    });
  }

  /**
   * Gets network interfaces
   */
  private getNetworkInterfaces(): NetworkInfo['interfaces'] {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const result: NetworkInfo['interfaces'] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        for (const addr of addrs as any[]) {
          result.push({
            name,
            address: addr.address,
            netmask: addr.netmask,
            family: addr.family,
            mac: addr.mac,
          });
        }
      }
    }

    return result;
  }
}

// Export factory
export function createPeerInfoFetcher(
  connectionManager: PeerConnectionManager,
  cacheDuration?: number
): PeerInfoFetcher {
  return new PeerInfoFetcher(connectionManager, cacheDuration);
}
