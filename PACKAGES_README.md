# Operone Packages - OS Subsystems & Architecture

This document provides detailed information about the core packages that make up the Operone Distributed Operating System.

## 📦 Packages Overview

The Operone monorepo contains the core subsystems that form the operating system's kernel and utility layers.

```
packages/
├── operone/              # Kernel & Orchestration Engine
├── fs/                   # Virtual File System (VFS)
├── shell/                # Secure Command Shell
├── networking/           # Mesh Networking Layer
├── memory/               # System State & Context
├── mcp/                  # Model Context Protocol (Drivers)
├── types/                # Shared System Types
└── eslint-config/        # Development Tools
```

---

## 🔧 OS Subsystems

### `@repo/operone` - The Kernel
**Type**: Core Engine

The heart of the Operone OS. It is responsible for:
- **Process Scheduling**: Managing the lifecycle of system tasks.
- **Resource Orchestration**: Allocating compute and memory resources.
- **Cognitive Processing**: Interpreting high-level intents via the Intelligence Layer.

### `@operone/fs` - Virtual File System
**Type**: Storage Abstraction

A unified interface for file operations across local and remote storage.
- **Universal Access**: Read/write to local disks, network mounts, and cloud storage.
- **Sandboxing**: Secure, scoped file access.
- **Format Parsing**: Native understanding of PDF, Code, and Text formats.

### `@operone/shell` - Command Shell
**Type**: Execution Environment

The secure execution context for system commands.
- **Process Isolation**: Commands run in isolated child processes.
- **Stream Management**: Real-time piping of stdin/stdout/stderr.
- **Security**: Whitelisted command execution.

### `@operone/networking` - Mesh Networking
**Type**: Communication Layer

Enables the distributed nature of the OS.
- **Peer Discovery**: Automatic detection of other OS nodes.
- **Secure Tunneling**: Encrypted inter-node communication (SSH/TLS).
- **RPC**: Remote command execution across the mesh.

### `@operone/memory` - System Context
**Type**: State Management

Manages the short-term state and long-term context of the OS.
- **Session State**: Active user sessions and process data.
- **Vector Store**: Semantic indexing of system logs and history.

---

## 🛠️ Development Tools

### `@repo/types`
**Type**: Shared Definitions

Centralized TypeScript type definitions for all OS subsystems, ensuring type safety across the kernel and applications.

### `@repo/eslint-config`
**Type**: Code Quality

Shared configuration for maintaining code standards across the monorepo.

---

## 📚 Usage Guidelines

### Import Patterns
```typescript
// Import specific subsystems
import { Kernel } from '@repo/operone';
import { VFS } from '@operone/fs';
import { Shell } from '@operone/shell';
```

### Version Compatibility
All packages in the `packages/` directory are versioned together to ensure compatibility within the OS release cycle.

---

**Maintainers**: Operone OS Team
