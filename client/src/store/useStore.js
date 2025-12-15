// client/src/store/useStore.js
import { create } from 'zustand';
import axios from 'axios';
import { applyNodeChanges, applyEdgeChanges, getIncomers, getOutgoers } from 'reactflow';
import dagre from '@dagrejs/dagre'; // <--- IMPORT DAGRE

const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;

// --- LAYOUT ENGINE CONFIG ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 280; // Width of your MindMapNode
const nodeHeight = 140; // Approx height

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: 'top',
      sourcePosition: 'bottom',
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};
// ----------------------------

const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  leaves: [],
  modalState: { type: null, nodeId: null, initialValue: '' },

  // UI STATE
  focusedNodeId: null, // The node we are currently focusing on

  openModal: (type, nodeId, initialValue = '') => 
    set({ modalState: { type, nodeId, initialValue } }),
  closeModal: () => 
    set({ modalState: { type: null, nodeId: null, initialValue: '' } }),

  fetchTree: async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/nodes`);
      const data = response.data;

      const flowNodes = data.map((node) => ({
        id: node.id.toString(),
        type: 'mindMap',
        // We initially set hidden: false. We'll control visibility dynamically.
        hidden: false, 
        data: { 
          label: node.title, 
          priority: node.priority,
          isCompleted: node.is_completed,
          id: node.id,
          parentId: node.parent_id,
          // Add a helper to toggle focus
          onFocus: () => get().setFocus(node.id.toString())
        },
        position: { x: 0, y: 0 }, 
      }));

      const flowEdges = data
        .filter(n => n.parent_id)
        .map(n => ({
          id: `e${n.parent_id}-${n.id}`,
          source: n.parent_id.toString(),
          target: n.id.toString(),
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#555' }
        }));

      // Apply initial layout
      const layout = getLayoutedElements(flowNodes, flowEdges);
      set({ nodes: layout.nodes, edges: layout.edges });
      
    } catch (error) {
      console.error("Failed to fetch tree:", error);
    }
  },

  // --- NEW: FOCUS & COLLAPSE LOGIC ---
  setFocus: (nodeId) => {
    const { nodes, edges } = get();
    
    // 1. If clicking the same node, un-focus (show all)
    if (get().focusedNodeId === nodeId) {
      set({ 
        focusedNodeId: null, 
        nodes: nodes.map(n => ({ ...n, hidden: false, style: { opacity: 1 } })),
        edges: edges.map(e => ({ ...e, hidden: false, style: { ...e.style, stroke: '#555', opacity: 1 } }))
      });
      return;
    }

    set({ focusedNodeId: nodeId });

    // 2. Traversal Helper: Find all relatives (Ancestors + Descendants)
    const relatives = new Set();
    const visited = new Set();
    
    const traverse = (currentId, direction) => {
        if (visited.has(currentId)) return;
        visited.add(currentId);
        relatives.add(currentId);

        if (direction === 'both' || direction === 'up') {
            const incoming = edges.filter(e => e.target === currentId);
            incoming.forEach(e => traverse(e.source, 'up'));
        }
        if (direction === 'both' || direction === 'down') {
            const outgoing = edges.filter(e => e.source === currentId);
            outgoing.forEach(e => traverse(e.target, 'down'));
        }
    };

    traverse(nodeId, 'both');

    // 3. Update Nodes: Dim/Hide others, Highlight path
    const updatedNodes = nodes.map(node => {
        const isRelative = relatives.has(node.id);
        return {
            ...node,
            // Option A: Hide completely (Collapsing behavior)
            // hidden: !isRelative, 
            
            // Option B: Dim non-relatives (Focus behavior) - BETTER UI
            style: { 
                opacity: isRelative ? 1 : 0.1,
                pointerEvents: isRelative ? 'all' : 'none' 
            },
        };
    });

    // 4. Update Edges: Highlight the path
    const updatedEdges = edges.map(edge => {
        const isPath = relatives.has(edge.source) && relatives.has(edge.target);
        return {
            ...edge,
            style: { 
                stroke: isPath ? '#3b82f6' : '#333', // Blue if active, dark if not
                strokeWidth: isPath ? 3 : 1,
                opacity: isPath ? 1 : 0.1
            },
            // hidden: !isPath // Uncomment if using Option A (Hide)
        };
    });

    set({ nodes: updatedNodes, edges: updatedEdges });
  },

  // --- EXISTING ACTIONS (Keep these) ---
  fetchLeaves: async () => { /* ... existing code ... */ },
  addChild: async (parentId, title) => { /* ... existing code ... */ },
  deleteNode: async (id) => { /* ... existing code ... */ },
  renameNode: async (id, newTitle) => { /* ... existing code ... */ },
  toggleTask: async (id, currentStatus) => { /* ... existing code ... */ },
  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
}));

export default useStore;
