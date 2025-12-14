import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css'; 
import FocusMode from './components/FocusMode';
import useStore from './store/useStore';
import MindMapNode from './components/MindMapNode';
import TaskList from './components/TaskList'; // <--- Import the list

const nodeTypes = { mindMap: MindMapNode };

// --- Layout Logic (Same as before) ---
const getLayoutedNodes = (nodes) => {
    if (nodes.length === 0) return [];
    const levels = {};
    nodes.forEach(node => {
        let depth = 0;
        let p = node.parentNode;
        while(p) {
            depth++;
            const parent = nodes.find(n => n.id === p);
            p = parent ? parent.parentNode : null;
        }
        if (!levels[depth]) levels[depth] = [];
        levels[depth].push(node);
    });
    return nodes.map(node => {
        let depth = 0;
        let p = node.parentNode;
        while(p) {
            depth++;
            const parent = nodes.find(n => n.id === p);
            p = parent ? parent.parentNode : null;
        }
        const indexInLevel = levels[depth].findIndex(n => n.id === node.id);
        const totalInLevel = levels[depth].length;
        return { ...node, position: { x: (indexInLevel - totalInLevel / 2) * 200 + 100, y: depth * 150 } };
    });
};

function Flow() {
  const { fetchTree, nodes, edges, onNodesChange, onEdgesChange } = useStore();
  useEffect(() => { fetchTree(); }, []);
  const layoutedNodes = useMemo(() => getLayoutedNodes(nodes), [nodes]);

  return (
    <ReactFlow
      nodes={layoutedNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background color="#333" gap={20} />
      <Controls />
    </ReactFlow>
  );
}

export default function App() {
  const [view, setView] = useState('map');
  const [showFocus, setShowFocus] = useState(false); // <--- State

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#171717', position: 'relative' }}>

      {/* 1. THE POPUP WINDOW */}
      {showFocus && <FocusMode onClose={() => setShowFocus(false)} />}

      {/* 2. THE TOP BAR */}
      <div className="absolute top-5 right-5 z-50 flex gap-2 rounded-lg bg-black/50 p-1 backdrop-blur-md border border-white/10">

        {/* THE NEW BUTTON */}
        <button
            onClick={() => setShowFocus(true)}
            className="px-4 py-2 text-sm font-bold rounded-md bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:brightness-110"
        >
            🎯 Focus
        </button>

        {/* Existing Buttons */}
        <button
            onClick={() => setView('map')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${view === 'map' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            Map
        </button>
        <button
            onClick={() => setView('list')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
        >
            List
        </button>
      </div>

      <ReactFlowProvider>
        {view === 'map' ? <Flow /> : <div className="h-full overflow-y-auto"><TaskList /></div>}
      </ReactFlowProvider>
    </div>
  );
}
