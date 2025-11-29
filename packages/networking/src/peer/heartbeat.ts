import { PeerConnectionManager, PeerInfo } from './connect';
import { EventEmitter } from 'events';

/**
 * Heartbeat Monitor
 * 
 * Monitors peer health with automatic reconnection.
 */

export interface HeartbeatConfig {
  interval?: number;
  timeout?: number;
  maxMissed?: number;
  autoReconnect?: boolean;
}

export interface PeerHealth {
  peerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'disconnected';
  lastHeartbeat: number;
  missedHeartbeats: number;
  latency: number;
  uptime: number;
}

const DEFAULT_CONFIG: HeartbeatConfig = {
  interval: 10000, // 10 seconds
  timeout: 5000,   // 5 seconds
  maxMissed: 3,
  autoReconnect: true,
};

export class HeartbeatMonitor extends EventEmitter {
  private connectionManager: PeerConnectionManager;
  private config: HeartbeatConfig;
  private peerHealth: Map<string, PeerHealth>;
  private heartbeatIntervals: Map<string, NodeJS.Timeout>;
  private monitorInterval?: NodeJS.Timeout;

  constructor(
    connectionManager: PeerConnectionManager,
    config: Partial<HeartbeatConfig> = {}
  ) {
    super();
    this.connectionManager = connectionManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.peerHealth = new Map();
    this.heartbeatIntervals = new Map();

    // Listen for peer events
    this.connectionManager.on('peer-connected', (peerId: string) => {
      this.initializePeerHealth(peerId);
    });

    this.connectionManager.on('peer-disconnected', (peerId: string) => {
      this.handlePeerDisconnect(peerId);
    });

    // Listen for heartbeat messages
    this.connectionManager.on('message', (message: any) => {
      if (message.type === 'heartbeat') {
        this.handleHeartbeat(message);
      }
    });
  }

  /**
   * Starts monitoring
   */
  start(): void {
    // Start monitoring interval
    this.monitorInterval = setInterval(() => {
      this.checkAllPeers();
    }, this.config.interval!);

    // Initialize health for existing peers
    const peers = this.connectionManager.getConnectedPeers();
    for (const peer of peers) {
      this.initializePeerHealth(peer.id);
    }

    this.emit('started');
  }

  /**
   * Stops monitoring
   */
  stop(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }

    // Clear all peer intervals
    for (const interval of this.heartbeatIntervals.values()) {
      clearInterval(interval);
    }
    this.heartbeatIntervals.clear();

    this.emit('stopped');
  }

  /**
   * Gets health status for a peer
   */
  getPeerHealth(peerId: string): PeerHealth | undefined {
    return this.peerHealth.get(peerId);
  }

  /**
   * Gets health status for all peers
   */
  getAllPeerHealth(): PeerHealth[] {
    return Array.from(this.peerHealth.values());
  }

  /**
   * Gets healthy peers
   */
  getHealthyPeers(): PeerHealth[] {
    return this.getAllPeerHealth().filter(h => h.status === 'healthy');
  }

  /**
   * Gets unhealthy peers
   */
  getUnhealthyPeers(): PeerHealth[] {
    return this.getAllPeerHealth().filter(
      h => h.status === 'unhealthy' || h.status === 'degraded'
    );
  }

  /**
   * Manually sends heartbeat to a peer
   */
  async sendHeartbeat(peerId: string): Promise<number> {
    const startTime = Date.now();

    await this.connectionManager.sendMessage(peerId, {
      type: 'heartbeat',
      from: this.connectionManager.getLocalPeerInfo().id,
      to: peerId,
      payload: {
        timestamp: startTime,
      },
      timestamp: startTime,
      id: `hb-${Date.now()}`,
    });

    return Date.now() - startTime;
  }

  /**
   * Initializes health tracking for a peer
   */
  private initializePeerHealth(peerId: string): void {
    const health: PeerHealth = {
      peerId,
      status: 'healthy',
      lastHeartbeat: Date.now(),
      missedHeartbeats: 0,
      latency: 0,
      uptime: 0,
    };

    this.peerHealth.set(peerId, health);

    // Start heartbeat interval for this peer
    const interval = setInterval(async () => {
      try {
        const latency = await this.sendHeartbeat(peerId);
        this.updatePeerHealth(peerId, latency);
      } catch (error) {
        this.handleMissedHeartbeat(peerId);
      }
    }, this.config.interval!);

    this.heartbeatIntervals.set(peerId, interval);
  }

  /**
   * Updates peer health after successful heartbeat
   */
  private updatePeerHealth(peerId: string, latency: number): void {
    const health = this.peerHealth.get(peerId);
    if (!health) return;

    health.lastHeartbeat = Date.now();
    health.missedHeartbeats = 0;
    health.latency = latency;
    health.uptime = Date.now() - health.lastHeartbeat;

    // Update status based on latency
    if (latency < 100) {
      health.status = 'healthy';
    } else if (latency < 500) {
      health.status = 'degraded';
    } else {
      health.status = 'unhealthy';
    }

    this.emit('health-updated', health);
  }

  /**
   * Handles missed heartbeat
   */
  private handleMissedHeartbeat(peerId: string): void {
    const health = this.peerHealth.get(peerId);
    if (!health) return;

    health.missedHeartbeats++;

    if (health.missedHeartbeats >= this.config.maxMissed!) {
      health.status = 'unhealthy';
      this.emit('peer-unhealthy', health);

      // Attempt reconnection if enabled
      if (this.config.autoReconnect) {
        this.attemptReconnect(peerId);
      }
    } else {
      health.status = 'degraded';
    }

    this.emit('heartbeat-missed', health);
  }

  /**
   * Handles heartbeat messages
   */
  private handleHeartbeat(message: any): void {
    const peerId = message.from;
    const health = this.peerHealth.get(peerId);
    
    if (health) {
      const latency = Date.now() - message.payload.timestamp;
      this.updatePeerHealth(peerId, latency);
    }
  }

  /**
   * Checks all peers
   */
  private checkAllPeers(): void {
    const now = Date.now();

    for (const [peerId, health] of this.peerHealth) {
      const timeSinceLastHeartbeat = now - health.lastHeartbeat;

      // Check if peer is unresponsive
      if (timeSinceLastHeartbeat > this.config.timeout! * this.config.maxMissed!) {
        if (health.status !== 'disconnected') {
          health.status = 'disconnected';
          this.emit('peer-timeout', health);

          if (this.config.autoReconnect) {
            this.attemptReconnect(peerId);
          }
        }
      }
    }
  }

  /**
   * Attempts to reconnect to a peer
   */
  private async attemptReconnect(peerId: string): Promise<void> {
    const peerInfo = this.connectionManager.getPeerInfo(peerId);
    if (!peerInfo) return;

    try {
      await this.connectionManager.connect(peerInfo.address, peerInfo.port);
      this.emit('peer-reconnected', peerId);
    } catch (error) {
      this.emit('reconnect-failed', { peerId, error });
    }
  }

  /**
   * Handles peer disconnect
   */
  private handlePeerDisconnect(peerId: string): void {
    const interval = this.heartbeatIntervals.get(peerId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(peerId);
    }

    const health = this.peerHealth.get(peerId);
    if (health) {
      health.status = 'disconnected';
      this.emit('peer-disconnected-health', health);
    }
  }

  /**
   * Gets average latency across all peers
   */
  getAverageLatency(): number {
    const healthyPeers = this.getHealthyPeers();
    if (healthyPeers.length === 0) return 0;

    const totalLatency = healthyPeers.reduce((sum, h) => sum + h.latency, 0);
    return totalLatency / healthyPeers.length;
  }

  /**
   * Gets network health score (0-100)
   */
  getNetworkHealthScore(): number {
    const allPeers = this.getAllPeerHealth();
    if (allPeers.length === 0) return 100;

    const healthyCount = allPeers.filter(h => h.status === 'healthy').length;
    return (healthyCount / allPeers.length) * 100;
  }
}

// Export factory
export function createHeartbeatMonitor(
  connectionManager: PeerConnectionManager,
  config?: Partial<HeartbeatConfig>
): HeartbeatMonitor {
  return new HeartbeatMonitor(connectionManager, config);
}
