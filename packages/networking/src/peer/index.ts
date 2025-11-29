// Peer Networking Module
export {
  PeerConnectionManager,
  peerConnectionManager,
  createPeerConnectionManager,
  type PeerInfo,
  type ConnectionConfig,
  type PeerMessage,
} from './connect';

export {
  RemoteCommandExecutor,
  createRemoteCommandExecutor,
  type CommandRequest,
  type CommandResponse,
  type CommandProgress,
} from './send-command';

export {
  PeerInfoFetcher,
  createPeerInfoFetcher,
  type SystemInfo,
  type NetworkInfo,
  type ProcessInfo,
  type PeerSystemInfo,
} from './fetch-info';

export {
  FileSynchronizer,
  createFileSynchronizer,
  type SyncOptions,
  type FileMetadata,
  type SyncProgress,
  type SyncResult,
} from './sync-files';

export {
  HeartbeatMonitor,
  createHeartbeatMonitor,
  type HeartbeatConfig,
  type PeerHealth,
} from './heartbeat';
