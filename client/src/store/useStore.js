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

// --- FRACTAL PROGRESS CALCULATOR ---
const calculateFractalProgress = (rawNodes) => {
    const nodeMap = new Map();
    rawNodes.forEach(n => nodeMap.set(n.id, { ...n, children: [] }));
    
    rawNodes.forEach(n => {
        if (n.parent_id && nodeMap.has(n.parent_id)) {
            nodeMap.get(n.parent_id).children.push(nodeMap.get(n.id));
        }
    });

    const progressMap = new Map();

    const getProgress = (node) => {
        if (node.children.length === 0) {
            return node.is_completed ? 100 : 0;
        }
        let total = 0;
        node.children.forEach(child => {
            total += getProgress(child);
        });
        const result = total / node.children.length;
        progressMap.set(node.id, result);
        return result;
    };

    rawNodes.forEach(n => {
        if (!progressMap.has(n.id)) getProgress(nodeMap.get(n.id));
    });

    return progressMap;
};

// --- STORE ---

const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  rawNodes: [], 
  leaves: [],
  progressMap: new Map(),

  modalState: { type: null, nodeId: null, initialValue: '', initialPriority: 1 },
  
  // STATE
  foldedIds: new Set(),
  hoveredNodeId: null, 
  hoistedNodeId: null, 
  focusedNodeId: null, 

  // --- ACTIONS ---
  openModal: (type, nodeId, initialValue = '', initialPriority = 1) => 
    set({ modalState: { type, nodeId, initialValue, initialPriority } }),

  closeModal: () => 
    set({ modalState: { type: null, nodeId: null, initialValue: '', initialPriority: 1 } }),

  setHoistedNode: (id) => {
    set({ hoistedNodeId: id });
    get().computeLayout();
  },

  setFocus: (id) => {
     set({ focusedNodeId: id });
  },

  moveFocus: (direction) => {
    const { focusedNodeId, rawNodes } = get();
    if (!focusedNodeId) {
        if (rawNodes.length > 0) set({ focusedNodeId: rawNodes[0].id.toString() });
        return;
    }

    const current = rawNodes.find(n => n.id.toString() === focusedNodeId);
    if (!current) return;

    let nextId = null;

    if (direction === 'UP') {
        if (current.parent_id) nextId = current.parent_id.toString();
    } 
    else if (direction === 'DOWN') {
        const children = rawNodes.filter(n => n.parent_id === current.id).sort((a,b) => a.id - b.id);
        if (children.length > 0) nextId = children[0].id.toString();
    }
    else if (direction === 'LEFT' || direction === 'RIGHT') {
        const siblings = rawNodes.filter(n => n.parent_id === current.parent_id).sort((a,b) => a.id - b.id);
        const idx = siblings.findIndex(n => n.id === current.id);
        
        if (direction === 'LEFT' && idx > 0) nextId = siblings[idx - 1].id.toString();
        if (direction === 'RIGHT' && idx < siblings.length - 1) nextId = siblings[idx + 1].id.toString();
    }

    if (nextId) {
        set({ focusedNodeId: nextId });
    }
  },

  // --- DATA FETCHING ---
  fetchTree: async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/nodes`);
      const data = response.data;
      const progress = calculateFractalProgress(data);

      // FIX: Only initialize foldedIds if it's currently empty (first load).
      // Otherwise, keep the user's current folding state.
      const currentFolded = get().foldedIds;
      let newFolded = currentFolded;
      
      if (currentFolded.size === 0 && data.length > 0) {
          // Initial state: Fold everything
          newFolded = new Set(data.map(n => n.id.toString()));
      }

      set({ rawNodes: data, foldedIds: newFolded, progressMap: progress });
      
      if (!get().focusedNodeId && data.length > 0) {
         set({ focusedNodeId: data[0].id.toString() });
      }

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

  // --- LAYOUT ENGINE ---
  computeLayout: () => {
    const { rawNodes, foldedIds, hoveredNodeId, hoistedNodeId, progressMap, focusedNodeId } = get();

    let relevantNodes = rawNodes;
    if (hoistedNodeId) {
        const descendants = new Set();
        const queue = [hoistedNodeId];
        while(queue.length > 0) {
            const currentId = queue.shift();
            descendants.add(currentId);
            rawNodes.filter(n => n.parent_id == currentId).forEach(child => queue.push(child.id));
        }
        relevantNodes = rawNodes.filter(n => descendants.has(n.id));
    }

    const nodeMap = new Map();
    relevantNodes.forEach(n => nodeMap.set(n.id.toString(), { ...n, children: [] }));
    
    const roots = [];
    relevantNodes.forEach(n => {
        const strId = n.id.toString();
        const node = nodeMap.get(strId);
        
        if (n.id == hoistedNodeId) {
            roots.push(node);
        }
        else if (n.parent_id && nodeMap.has(n.parent_id.toString())) {
            const parent = nodeMap.get(n.parent_id.toString());
            parent.children.push(node);
        } 
        else if (!n.parent_id) {
            roots.push(node);
        }
    });

    const visibleNodes = [];
    const visibleEdges = [];
    const queue = [...roots];

    while (queue.length > 0) {
        const node = queue.shift();
        const strId = node.id.toString();

        visibleNodes.push({
            id: strId,
            type: 'mindMap',
            data: { 
              label: node.title, 
              priority: node.priority,
              isCompleted: node.is_completed,
              id: node.id,
              parentId: node.parent_id,
              isFolded: foldedIds.has(strId),
              hasChildren: node.children.length > 0,
              progress: progressMap.get(node.id) || 0,
              isFocused: strId === focusedNodeId 
            },
            position: { x: 0, y: 0 }, 
        });

        if (node.parent_id && node.id != hoistedNodeId) {
             visibleEdges.push({
                id: `e${node.parent_id}-${node.id}`,
                source: node.parent_id.toString(),
                target: strId,
                type: 'smoothstep',
                animated: true,
             });
        }

        if (!foldedIds.has(strId)) {
            queue.push(...node.children);
        }
    }

    const layout = getLayoutedElements(visibleNodes, visibleEdges);

    let finalNodes = layout.nodes;
    let finalEdges = layout.edges;

    if (hoveredNodeId) {
        const ancestors = new Set();
        let curr = rawNodes.find(n => n.id.toString() === hoveredNodeId);
        while (curr) {
            ancestors.add(curr.id.toString());
            curr = rawNodes.find(n => n.id === curr.parent_id);
        }

        finalNodes = finalNodes.map(node => ({
            ...node,
            style: {
                ...node.style,
                opacity: ancestors.has(node.id) ? 1 : 0.3,
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
    }

    set({ nodes: finalNodes, edges: finalEdges });
  },

  // --- INTERACTION ACTIONS ---
  
  toggleFold: (nodeId) => {
    const { foldedIds } = get();
    const strId = nodeId.toString();
    const newFolded = new Set(foldedIds);
    if (newFolded.has(strId)) newFolded.delete(strId); 
    else newFolded.add(strId); 
    set({ foldedIds: newFolded });
    get().computeLayout();
  },

  highlightPath: (nodeId) => {
    if (get().hoveredNodeId === nodeId) return;
    set({ hoveredNodeId: nodeId });
    get().computeLayout();
  },

  addChild: async (parentId, title, priority) => {
    if (!title) return;
    try {
      await axios.post(`${SERVER_URL}/nodes`, { 
        title, 
        parent_id: parentId, 
        priority: parseInt(priority) || 1 
      });
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

  onNodesChange: (changes) => set({ nodes: applyNodeChanges(changes, get().nodes) }),
  onEdgesChange: (changes) => set({ edges: applyEdgeChanges(changes, get().edges) }),
}));

export default useStore;
