import { PC } from './PC';
import { TopologyManager, type TopologyType } from './TopologyManager';

export class Network {
  pcs: Map<string, PC> = new Map();
  subnet: string = '192.168.1.';
  currentTopology: TopologyType = 'ring';

  constructor(initialCount: number = 10) {
    for (let i = 1; i <= initialCount; i++) {
      const ip = `${this.subnet}${i + 10}`; // start at .11
      // Convert 1->A, 2->B, etc.
      const hostname = String.fromCharCode(64 + i);
      const id = crypto.randomUUID();
      const pc = new PC(id, hostname, ip, this);
      this.pcs.set(id, pc);
      
      // Basic role for first node just to have some variety if needed, 
      // but user asked for specific names. keeping simple for now.
    }
  }

  setTopology(topology: TopologyType): void {
    this.currentTopology = topology;
  }

  getAllPCs(): PC[] {
    return Array.from(this.pcs.values());
  }

  getPC(id: string): PC | undefined {
    return this.pcs.get(id);
  }

  getPcByIp(ip: string): PC | undefined {
    for (const pc of this.pcs.values()) {
      if (pc.ip === ip) return pc;
    }
    return undefined;
  }

  getPcByHostname(hostname: string): PC | undefined {
    for (const pc of this.pcs.values()) {
      if (pc.hostname === hostname) return pc;
    }
    return undefined;
  }

  /**
   * Find routing path between two PCs based on current topology
   */
  findRoutingPath(fromId: string, toId: string): string[] {
    const pcIds = this.getAllPCs().map(pc => pc.id);
    return TopologyManager.findPath(pcIds, this.currentTopology, fromId, toId);
  }

  /**
   * Send packet with topology-aware routing
   */
  async sendPacket(fromId: string, toIp: string, port: number, payload: any): Promise<{ status: number, data?: any, error?: string }> {
    const fromPC = this.pcs.get(fromId);
    const toPC = this.getPcByIp(toIp);

    if (!fromPC) return { status: 400, error: 'Sender not found' };
    if (!toPC) return { status: 404, error: 'Destination unreachable' };

    // Calculate routing path based on topology
    const path = this.findRoutingPath(fromId, toPC.id);
    
    if (path.length === 0) {
      return { status: 503, error: 'No route to host' };
    }

    // Log routing through intermediate nodes
    if (path.length > 2) {
      fromPC.log(`Routing to ${toPC.hostname} via ${path.length - 2} hop(s)`);
      for (let i = 1; i < path.length - 1; i++) {
        const intermediatePC = this.pcs.get(path[i]);
        if (intermediatePC) {
          intermediatePC.log(`Routing packet from ${fromPC.hostname} to ${toPC.hostname}`);
        }
      }
    }

    // Simulate network latency based on hop count
    const hops = path.length - 1;
    const latency = Math.floor(Math.random() * 20) + (hops * 10);
    await new Promise(resolve => setTimeout(resolve, latency));

    return toPC.handleRequest(port, payload);
  }
}

