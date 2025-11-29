import { PeerConnectionManager, PeerMessage } from './connect';
import { EventEmitter } from 'events';

/**
 * Remote Command Executor
 * 
 * Executes commands on remote peer machines securely.
 */

export interface CommandRequest {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  streaming?: boolean;
}

export interface CommandResponse {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  error?: string;
}

export interface CommandProgress {
  type: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

export class RemoteCommandExecutor extends EventEmitter {
  private connectionManager: PeerConnectionManager;
  private pendingCommands: Map<string, {
    resolve: (value: CommandResponse) => void;
    reject: (error: Error) => void;
    timeout?: NodeJS.Timeout;
  }>;

  constructor(connectionManager: PeerConnectionManager) {
    super();
    this.connectionManager = connectionManager;
    this.pendingCommands = new Map();

    // Listen for responses
    this.connectionManager.on('message', (message: PeerMessage) => {
      if (message.type === 'response') {
        this.handleResponse(message);
      }
    });
  }

  /**
   * Executes a command on a remote peer
   */
  async executeCommand(
    peerId: string,
    request: CommandRequest
  ): Promise<CommandResponse> {
    if (!this.connectionManager.isConnected(peerId)) {
      throw new Error(`Not connected to peer: ${peerId}`);
    }

    const messageId = this.generateMessageId();
    const timeout = request.timeout || 30000;

    // Send command request
    const message: PeerMessage = {
      type: 'command',
      from: this.connectionManager.getLocalPeerInfo().id,
      to: peerId,
      payload: request,
      timestamp: Date.now(),
      id: messageId,
    };

    await this.connectionManager.sendMessage(peerId, message);

    // Wait for response
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingCommands.delete(messageId);
        reject(new Error('Command execution timeout'));
      }, timeout);

      this.pendingCommands.set(messageId, {
        resolve,
        reject,
        timeout: timeoutHandle,
      });
    });
  }

  /**
   * Executes a command with streaming output
   */
  async executeCommandStreaming(
    peerId: string,
    request: CommandRequest,
    onProgress: (progress: CommandProgress) => void
  ): Promise<CommandResponse> {
    const streamingRequest = {
      ...request,
      streaming: true,
    };

    // Listen for progress events
    const progressHandler = (message: PeerMessage) => {
      if (message.type === 'response' && message.payload.progress) {
        onProgress(message.payload.progress);
      }
    };

    this.connectionManager.on('message', progressHandler);

    try {
      const result = await this.executeCommand(peerId, streamingRequest);
      return result;
    } finally {
      this.connectionManager.off('message', progressHandler);
    }
  }

  /**
   * Executes a command on multiple peers in parallel
   */
  async executeCommandOnMultiplePeers(
    peerIds: string[],
    request: CommandRequest
  ): Promise<Map<string, CommandResponse>> {
    const results = new Map<string, CommandResponse>();
    
    const promises = peerIds.map(async (peerId) => {
      try {
        const response = await this.executeCommand(peerId, request);
        results.set(peerId, response);
      } catch (error) {
        results.set(peerId, {
          success: false,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          exitCode: -1,
          executionTime: 0,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Handles command responses
   */
  private handleResponse(message: PeerMessage): void {
    const pending = this.pendingCommands.get(message.id);
    
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }

      const response = message.payload as CommandResponse;
      
      if (response.success) {
        pending.resolve(response);
      } else {
        pending.reject(new Error(response.error || 'Command execution failed'));
      }

      this.pendingCommands.delete(message.id);
    }
  }

  /**
   * Generates a unique message ID
   */
  private generateMessageId(): string {
    return `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cancels a pending command
   */
  cancelCommand(messageId: string): boolean {
    const pending = this.pendingCommands.get(messageId);
    
    if (pending) {
      if (pending.timeout) {
        clearTimeout(pending.timeout);
      }
      pending.reject(new Error('Command cancelled'));
      this.pendingCommands.delete(messageId);
      return true;
    }

    return false;
  }

  /**
   * Gets pending command count
   */
  getPendingCommandCount(): number {
    return this.pendingCommands.size;
  }
}

// Export factory
export function createRemoteCommandExecutor(
  connectionManager: PeerConnectionManager
): RemoteCommandExecutor {
  return new RemoteCommandExecutor(connectionManager);
}
