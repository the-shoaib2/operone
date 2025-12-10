import { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Monitor } from 'lucide-react';
import { useSimulation } from '../context/SimulationContext';
import { TopologyManager, type TopologyType } from '../core/TopologyManager';

interface NetworkMapProps {
  topology?: TopologyType;
}

export const NetworkMap = ({ topology = 'ring' }: NetworkMapProps) => {
  const { network, selectedPC, selectPC } = useSimulation();

  // Memoize pcs array to prevent unnecessary recalculations
  const pcs = useMemo(() => network.getAllPCs(), [network]);
  const pcIds = useMemo(() => pcs.map(pc => pc.id), [pcs]);
  const selectedPCId = selectedPC?.id;

  const initialNodes: Node[] = useMemo(() => {
    if (pcs.length === 0) return [];

    const positions = TopologyManager.calculatePositions(pcs.length, topology);

    return pcs.map((pc, index) => {
      const isSelected = selectedPCId === pc.id;
      const position = positions[index] || { x: 0, y: 0 };

      return {
        id: pc.id,
        data: {
          label: (
            <div className="flex flex-col items-center gap-2 p-2">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg border border-blue-500/30">
                <Monitor className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-white">{pc.hostname}</span>
              <span className="text-[10px] text-gray-400">PC-{pc.id}</span>
            </div>
          )
        },
        position,
        style: {
          padding: 0,
          borderRadius: '12px',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: isSelected ? '#3b82f6' : '#374151',
          backgroundColor: isSelected ? '#1e40af20' : '#1f2937',
          color: '#e5e5e5',
          boxShadow: isSelected
            ? '0 0 20px rgba(59, 130, 246, 0.5), 0 0 0 2px #3b82f6'
            : '0 4px 6px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.3s ease',
        },
      } satisfies Node;
    });
  }, [pcs, selectedPCId, topology]);

  const initialEdges: Edge[] = useMemo(() => {
    if (pcs.length < 2) return [];

    const connections = TopologyManager.calculateConnections(pcIds, topology);

    return connections.map(conn => ({
      id: `${conn.from}-${conn.to}`,
      source: conn.from,
      target: conn.to,
      type: 'smoothstep',
      style: { 
        stroke: topology === 'mesh' ? '#10b981' : topology === 'star' ? '#f59e0b' : topology === 'ring' ? '#8b5cf6' : topology === 'tree' ? '#ef4444' : '#60a5fa', 
        strokeWidth: topology === 'mesh' ? 1 : 2,
        strokeDasharray: topology === 'mesh' ? '3,3' : topology === 'bus' ? '8,4' : 'none'
      },
      animated: topology === 'mesh',
    } satisfies Edge));
  }, [pcIds, topology]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectPC(node.id);
    },
    [selectPC],
  );

  return (
    <div className="h-full w-full bg-dark-bg flex flex-col">
      <div className="p-2 border-b border-dark-border">
        <h2 className="text-lg font-bold text-white">Network Topology</h2>
        <p className="text-[10px] text-dark-muted mt-0.5">
          {topology.charAt(0).toUpperCase() + topology.slice(1)} topology • {pcs.length} nodes
        </p>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
          fitViewOptions={{ padding: 0.3, minZoom: 0.5, maxZoom: 1.5 }}
        >
          <MiniMap
            nodeStrokeColor="#3b82f6"
            nodeColor="#1f2937"
            maskColor="rgba(17, 24, 39, 0.8)"
            position="top-right"
            style={{
              backgroundColor: 'rgba(31, 41, 55, 0.9)',
              border: '1px solid #374151'
            }}
          />
          <Controls 
            style={{
              backgroundColor: 'rgba(31, 41, 55, 0.9)',
              border: '1px solid #374151',
              borderRadius: '8px'
            }}
          />
          <Background 
            color="#374151" 
            gap={20} 
            size={1}
            variant="dots"
          />
        </ReactFlow>
      </div>
    </div>
  );
};
