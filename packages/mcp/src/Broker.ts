import { EventEmitter } from 'events';
import { FileTool } from './FileTool';
import { ShellTool } from './ShellTool';
import { LogTool } from './LogTool';
import { toolRegistry, ToolSchema } from './ToolRegistry';
import { SSHClient } from '@operone/networking'; 

export interface Tool {
  name: string;
  description: string;
  execute(args: any): Promise<any>;
  schema?: any;
  capabilities?: string[]; // e.g., ['local', 'remote', 'distributed']
  peerId?: string; // ID of peer that provides this tool
}

export interface PeerInfo {
  id: string;
  name: string;
  host: string;
  port: number;
  capabilities: string[];
  tools: string[];
  status: 'online' | 'offline' | 'busy';
  lastSeen: number;
  load: number; // 0-100
}

export interface MCPConfig {
  enableRemote?: boolean;
  allowedTools?: string[];
  sshConfig?: any;
  enablePeerNetwork?: boolean;
  peerId?: string;
  peerName?: string;
}

export class MCPBroker extends EventEmitter {
  private tools: Map<string, Tool> = new Map();
  private peers: Map<string, PeerInfo> = new Map();
  private config: MCPConfig;
  private localPeerId: string;

  constructor(config: MCPConfig = {}) {
    super();
    this.config = config;
    this.localPeerId = config.peerId || `peer-${Date.now()}`;
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Register local tools
    this.registerTool('fs', new FileTool());
    this.registerTool('shell', new ShellTool());
    this.registerTool('log', new LogTool());
  }

  public registerTool(name: string | Tool, tool?: Tool) {
    // Support both registerTool(name, tool) and registerTool(tool)
    let toolName: string;
    let toolInstance: Tool;
    
    if (typeof name === 'string' && tool) {
      toolName = name;
      toolInstance = tool;
    } else if (typeof name === 'object' && 'name' in name) {
      toolInstance = name;
      toolName = toolInstance.name;
    } else {
      throw new Error('Invalid tool registration arguments');
    }
    
    this.tools.set(toolName, toolInstance);
    this.emit('tool:registered', { name: toolName, tool: toolInstance });
    
    // Broadcast to peers if peer network is enabled
    if (this.config.enablePeerNetwork) {
      this.broadcastToolUpdate('registered', toolName, toolInstance);
    }
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  public async callTool(name: string, args: any, context?: any): Promise<any> {
    // Check for remote execution
    if (this.config.enableRemote && context?.remote && context.sshConfig) {
      return this.callRemoteTool(name, args, context.sshConfig);
    }

    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    // TODO: Add permission check here
    
    this.emit('tool:call', { name, args, context });
    
    try {
      const result = await tool.execute(args);
      this.emit('tool:result', { name, result });
      return result;
    } catch (error) {
      this.emit('tool:error', { name, error });
      throw error;
    }
  }

  public async discoverTools(includeRemote: boolean = false): Promise<Tool[]> {
    const localTools = Array.from(this.tools.values()).map(tool => {
        // Attach schema from registry if available
        const schema = toolRegistry.getSchema(tool.name);
        if (schema) {
            return { ...tool, schema };
        }
        return tool;
    });
    
    if (!includeRemote || !this.config.enablePeerNetwork) {
      return localTools;
    }
    
    // Gather tools from all connected peers
    const remoteTools: Tool[] = [];
    for (const [peerId, peerInfo] of this.peers.entries()) {
      if (peerInfo.status === 'online') {
        for (const toolName of peerInfo.tools) {
          const schema = toolRegistry.getSchema(toolName);
          
          remoteTools.push({
            name: toolName,
            description: schema?.description || `Remote tool from ${peerInfo.name}`,
            execute: async (args: any) => this.executeRemoteTool(peerId, toolName, args),
            peerId,
            capabilities: ['remote'],
            schema
          });
        }
      }
    }
    
    return [...localTools, ...remoteTools];
  }
  
  public async discoverToolNames(): Promise<string[]> {
    const tools = await this.discoverTools(true);
    return tools.map(t => t.name);
  }

  private async callRemoteTool(name: string, args: any, sshConfig: any): Promise<any> {
    
    const client = new SSHClient(sshConfig);
    await client.connect();
    
    try {
      if (name === 'shell') {
        const command = args.command;
        const result = await client.execute(command);
        return { stdout: result };
      }
      
      throw new Error(`Remote execution not supported for tool '${name}'`);
    } finally {
      client.disconnect();
    }
  }
  
  // ============================================================================
  // Peer Management
  // ============================================================================
  
  public registerPeer(peerInfo: PeerInfo): void {
    this.peers.set(peerInfo.id, peerInfo);
    this.emit('peer:registered', peerInfo);
  }
  
  public unregisterPeer(peerId: string): void {
    this.peers.delete(peerId);
    this.emit('peer:unregistered', { peerId });
  }
  
  public getPeer(peerId: string): PeerInfo | undefined {
    return this.peers.get(peerId);
  }
  
  public getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }
  
  public updatePeerStatus(peerId: string, status: PeerInfo['status'], load?: number): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.status = status;
      peer.lastSeen = Date.now();
      if (load !== undefined) {
        peer.load = load;
      }
      this.emit('peer:updated', peer);
    }
  }
  
  // ============================================================================
  // Load Balancing
  // ============================================================================
  
  private selectBestPeer(toolName: string): PeerInfo | null {
    const availablePeers = Array.from(this.peers.values())
      .filter(p => p.status === 'online' && p.tools.includes(toolName))
      .sort((a, b) => a.load - b.load); // Sort by load (ascending)
    
    return availablePeers[0] || null;
  }
  
  /**
   * Select best peer with failover support
   * Tries multiple peers if the first one fails
   */
  public async callToolWithFailover(toolName: string, args: any, maxRetries: number = 3): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const peer = this.selectBestPeer(toolName);
      
      if (!peer) {
        throw new Error(`No available peers for tool: ${toolName}`);
      }
      
      try {
        this.emit('failover:attempt', { toolName, peerId: peer.id, attempt });
        
        const result = await this.executeRemoteTool(peer.id, toolName, args);
        
        // Success - update peer load
        this.updatePeerStatus(peer.id, 'online', Math.max(0, peer.load - 10));
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Mark peer as having issues
        this.updatePeerStatus(peer.id, 'busy', Math.min(100, peer.load + 20));
        
        this.emit('failover:error', { toolName, peerId: peer.id, attempt, error: error.message });
        
        // Wait before retry (exponential backoff)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw new Error(`Failed to execute ${toolName} after ${maxRetries} attempts: ${lastError?.message}`);
  }
  
  /**
   * Monitor peer health and mark unhealthy peers as offline
   */
  public startHealthMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    return setInterval(() => {
      const now = Date.now();
      
      for (const [peerId, peer] of this.peers.entries()) {
        // If peer hasn't been seen in 2 minutes, mark as offline
        if (now - peer.lastSeen > 120000) {
          this.updatePeerStatus(peerId, 'offline', 100);
          this.emit('peer:unhealthy', { peerId, lastSeen: peer.lastSeen });
        }
      }
    }, intervalMs);
  }
  
  /**
   * Get load distribution statistics
   */
  public getLoadStats(): { avgLoad: number; minLoad: number; maxLoad: number; onlinePeers: number } {
    const onlinePeers = Array.from(this.peers.values()).filter(p => p.status === 'online');
    
    if (onlinePeers.length === 0) {
      return { avgLoad: 0, minLoad: 0, maxLoad: 0, onlinePeers: 0 };
    }
    
    const loads = onlinePeers.map(p => p.load);
    
    return {
      avgLoad: loads.reduce((a, b) => a + b, 0) / loads.length,
      minLoad: Math.min(...loads),
      maxLoad: Math.max(...loads),
      onlinePeers: onlinePeers.length
    };
  }
  
  private remoteExecutor?: (peerId: string, toolName: string, args: any) => Promise<any>;

  public setRemoteExecutor(executor: (peerId: string, toolName: string, args: any) => Promise<any>) {
    this.remoteExecutor = executor;
  }

  private async executeRemoteTool(peerId: string, toolName: string, args: any): Promise<any> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }
    
    this.emit('tool:remote-call', { peerId, toolName, args });
    
    if (this.remoteExecutor) {
        return await this.remoteExecutor(peerId, toolName, args);
    }
    
    // Fallback if no executor configured
    throw new Error('Remote tool execution requires a configured remote executor');
  }
  
  private broadcastToolUpdate(action: 'registered' | 'unregistered', toolName: string, tool?: Tool): void {
    this.emit('tool:broadcast', { action, toolName, tool, peerId: this.localPeerId });
  }
  
  public getLocalPeerId(): string {
    return this.localPeerId;
  }
}

export const mcpBroker = new MCPBroker();
