import { create } from 'zustand';
import axios from 'axios';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';
import dagre from '@dagrejs/dagre'; 

const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;

// --- LAYOUT ENGINE HELPER ---
const nodeWidth = 280; 
const nodeHeight = 140; 

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
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
    // Fallback if dagre fails to position (orphan nodes)
    if (!nodeWithPosition) return node;

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

// --- STORE ---

const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  rawNodes: [], // Keep full dataset in memory
  leaves: [],
  modalState: { type: null, nodeId: null, initialValue: '', initialPriority: 1 },
  
  // FOLDING STATE
  foldedIds: new Set(), // IDs of nodes that are collapsed

  // HIGHLIGHT STATE
  hoveredNodeId: null, 

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
      
      // Initialize foldedIds: All nodes are folded by default
      const initialFolded = new Set(data.map(n => n.id.toString()));

      set({ rawNodes: data, foldedIds: initialFolded });
      get().computeLayout();
      
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

  // --- LAYOUT & VISIBILITY LOGIC ---
  computeLayout: () => {
    const { rawNodes, foldedIds, hoveredNodeId } = get();

    // 1. Build Hierarchy Map
    const nodeMap = new Map();
    rawNodes.forEach(n => nodeMap.set(n.id.toString(), { ...n, children: [] }));
    
    const roots = [];
    rawNodes.forEach(n => {
        const strId = n.id.toString();
        const node = nodeMap.get(strId);
        if (n.parent_id) {
            const parent = nodeMap.get(n.parent_id.toString());
            if (parent) parent.children.push(node);
        } else {
            roots.push(node);
        }
    });

    // 2. Determine Visibility (BFS)
    const visibleNodes = [];
    const visibleEdges = [];
    const queue = [...roots];

    while (queue.length > 0) {
        const node = queue.shift();
        const strId = node.id.toString();

        // Construct ReactFlow Node
        visibleNodes.push({
            id: strId,
            type: 'mindMap',
            data: { 
              label: node.title, 
              priority: node.priority,
              isCompleted: node.is_completed,
              id: node.id,
              parentId: node.parent_id,
              // Pass folding state to component
              isFolded: foldedIds.has(strId),
              hasChildren: node.children.length > 0
            },
            position: { x: 0, y: 0 }, 
        });

        // Add Edges connecting to parent
        if (node.parent_id) {
             visibleEdges.push({
                id: `e${node.parent_id}-${node.id}`,
                source: node.parent_id.toString(),
                target: strId,
                type: 'smoothstep',
                animated: true,
             });
        }

        // If NOT folded, add children to queue to be processed
        if (!foldedIds.has(strId)) {
            queue.push(...node.children);
        }
    }

    // 3. Calculate Layout
    const layout = getLayoutedElements(visibleNodes, visibleEdges);

    // 4. Apply Highlights (Hover Path)
    let finalNodes = layout.nodes;
    let finalEdges = layout.edges;

    if (hoveredNodeId) {
        // Trace ancestors
        const ancestors = new Set();
        let curr = nodeMap.get(hoveredNodeId);
        while (curr) {
            ancestors.add(curr.id.toString());
            curr = curr.parent_id ? nodeMap.get(curr.parent_id.toString()) : null;
        }

        // Apply Styles
        finalNodes = finalNodes.map(node => ({
            ...node,
            style: {
                ...node.style,
                opacity: ancestors.has(node.id) ? 1 : 0.3, // Dim others
                // Border highlight removed as requested
            }
        }));

        finalEdges = finalEdges.map(edge => ({
            ...edge,
            style: {
                stroke: ancestors.has(edge.source) && ancestors.has(edge.target) ? '#3b82f6' : '#555',
                strokeWidth: ancestors.has(edge.source) && ancestors.has(edge.target) ? 3 : 1,
                opacity: ancestors.has(edge.source) && ancestors.has(edge.target) ? 1 : 0.2
            },
            zIndex: ancestors.has(edge.source) && ancestors.has(edge.target) ? 10 : 0
        }));
    } else {
        // Reset styles when no hover
        finalNodes = finalNodes.map(n => ({ ...n, style: { opacity: 1 } }));
        finalEdges = finalEdges.map(e => ({ ...e, style: { stroke: '#555', opacity: 1 } }));
    }

    set({ nodes: finalNodes, edges: finalEdges });
  },

  // --- INTERACTION ACTIONS ---
  
  toggleFold: (nodeId) => {
    const { foldedIds } = get();
    const strId = nodeId.toString();
    const newFolded = new Set(foldedIds);
    
    if (newFolded.has(strId)) {
        newFolded.delete(strId); // Expand
    } else {
        newFolded.add(strId); // Collapse
    }

    set({ foldedIds: newFolded });
    get().computeLayout();
  },

  highlightPath: (nodeId) => {
    if (get().hoveredNodeId === nodeId) return;
    set({ hoveredNodeId: nodeId });
    get().computeLayout();
  },

  // --- CRUD OPERATIONS ---

  addChild: async (parentId, title, priority) => {
    if (!title) return;
    try {
      await axios.post(`${SERVER_URL}/nodes`, { 
        title, 
        parent_id: parentId, 
        priority: parseInt(priority) || 1 
      });
      // Auto expand the parent so we see the new child
      const { foldedIds } = get();
      if (foldedIds.has(parentId.toString())) {
          foldedIds.delete(parentId.toString());
          set({ foldedIds: new Set(foldedIds) });
      }
      get().fetchTree();
      get().fetchLeaves();
    } catch (error) { console.error(error); }
  },

  deleteNode: async (id) => {
    try {
      await axios.delete(`${SERVER_URL}/nodes/${id}`);
      get().fetchTree(); 
      get().fetchLeaves();
    } catch (error) { console.error(error); }
  },

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
    // Optimistic update
    set(state => ({
        nodes: state.nodes.map(n => 
            n.data.id === id ? { ...n, data: { ...n.data, isCompleted: newStatus } } : n
        )
    }));

    try {
      await axios.patch(`${SERVER_URL}/nodes/${id}`, { is_completed: newStatus });
      get().fetchTree(); // Re-fetch to sync
      get().fetchLeaves();
    } catch (error) {
      console.error("Failed to toggle:", error);
      get().fetchTree();
    }
  },

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
}));

export default useStore;
