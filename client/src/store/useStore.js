import { create } from 'zustand';
import axios from 'axios';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import dagre from '@dagrejs/dagre'; 

const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;

// --- LAYOUT ENGINE CONFIG ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 280; 
const nodeHeight = 140; 

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
  modalState: { type: null, nodeId: null, initialValue: '', initialPriority: 1 },

  // UI STATE
  focusedNodeId: null, 

  // --- MODAL ACTIONS ---
  openModal: (type, nodeId, initialValue = '', initialPriority = 1) => 
    set({ modalState: { type, nodeId, initialValue, initialPriority } }),

  closeModal: () => 
    set({ modalState: { type: null, nodeId: null, initialValue: '', initialPriority: 1 } }),

  // --- DATA FETCHING ---
  fetchTree: async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/nodes`);
      const data = response.data;

      const flowNodes = data.map((node) => ({
        id: node.id.toString(),
        type: 'mindMap',
        hidden: false, 
        data: { 
          label: node.title, 
          priority: node.priority,
          isCompleted: node.is_completed,
          id: node.id,
          parentId: node.parent_id,
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
      
      // If we are currently focused on a node, re-apply the focus filter
      if (get().focusedNodeId) {
        get().setFocus(get().focusedNodeId);
      }
      
    } catch (error) {
      console.error("Failed to fetch tree:", error);
    }
  },

  fetchLeaves: async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/leaves`);
      set({ leaves: response.data });
    } catch (error) { console.error(error); }
  },

  // --- NODE ACTIONS ---

  addChild: async (parentId, title, priority) => {
    if (!title) return;
    try {
      await axios.post(`${SERVER_URL}/nodes`, { 
        title, 
        parent_id: parentId, 
        priority: parseInt(priority) || 1 
      });
      get().fetchTree();
      get().fetchLeaves();
    } catch (error) { console.error(error); }
  },

  deleteNode: async (id) => {
    // Optimistic delete
    set({ nodes: get().nodes.filter(n => n.id !== id.toString()) });
    try {
      await axios.delete(`${SERVER_URL}/nodes/${id}`);
      get().fetchTree(); 
      get().fetchLeaves();
    } catch (error) { 
        console.error(error); 
        get().fetchTree(); // Revert if failed
    }
  },

  // Updated to support Title AND Priority
  updateNode: async (id, title, priority) => {
    if (!title) return;
    try {
        await axios.patch(`${SERVER_URL}/nodes/${id}`, { 
            title: title, 
            priority: parseInt(priority) 
        });
        get().fetchTree();
        get().fetchLeaves();
    } catch (error) { console.error(error); }
  },

  toggleTask: async (id, currentStatus) => {
    const newStatus = !currentStatus;
    
    // Update Map View immediately (Optimistic)
    set(state => ({
        nodes: state.nodes.map(n => 
            n.data.id === id ? { ...n, data: { ...n.data, isCompleted: newStatus } } : n
        )
    }));

    try {
      await axios.patch(`${SERVER_URL}/nodes/${id}`, { is_completed: newStatus });
      get().fetchTree();
      get().fetchLeaves();
    } catch (error) {
      console.error("Failed to toggle:", error);
      get().fetchTree();
    }
  },

  // --- VISUALIZATION LOGIC ---

  setFocus: (nodeId) => {
    const { nodes, edges } = get();
    
    // Toggle Off if clicking the same node
    if (get().focusedNodeId === nodeId) {
      set({ 
        focusedNodeId: null, 
        nodes: nodes.map(n => ({ 
            ...n, 
            hidden: false, 
            style: { ...n.style, opacity: 1, pointerEvents: 'all' } 
        })),
        edges: edges.map(e => ({ 
            ...e, 
            hidden: false, 
            style: { ...e.style, stroke: '#555', opacity: 1 } 
        }))
      });
      return;
    }

    set({ focusedNodeId: nodeId });

    // Find relatives (Ancestors + Descendants)
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

    // Update Nodes: Dim non-relatives
    const updatedNodes = nodes.map(node => {
        const isRelative = relatives.has(node.id);
        return {
            ...node,
            style: { 
                ...node.style,
                opacity: isRelative ? 1 : 0.1,
                pointerEvents: isRelative ? 'all' : 'none' 
            },
        };
    });

    // Update Edges: Highlight path
    const updatedEdges = edges.map(edge => {
        const isPath = relatives.has(edge.source) && relatives.has(edge.target);
        return {
            ...edge,
            style: { 
                stroke: isPath ? '#3b82f6' : '#333',
                strokeWidth: isPath ? 3 : 1,
                opacity: isPath ? 1 : 0.1
            },
            zIndex: isPath ? 10 : 0
        };
    });

    set({ nodes: updatedNodes, edges: updatedEdges });
  },

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
}));

export default useStore;
