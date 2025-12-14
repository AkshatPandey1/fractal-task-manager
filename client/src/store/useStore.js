import { create } from 'zustand';
import axios from 'axios';
import { applyNodeChanges, applyEdgeChanges } from 'reactflow';

const SERVER_URL = `${window.location.protocol}//${window.location.hostname}:5000/api`;

const useStore = create((set, get) => ({
  nodes: [],
  edges: [],
  leaves: [],

  // --- NEW: UI STATE for Modals ---
  modalState: { type: null, nodeId: null, initialValue: '' },

  openModal: (type, nodeId, initialValue = '') => 
    set({ modalState: { type, nodeId, initialValue } }),

  closeModal: () => 
    set({ modalState: { type: null, nodeId: null, initialValue: '' } }),

  // --- FETCHERS ---
  fetchTree: async () => {
    try {
      const response = await axios.get(`${SERVER_URL}/nodes`);
      const data = response.data;

      const flowNodes = data.map((node) => ({
        id: node.id.toString(),
        type: 'mindMap',
        position: { x: 0, y: 0 }, // Layout will handle this
        data: { 
          label: node.title, 
          priority: node.priority,
          isCompleted: node.is_completed,
          id: node.id,
          parentId: node.parent_id 
        },
        parentNode: node.parent_id ? node.parent_id.toString() : undefined,
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

      set({ nodes: flowNodes, edges: flowEdges });
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

  // --- ACTIONS ---

  // REFACTORED: Now accepts title directly (no prompt)
  addChild: async (parentId, title) => {
    if (!title) return;
    try {
      await axios.post(`${SERVER_URL}/nodes`, { title, parent_id: parentId, priority: 1 });
      get().fetchTree();
    } catch (error) { console.error(error); }
  },

  // REFACTORED: No confirm dialog here anymore
  deleteNode: async (id) => {
    // Optimistic delete
    set({ nodes: get().nodes.filter(n => n.id !== id.toString()) });
    try {
      await axios.delete(`${SERVER_URL}/nodes/${id}`);
      get().fetchTree(); 
    } catch (error) { 
        console.error(error); 
        get().fetchTree(); // Revert if failed
    }
  },

  // REFACTORED: Now accepts newTitle directly (no prompt)
  renameNode: async (id, newTitle) => {
    if (!newTitle) return;
    try {
        await axios.patch(`${SERVER_URL}/nodes/${id}`, { title: newTitle });
        get().fetchTree();
    } catch (error) { console.error(error); }
  },

  toggleTask: async (id, currentStatus) => {
    const newStatus = !currentStatus;
    
    // Update Map View immediately
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
