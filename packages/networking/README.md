# @operone/networking

> Cross-platform peer-to-peer networking and multi-PC orchestration for Operone

## Overview

`@operone/networking` provides a comprehensive networking infrastructure for connecting multiple computers in a peer-to-peer network, enabling distributed tool execution, intelligent routing, and secure communication across machines.

## Features

- 🌐 **Peer-to-Peer Networking** - WebSocket-based P2P communication with TLS/SSL encryption
- 🔐 **Security** - JWT authentication and cryptographic message signing
- 🗺️ **Intelligent Routing** - Dijkstra's algorithm for optimal path finding with multi-hop support
- 📊 **QoS Management** - Priority-based messaging, bandwidth allocation, and latency monitoring
- 🔄 **Distributed Execution** - Execute tools across multiple peers with automatic failover
- 💓 **Health Monitoring** - Heartbeat tracking and network partition detection
- 🔌 **SSH Support** - Remote command execution via SSH2 protocol

## Installation

```bash
pnpm add @operone/networking
```

## Quick Start

### Starting a Peer Network

```typescript
import { PeerNetwork } from '@operone/networking';

const network = new PeerNetwork({
  peerId: 'workstation-1',
  peerName: 'Main Workstation',
  port: 8080,
  enableTLS: true,
  jwtSecret: 'your-secret-key',
  heartbeatInterval: 5000
});

// Start the server
await network.start();
console.log('Peer network started on port 8080');

// Listen for events
network.on('peer:connected', (peer) => {
  console.log(`Peer connected: ${peer.name}`);
});

network.on('peer:disconnected', (peerId) => {
  console.log(`Peer disconnected: ${peerId}`);
});
```

### Connecting to Remote Peers

```typescript
// Connect to another peer
await network.connectToPeer('192.168.1.100', 8080);

// Get list of connected peers
const peers = network.getConnectedPeers();
console.log(`Connected to ${peers.length} peers`);
```

### Broadcasting Messages

```typescript
// Broadcast to all connected peers
network.broadcast({
  type: 'notification',
  data: { message: 'Hello from main workstation!' }
});
```

### Remote Tool Execution

```typescript
// Execute a tool on a remote peer
const result = await network.executeRemoteTool(
  'workstation-2',
  'shell',
  { command: 'ls -la /home' }
);

console.log('Remote execution result:', result);
```

## Architecture

### Core Components

#### 1. PeerNetwork

The main networking engine that manages WebSocket connections, authentication, and message routing.

**Key Methods:**
- `start()` - Start the peer network server
- `stop()` - Gracefully shutdown the server
- `connectToPeer(host, port, token?)` - Connect to a remote peer
- `broadcast(message)` - Send message to all peers
- `executeRemoteTool(peerId, toolName, args)` - Execute tool remotely
- `getConnectedPeers()` - List all connected peers
- `getNetworkStats()` - Get topology statistics
- `getQoSMetrics(peerId)` - Get QoS metrics for a peer

#### 2. NetworkTopology

Manages network topology, peer discovery, and intelligent routing using graph algorithms.

**Features:**
- Peer discovery and capability advertisement
- Shortest path routing with Dijkstra's algorithm
- Multi-hop routing support
- Network partition detection
- Dynamic topology updates

**Key Methods:**
- `discoverPeers()` - Find all reachable peers
- `addPeer(peer)` - Register a new peer
- `findRoute(destination)` - Calculate optimal path
- `getNetworkStats()` - Get network statistics
- `getTopologyGraph()` - Get visualization data

#### 3. QoSManager

Quality of Service management for network optimization and health monitoring.

**Features:**
- Priority-based messaging (critical, high, normal, low)
- Bandwidth allocation and throttling
- Latency monitoring with jitter calculation
- Packet loss tracking
- Health scoring (0-100) for connections

**Message Priorities:**
- `critical` - Heartbeats, handshakes (max latency: 1-5s)
- `high` - Tool calls and results
- `normal` - Standard messages
- `low` - File transfers (bandwidth limited)

**Key Methods:**
- `setPolicy(messageType, policy)` - Set QoS policy
- `updateMetrics(peerId, metrics)` - Update peer metrics
- `recordLatency(peerId, rtt)` - Record latency measurement
- `getHealthScore(peerId)` - Get connection health (0-100)
- `shouldThrottle(peerId, messageType, size)` - Check throttling

#### 4. DistributedExecutor

Intelligent tool execution across multiple peers with load balancing.

**Features:**
- Capability-based routing
- Parallel execution across peers
- Automatic fallback to local execution
- Load balancing

**Key Methods:**
- `execute(toolName, params, context, options)` - Execute on best peer
- `executeParallel(executions)` - Run multiple tools in parallel
- `getStats()` - Get execution statistics

#### 5. SSHClient

SSH-based remote command execution for traditional server management.

**Features:**
- SSH2 protocol support
- Key-based or password authentication
- Promise-based async API
- Stdout/stderr capture

**Example:**
```typescript
import { SSHClient } from '@operone/networking';

const ssh = new SSHClient({
  host: '192.168.1.100',
  port: 22,
  username: 'admin',
  privateKeyPath: '/path/to/key'
});

await ssh.connect();
const output = await ssh.execute('ls -la');
console.log(output);
ssh.disconnect();
```

## Advanced Usage

### Network Topology Visualization

```typescript
import { NetworkTopology } from '@operone/networking';

const topology = new NetworkTopology('local-peer-id');

// Get topology graph for visualization
const graph = topology.getTopologyGraph();
console.log('Nodes:', graph.nodes);
console.log('Edges:', graph.edges);

// Get network statistics
const stats = topology.getNetworkStats();
console.log('Total nodes:', stats.totalNodes);
console.log('Average latency:', stats.averageLatency);
console.log('Network diameter:', stats.networkDiameter);
```

### Custom QoS Policies

```typescript
import { QoSManager } from '@operone/networking';

const qos = new QoSManager();

// Set custom policy for a message type
qos.setPolicy('video-stream', {
  priority: 'high',
  maxBandwidth: 10, // MB/s
  maxLatency: 100, // ms
  retryPolicy: {
    maxRetries: 5,
    backoff: 'exponential',
    initialDelay: 500
  }
});

// Monitor QoS violations
qos.on('violation:latency', ({ peerId, latency }) => {
  console.warn(`High latency detected for ${peerId}: ${latency}ms`);
});
```

### Distributed Tool Execution

```typescript
import { DistributedExecutor, ToolRouter } from '@operone/networking';
import { ToolExecutor } from '@operone/core';

const localExecutor = new ToolExecutor();
const router = new ToolRouter();
const distributed = new DistributedExecutor(localExecutor, router);

// Execute on best available peer
const result = await distributed.execute(
  'image-processing',
  { image: 'photo.jpg', filter: 'blur' },
  context,
  {
    preferLocal: false,
    requiredCapabilities: ['gpu', 'image-processing']
  }
);

console.log(`Executed on: ${result.executedOn}`);

// Execute multiple tools in parallel
const results = await distributed.executeParallel([
  { toolName: 'compress-video', params: { file: 'video1.mp4' }, context },
  { toolName: 'compress-video', params: { file: 'video2.mp4' }, context },
  { toolName: 'compress-video', params: { file: 'video3.mp4' }, context }
]);
```

## Configuration

### PeerNetworkConfig

```typescript
interface PeerNetworkConfig {
  peerId: string;              // Unique peer identifier
  peerName: string;            // Human-readable peer name
  port?: number;               // Server port (default: 8080)
  maxPeers?: number;           // Maximum connected peers
  enableTLS?: boolean;         // Enable TLS encryption
  tlsKey?: string;             // Path to TLS key file
  tlsCert?: string;            // Path to TLS certificate
  jwtSecret?: string;          // JWT authentication secret
  enableMessageSigning?: boolean; // Enable message signing
  signingKey?: string;         // Message signing key
  heartbeatInterval?: number;  // Heartbeat interval in ms
}
```

## Security

### Authentication

The package supports JWT-based authentication for peer connections:

```typescript
const network = new PeerNetwork({
  peerId: 'secure-peer',
  peerName: 'Secure Workstation',
  jwtSecret: 'your-secret-key'
});

// Generate JWT token for peer
const token = network.generateJWT();

// Connect with authentication
await network.connectToPeer('192.168.1.100', 8080, token);
```

### Message Signing

Enable cryptographic message signing for integrity verification:

```typescript
const network = new PeerNetwork({
  peerId: 'signed-peer',
  peerName: 'Signed Messages',
  enableMessageSigning: true,
  signingKey: 'your-signing-key'
});
```

### TLS/SSL Encryption

Enable TLS for encrypted communication:

```typescript
const network = new PeerNetwork({
  peerId: 'encrypted-peer',
  peerName: 'Encrypted Connection',
  enableTLS: true,
  tlsKey: '/path/to/key.pem',
  tlsCert: '/path/to/cert.pem'
});
```

## Network Statistics

```typescript
// Get comprehensive network statistics
const stats = network.getNetworkStats();

console.log('Network Statistics:');
console.log('- Total nodes:', stats.totalNodes);
console.log('- Direct connections:', stats.directConnections);
console.log('- Indirect connections:', stats.indirectConnections);
console.log('- Average hop count:', stats.averageHopCount);
console.log('- Average latency:', stats.averageLatency);
console.log('- Network diameter:', stats.networkDiameter);
console.log('- Partitions:', stats.partitions);
```

## Events

The `PeerNetwork` class emits various events:

```typescript
network.on('peer:connected', (peer: ConnectedPeer) => {
  console.log(`Peer connected: ${peer.name}`);
});

network.on('peer:disconnected', (peerId: string) => {
  console.log(`Peer disconnected: ${peerId}`);
});

network.on('message', (message: PeerMessage) => {
  console.log('Received message:', message);
});

network.on('topology:updated', () => {
  console.log('Network topology changed');
});
```

## Use Cases

- **Distributed AI Agent Execution** - Run AI agents across multiple machines
- **Load Balancing** - Distribute computational tasks across the network
- **Multi-Hop Routing** - Route messages through intermediate peers
- **Secure Communication** - Encrypted peer-to-peer messaging
- **Network Monitoring** - Real-time health and performance tracking
- **Remote Tool Execution** - Execute tools on remote machines with failover

## Dependencies

- `socket.io` (^4.8.1) - Real-time bidirectional communication
- `socket.io-client` (^4.8.1) - Client-side socket connections
- `ws` (^8.18.3) - WebSocket server/client
- `ssh2` (^1.17.0) - SSH protocol implementation
- `bonjour` (^3.5.0) - Zero-configuration networking
- `@operone/core` - Core Operone functionality

## License

MIT

## Contributing

Contributions are welcome! Please see the main Operone repository for contribution guidelines.
