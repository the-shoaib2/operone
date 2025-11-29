import { EventEmitter } from 'events';
import { io, Socket } from 'socket.io-client';
import { Server } from 'socket.io';
import { createServer } from 'http';

/**
 * Peer Connection Manager
 * 
 * Manages secure peer-to-peer connections between multiple machines
 * using Socket.IO for real-time communication.
 */

export interface PeerInfo {
  id: string;
  name: string;
  address: string;
  port: number;
  platform: string;
  version: string;
  capabilities: string[];
  lastSeen: number;
}

export interface ConnectionConfig {
  port?: number;
  discoveryEnabled?: boolean;
  encryption?: boolean;
  authToken?: string;
  maxPeers?: number;
}

export interface PeerMessage {
  type: 'command' | 'response' | 'file' | 'heartbeat' | 'discovery';
  from: string;
  to: string;
  payload: any;
  timestamp: number;
  id: string;
}

const DEFAULT_CONFIG: ConnectionConfig = {
  port: 9876,
  discoveryEnabled: true,
  encryption: true,
  maxPeers: 10,
};

export class PeerConnectionManager extends EventEmitter {
  private config: ConnectionConfig;
  private server?: Server;
  private peers: Map<string, PeerInfo>;
  private connections: Map<string, Socket>;
  private localPeerId: string;
  private localPeerInfo: PeerInfo;

  constructor(config: Partial<ConnectionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.peers = new Map();
    this.connections = new Map();
    this.localPeerId = this.generatePeerId();
    this.localPeerInfo = this.createLocalPeerInfo();
  }

  /**
   * Starts the peer server
   */
  async start(): Promise<void> {
    const httpServer = createServer();
    this.server = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Setup server event handlers
    this.server.on('connection', (socket: any) => {
      this.handleIncomingConnection(socket);
    });

    // Start listening
    await new Promise<void>((resolve, reject) => {
      httpServer.listen(this.config.port, () => {
        console.log(`Peer server listening on port ${this.config.port}`);
        resolve();
      });

      httpServer.on('error', reject);
    });

    // Start peer discovery if enabled
    if (this.config.discoveryEnabled) {
      this.startDiscovery();
    }

    this.emit('started', this.localPeerInfo);
  }

  /**
   * Stops the peer server
   */
  async stop(): Promise<void> {
    // Close all peer connections
    for (const [peerId, socket] of this.connections) {
      socket.disconnect();
    }
    this.connections.clear();

    // Close server
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => resolve());
      });
    }

    this.emit('stopped');
  }

  /**
   * Connects to a remote peer
   */
  async connect(address: string, port: number): Promise<string> {
    const url = `http://${address}:${port}`;
    
    const socket = io(url, {
      auth: {
        token: this.config.authToken,
        peerId: this.localPeerId,
        peerInfo: this.localPeerInfo,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    return new Promise((resolve, reject) => {
      socket.on('connect', () => {
        const peerId = socket.id || this.generatePeerId();
        this.connections.set(peerId, socket);
        this.setupSocketHandlers(socket);
        
        // Send discovery message
        this.sendMessage(peerId, {
          type: 'discovery',
          from: this.localPeerId,
          to: peerId,
          payload: this.localPeerInfo,
          timestamp: Date.now(),
          id: this.generateMessageId(),
        });

        this.emit('peer-connected', peerId);
        resolve(peerId);
      });

      socket.on('connect_error', (error) => {
        reject(new Error(`Failed to connect to peer: ${error.message}`));
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!socket.connected) {
          socket.disconnect();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Disconnects from a peer
   */
  disconnect(peerId: string): void {
    const socket = this.connections.get(peerId);
    if (socket) {
      socket.disconnect();
      this.connections.delete(peerId);
      this.peers.delete(peerId);
      this.emit('peer-disconnected', peerId);
    }
  }

  /**
   * Sends a message to a peer
   */
  async sendMessage(peerId: string, message: PeerMessage): Promise<void> {
    const socket = this.connections.get(peerId);
    if (!socket) {
      throw new Error(`Not connected to peer: ${peerId}`);
    }

    return new Promise((resolve, reject) => {
      socket.emit('message', message, (ack: any) => {
        if (ack?.error) {
          reject(new Error(ack.error));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Broadcasts a message to all connected peers
   */
  async broadcast(message: Omit<PeerMessage, 'to'>): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const peerId of this.connections.keys()) {
      promises.push(
        this.sendMessage(peerId, {
          ...message,
          to: peerId,
        } as PeerMessage)
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Gets information about a peer
   */
  getPeerInfo(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }

  /**
   * Gets all connected peers
   */
  getConnectedPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }

  /**
   * Checks if connected to a peer
   */
  isConnected(peerId: string): boolean {
    return this.connections.has(peerId);
  }

  /**
   * Gets local peer information
   */
  getLocalPeerInfo(): PeerInfo {
    return this.localPeerInfo;
  }

  /**
   * Handles incoming peer connections
   */
  private handleIncomingConnection(socket: any): void {
    const auth = socket.handshake?.auth || {};

    // Validate authentication
    if (this.config.authToken && auth.token !== this.config.authToken) {
      socket.disconnect();
      return;
    }

    // Check max peers limit
    if (this.connections.size >= (this.config.maxPeers || 10)) {
      socket.emit('error', { message: 'Maximum peers reached' });
      socket.disconnect();
      return;
    }

    const peerId = auth.peerId || socket.id;
    this.connections.set(peerId, socket);

    // Store peer info if provided
    if (auth.peerInfo) {
      this.peers.set(peerId, {
        ...auth.peerInfo,
        id: peerId,
        lastSeen: Date.now(),
      });
    }

    this.setupSocketHandlers(socket);
    this.emit('peer-connected', peerId);
  }

  /**
   * Sets up event handlers for a socket
   */
  private setupSocketHandlers(socket: Socket): void {
    socket.on('message', (message: PeerMessage, callback) => {
      this.handleMessage(message);
      if (callback) callback({ success: true });
    });

    socket.on('disconnect', () => {
      const peerId = this.findPeerIdBySocket(socket);
      if (peerId) {
        this.connections.delete(peerId);
        this.peers.delete(peerId);
        this.emit('peer-disconnected', peerId);
      }
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });
  }

  /**
   * Handles incoming messages
   */
  private handleMessage(message: PeerMessage): void {
    // Update peer last seen
    const peer = this.peers.get(message.from);
    if (peer) {
      peer.lastSeen = Date.now();
    }

    // Handle discovery messages
    if (message.type === 'discovery') {
      this.peers.set(message.from, {
        ...message.payload,
        id: message.from,
        lastSeen: Date.now(),
      });
    }

    this.emit('message', message);
  }

  /**
   * Starts peer discovery
   */
  private startDiscovery(): void {
    // Simple discovery using broadcast
    // In production, you might want to use mDNS/Bonjour
    setInterval(() => {
      this.broadcast({
        type: 'heartbeat',
        from: this.localPeerId,
        payload: this.localPeerInfo,
        timestamp: Date.now(),
        id: this.generateMessageId(),
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Finds peer ID by socket
   */
  private findPeerIdBySocket(socket: Socket): string | undefined {
    for (const [peerId, peerSocket] of this.connections) {
      if (peerSocket === socket) {
        return peerId;
      }
    }
    return undefined;
  }

  /**
   * Generates a unique peer ID
   */
  private generatePeerId(): string {
    return `peer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generates a unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Creates local peer information
   */
  private createLocalPeerInfo(): PeerInfo {
    return {
      id: this.localPeerId,
      name: process.env.HOSTNAME || 'unknown',
      address: '0.0.0.0',
      port: this.config.port || 9876,
      platform: process.platform,
      version: '1.0.0',
      capabilities: ['command', 'file-sync', 'streaming'],
      lastSeen: Date.now(),
    };
  }
}

// Export singleton instance
export const peerConnectionManager = new PeerConnectionManager();

// Export factory
export function createPeerConnectionManager(config?: Partial<ConnectionConfig>): PeerConnectionManager {
  return new PeerConnectionManager(config);
}
