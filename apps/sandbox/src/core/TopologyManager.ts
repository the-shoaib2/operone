export type TopologyType = 'star' | 'mesh' | 'bus' | 'ring' | 'tree';

export interface Connection {
    from: string;
    to: string;
}

export class TopologyManager {
    static calculatePositions(
        pcCount: number,
        topology: TopologyType,
        width: number = 800,
        height: number = 600
    ): { x: number; y: number }[] {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.4;

        switch (topology) {
            case 'ring':
                return this.ringLayout(pcCount, centerX, centerY, radius);
            case 'star':
                return this.starLayout(pcCount, centerX, centerY, radius);
            case 'mesh':
                return this.meshLayout(pcCount, centerX, centerY, radius);
            case 'bus':
                return this.busLayout(pcCount, centerX, centerY, width);
            case 'tree':
                return this.treeLayout(pcCount, centerX, centerY, width, height);
            default:
                return this.ringLayout(pcCount, centerX, centerY, radius);
        }
    }

    private static ringLayout(
        count: number,
        centerX: number,
        centerY: number,
        radius: number
    ): { x: number; y: number }[] {
        return Array.from({ length: count }, (_, i) => {
            const angle = (2 * Math.PI * i) / count;
            return {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            };
        });
    }

    private static starLayout(
        count: number,
        centerX: number,
        centerY: number,
        radius: number
    ): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        // Center node (hub)
        positions.push({ x: centerX, y: centerY });

        // Outer nodes
        for (let i = 1; i < count; i++) {
            const angle = (2 * Math.PI * (i - 1)) / (count - 1);
            positions.push({
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            });
        }
        return positions;
    }

    private static meshLayout(
        count: number,
        centerX: number,
        centerY: number,
        radius: number
    ): { x: number; y: number }[] {
        // Similar to ring for mesh (connections will be different)
        return this.ringLayout(count, centerX, centerY, radius);
    }

    private static busLayout(
        count: number,
        centerX: number,
        centerY: number,
        width: number
    ): { x: number; y: number }[] {
        const spacing = (width * 0.8) / (count - 1);
        const startX = centerX - (width * 0.4);

        return Array.from({ length: count }, (_, i) => ({
            x: startX + i * spacing,
            y: centerY,
        }));
    }

    private static treeLayout(
        count: number,
        centerX: number,
        centerY: number,
        width: number,
        height: number
    ): { x: number; y: number }[] {
        const positions: { x: number; y: number }[] = [];
        const levels = Math.ceil(Math.log2(count + 1));

        let nodeIndex = 0;
        for (let level = 0; level < levels && nodeIndex < count; level++) {
            const nodesInLevel = Math.min(Math.pow(2, level), count - nodeIndex);
            const levelY = centerY - (height * 0.35) + (level * (height * 0.7) / (levels - 1));
            const levelWidth = width * 0.8;
            const spacing = levelWidth / (nodesInLevel + 1);

            for (let i = 0; i < nodesInLevel && nodeIndex < count; i++) {
                positions.push({
                    x: centerX - (levelWidth / 2) + spacing * (i + 1),
                    y: levelY,
                });
                nodeIndex++;
            }
        }

        return positions;
    }

    static calculateConnections(
        pcIds: string[],
        topology: TopologyType
    ): Connection[] {
        switch (topology) {
            case 'ring':
                return this.ringConnections(pcIds);
            case 'star':
                return this.starConnections(pcIds);
            case 'mesh':
                return this.meshConnections(pcIds);
            case 'bus':
                return this.busConnections(pcIds);
            case 'tree':
                return this.treeConnections(pcIds);
            default:
                return this.ringConnections(pcIds);
        }
    }

    private static ringConnections(pcIds: string[]): Connection[] {
        const connections: Connection[] = [];
        for (let i = 0; i < pcIds.length; i++) {
            const nextIndex = (i + 1) % pcIds.length;
            connections.push({ from: pcIds[i], to: pcIds[nextIndex] });
        }
        return connections;
    }

    private static starConnections(pcIds: string[]): Connection[] {
        const connections: Connection[] = [];
        if (pcIds.length > 0) {
            const hub = pcIds[0];
            // Connect hub to all other nodes
            for (let i = 1; i < pcIds.length; i++) {
                connections.push({ from: hub, to: pcIds[i] });
            }
        }
        return connections;
    }

    private static meshConnections(pcIds: string[]): Connection[] {
        const connections: Connection[] = [];
        // Full mesh: every node connects to every other node
        for (let i = 0; i < pcIds.length; i++) {
            for (let j = i + 1; j < pcIds.length; j++) {
                connections.push({ from: pcIds[i], to: pcIds[j] });
            }
        }
        return connections;
    }

    private static busConnections(pcIds: string[]): Connection[] {
        const connections: Connection[] = [];
        // Linear bus topology: each node connects to the next in sequence
        for (let i = 0; i < pcIds.length - 1; i++) {
            connections.push({ from: pcIds[i], to: pcIds[i + 1] });
        }
        return connections;
    }


    private static treeConnections(pcIds: string[]): Connection[] {
        const connections: Connection[] = [];
        // Binary tree structure: parent connects to children
        for (let i = 0; i < pcIds.length; i++) {
            const leftChild = 2 * i + 1;
            const rightChild = 2 * i + 2;

            if (leftChild < pcIds.length) {
                connections.push({ from: pcIds[i], to: pcIds[leftChild] });
            }
            if (rightChild < pcIds.length) {
                connections.push({ from: pcIds[i], to: pcIds[rightChild] });
            }
        }
        return connections;
    }

    /**
     * Find routing path between two PCs based on topology
     * Returns array of PC IDs representing the path from source to destination
     */
    static findPath(
        pcIds: string[],
        topology: TopologyType,
        fromId: string,
        toId: string
    ): string[] {
        if (fromId === toId) return [fromId];
        
        const fromIndex = pcIds.indexOf(fromId);
        const toIndex = pcIds.indexOf(toId);
        
        if (fromIndex === -1 || toIndex === -1) return [];

        switch (topology) {
            case 'star':
                return this.findStarPath(pcIds, fromIndex, toIndex);
            case 'mesh':
                return this.findMeshPath(pcIds, fromIndex, toIndex);
            case 'bus':
                return this.findBusPath(pcIds, fromIndex, toIndex);
            case 'ring':
                return this.findRingPath(pcIds, fromIndex, toIndex);
            case 'tree':
                return this.findTreePath(pcIds, fromIndex, toIndex);
            default:
                return [pcIds[fromIndex], pcIds[toIndex]];
        }
    }

    private static findStarPath(pcIds: string[], fromIndex: number, toIndex: number): string[] {
        // Star topology: all traffic routes through hub (index 0)
        const hub = pcIds[0];
        const from = pcIds[fromIndex];
        const to = pcIds[toIndex];

        if (fromIndex === 0) {
            // From hub to spoke
            return [from, to];
        } else if (toIndex === 0) {
            // From spoke to hub
            return [from, to];
        } else {
            // From spoke to spoke via hub
            return [from, hub, to];
        }
    }

    private static findMeshPath(pcIds: string[], fromIndex: number, toIndex: number): string[] {
        // Mesh topology: direct connection between any two nodes
        return [pcIds[fromIndex], pcIds[toIndex]];
    }

    private static findBusPath(pcIds: string[], fromIndex: number, toIndex: number): string[] {
        // Bus topology: linear path along the bus
        const path: string[] = [];
        const start = Math.min(fromIndex, toIndex);
        const end = Math.max(fromIndex, toIndex);
        
        for (let i = start; i <= end; i++) {
            path.push(pcIds[i]);
        }
        
        // Reverse if going backwards
        if (fromIndex > toIndex) {
            path.reverse();
        }
        
        return path;
    }

    private static findRingPath(pcIds: string[], fromIndex: number, toIndex: number): string[] {
        // Ring topology: shortest circular path
        const n = pcIds.length;
        const clockwiseDist = (toIndex - fromIndex + n) % n;
        const counterClockwiseDist = (fromIndex - toIndex + n) % n;
        
        const path: string[] = [];
        
        if (clockwiseDist <= counterClockwiseDist) {
            // Go clockwise
            for (let i = 0; i <= clockwiseDist; i++) {
                path.push(pcIds[(fromIndex + i) % n]);
            }
        } else {
            // Go counter-clockwise
            for (let i = 0; i <= counterClockwiseDist; i++) {
                path.push(pcIds[(fromIndex - i + n) % n]);
            }
        }
        
        return path;
    }

    private static findTreePath(pcIds: string[], fromIndex: number, toIndex: number): string[] {
        // Tree topology: traverse up to common ancestor, then down
        const path: string[] = [];
        
        // Find path from source to root
        const pathToRoot: number[] = [];
        let current = fromIndex;
        while (current >= 0) {
            pathToRoot.push(current);
            if (current === 0) break; // Reached root
            current = Math.floor((current - 1) / 2); // Parent in binary tree
        }
        
        // Find path from destination to root
        const targetPathToRoot: number[] = [];
        current = toIndex;
        while (current >= 0) {
            targetPathToRoot.push(current);
            if (current === 0) break;
            current = Math.floor((current - 1) / 2);
        }
        
        // Find common ancestor
        let commonAncestor = 0;
        for (let i = pathToRoot.length - 1; i >= 0; i--) {
            for (let j = targetPathToRoot.length - 1; j >= 0; j--) {
                if (pathToRoot[i] === targetPathToRoot[j]) {
                    commonAncestor = pathToRoot[i];
                    break;
                }
            }
        }
        
        // Build path: from source to common ancestor
        for (let i = 0; i < pathToRoot.length; i++) {
            path.push(pcIds[pathToRoot[i]]);
            if (pathToRoot[i] === commonAncestor) break;
        }
        
        // Then from common ancestor to destination (skip common ancestor as it's already in path)
        const descendPath: number[] = [];
        for (let i = 0; i < targetPathToRoot.length; i++) {
            if (targetPathToRoot[i] === commonAncestor) {
                // Add remaining path in reverse
                for (let j = i - 1; j >= 0; j--) {
                    descendPath.push(targetPathToRoot[j]);
                }
                break;
            }
        }
        
        for (const idx of descendPath) {
            path.push(pcIds[idx]);
        }
        
        return path;
    }
}

