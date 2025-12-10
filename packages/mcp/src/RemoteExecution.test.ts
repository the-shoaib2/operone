import { describe, it, expect, vi } from 'vitest';
import { MCPBroker, PeerInfo } from './Broker';

describe('Mutli-PC Tool Execution', () => {
    it('should execute tool on remote peer via executor', async () => {
        const broker = new MCPBroker({ enablePeerNetwork: true, enableRemote: true });
        
        const remotePeer: PeerInfo = {
            id: 'peer-remote',
            name: 'Remote Peer',
            host: '10.0.0.2',
            port: 3000,
            capabilities: ['remote'],
            tools: ['remote-echo'],
            status: 'online',
            lastSeen: Date.now(),
            load: 10
        };
        
        broker.registerPeer(remotePeer);
        
        // Mock remote executor
        const executor = vi.fn().mockResolvedValue({ message: 'echo from remote' });
        broker.setRemoteExecutor(executor);
        
        // Mock tool registry (since discoverTools uses it)
        // We can just rely on the fact that discoverTools adds the tool based on peer info
        // But discoverTools calls toolRegistry.getSchema. If not found, it uses generic description.
        // It's fine.
        
        const tools = await broker.discoverTools(true);
        const remoteTool = tools.find(t => t.name === 'remote-echo');
        
        expect(remoteTool).toBeDefined();
        expect(remoteTool?.peerId).toBe('peer-remote');
        
        // Execute
        const result = await remoteTool?.execute({ text: 'hello' });
        
        expect(executor).toHaveBeenCalledWith('peer-remote', 'remote-echo', { text: 'hello' });
        expect(result).toEqual({ message: 'echo from remote' });
    });

    it('should support load balancing failover', async () => {
         const broker = new MCPBroker({ enablePeerNetwork: true, enableRemote: true });
         
         const peer1: PeerInfo = { id: 'p1', name: 'P1', host: 'h1', port: 1, capabilities: [], tools: ['job'], status: 'online', lastSeen: Date.now(), load: 80 };
         const peer2: PeerInfo = { id: 'p2', name: 'P2', host: 'h2', port: 2, capabilities: [], tools: ['job'], status: 'online', lastSeen: Date.now(), load: 10 }; // Lower load
         
         broker.registerPeer(peer1);
         broker.registerPeer(peer2);
         
         const executor = vi.fn().mockImplementation(async (peerId) => {
             if (peerId === 'p2') throw new Error('Connection failed');
             return 'success';
         });
         broker.setRemoteExecutor(executor);
         
         // should try p2 first (load 10), fail, then p1 (load 80)
         const result = await broker.callToolWithFailover('job', {}, 2);
         
         expect(executor).toHaveBeenCalledTimes(2);
         expect(result).toBe('success');
    });
});
