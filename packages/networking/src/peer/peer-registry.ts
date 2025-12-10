/**
 * Peer capability definition
 */
export interface PeerCapability {
  name: string;
  version: string;
  description: string;
  metadata?: Record<string, any>;
}

/**
 * Peer information with capabilities
 */
export interface PeerInfo {
  id: string;
  name: string;
  address: string;
  port: number;
  status: 'online' | 'offline' | 'busy';
  capabilities: PeerCapability[];
  systemInfo: {
    platform: string;
    arch: string;
    cpus: number;
    memory: number;
    hostname: string;
  };
  lastSeen: Date;
  metadata?: Record<string, any>;
}

/**
 * Peer registry for managing connected peers
 */
export class PeerRegistry {
  private peers: Map<string, PeerInfo> = new Map();

  /**
   * Register a peer
   */
  register(peer: PeerInfo): void {
    this.peers.set(peer.id, peer);
  }

  /**
   * Unregister a peer
   */
  unregister(peerId: string): boolean {
    return this.peers.delete(peerId);
  }

  /**
   * Get peer by ID
   */
  get(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Get all peers
   */
  getAll(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get online peers
   */
  getOnline(): PeerInfo[] {
    return this.getAll().filter(p => p.status === 'online');
  }

  /**
   * Find peers with specific capability
   */
  findByCapability(capabilityName: string): PeerInfo[] {
    return this.getAll().filter(peer =>
      peer.capabilities.some(cap => cap.name === capabilityName)
    );
  }

  /**
   * Find peers with all required capabilities
   */
  findByCapabilities(requiredCapabilities: string[]): PeerInfo[] {
    return this.getAll().filter(peer => {
      const peerCapNames = peer.capabilities.map(c => c.name);
      return requiredCapabilities.every(req => peerCapNames.includes(req));
    });
  }

  /**
   * Find best peer for a task based on capabilities and load
   */
  findBestPeer(requiredCapabilities: string[]): PeerInfo | null {
    const candidates = this.findByCapabilities(requiredCapabilities)
      .filter(p => p.status === 'online');

    if (candidates.length === 0) {
      return null;
    }

    // Simple load balancing: prefer peers with more available resources
    // In production, this would consider actual CPU/memory usage
    return candidates.sort((a, b) => {
      const scoreA = a.systemInfo.cpus * a.systemInfo.memory;
      const scoreB = b.systemInfo.cpus * b.systemInfo.memory;
      return scoreB - scoreA;
    })[0];
  }

  /**
   * Update peer status
   */
  updateStatus(peerId: string, status: 'online' | 'offline' | 'busy'): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.status = status;
      peer.lastSeen = new Date();
    }
  }

  /**
   * Update peer capabilities
   */
  updateCapabilities(peerId: string, capabilities: PeerCapability[]): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.capabilities = capabilities;
    }
  }

  /**
   * Get peer count
   */
  count(): number {
    return this.peers.size;
  }

  /**
   * Clear all peers
   */
  clear(): void {
    this.peers.clear();
  }
}

/**
 * Create a peer registry instance
 */
export function createPeerRegistry(): PeerRegistry {
  return new PeerRegistry();
}
