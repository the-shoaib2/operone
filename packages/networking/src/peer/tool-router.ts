import { getToolRegistry } from '@operone/core';
import { PeerRegistry, PeerInfo } from './peer-registry';

/**
 * Tool routing decision
 */
export interface RoutingDecision {
  peerId: string;
  peerName: string;
  reason: string;
  local: boolean;
}

/**
 * Tool router for distributed execution
 */
export class ToolRouter {
  constructor(
    private peerRegistry: PeerRegistry,
    private localPeerId: string
  ) {}

  /**
   * Route a tool execution to the best peer
   */
  route(
    toolName: string,
    requiredCapabilities?: string[]
  ): RoutingDecision | null {
    const registry = getToolRegistry();
    const tool = registry.get(toolName);

    if (!tool) {
      return null;
    }

    // Get required capabilities from tool metadata or parameter
    const capabilities = requiredCapabilities || 
      (tool.definition.metadata?.requiredCapabilities as string[]) || 
      [];

    // If no specific capabilities required, execute locally
    if (capabilities.length === 0) {
      return {
        peerId: this.localPeerId,
        peerName: 'local',
        reason: 'No specific capabilities required',
        local: true,
      };
    }

    // Find best peer with required capabilities
    const bestPeer = this.peerRegistry.findBestPeer(capabilities);

    if (!bestPeer) {
      // Fallback to local if no suitable peer found
      return {
        peerId: this.localPeerId,
        peerName: 'local',
        reason: 'No suitable remote peer found',
        local: true,
      };
    }

    // Check if local peer has the capabilities
    const localPeer = this.peerRegistry.get(this.localPeerId);
    if (localPeer) {
      const localCapNames = localPeer.capabilities.map(c => c.name);
      const hasAllCaps = capabilities.every(req => localCapNames.includes(req));
      
      if (hasAllCaps) {
        // Prefer local execution if we have the capabilities
        return {
          peerId: this.localPeerId,
          peerName: 'local',
          reason: 'Local peer has required capabilities',
          local: true,
        };
      }
    }

    return {
      peerId: bestPeer.id,
      peerName: bestPeer.name,
      reason: `Best peer with capabilities: ${capabilities.join(', ')}`,
      local: false,
    };
  }

  /**
   * Route multiple tools and group by peer
   */
  routeMultiple(
    tools: Array<{ toolName: string; requiredCapabilities?: string[] }>
  ): Map<string, Array<{ toolName: string; decision: RoutingDecision }>> {
    const routingMap = new Map<string, Array<{ toolName: string; decision: RoutingDecision }>>();

    for (const tool of tools) {
      const decision = this.route(tool.toolName, tool.requiredCapabilities);
      
      if (decision) {
        const peerId = decision.peerId;
        if (!routingMap.has(peerId)) {
          routingMap.set(peerId, []);
        }
        routingMap.get(peerId)!.push({
          toolName: tool.toolName,
          decision,
        });
      }
    }

    return routingMap;
  }

  /**
   * Get available peers for a tool
   */
  getAvailablePeers(toolName: string): PeerInfo[] {
    const registry = getToolRegistry();
    const tool = registry.get(toolName);

    if (!tool) {
      return [];
    }

    const capabilities = (tool.definition.metadata?.requiredCapabilities as string[]) || [];
    
    if (capabilities.length === 0) {
      return this.peerRegistry.getOnline();
    }

    return this.peerRegistry.findByCapabilities(capabilities)
      .filter(p => p.status === 'online');
  }
}

/**
 * Create a tool router instance
 */
export function createToolRouter(
  peerRegistry: PeerRegistry,
  localPeerId: string
): ToolRouter {
  return new ToolRouter(peerRegistry, localPeerId);
}
