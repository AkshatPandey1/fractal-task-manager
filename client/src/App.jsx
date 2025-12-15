import React, { useEffect, useState } from 'react';
import ReactFlow, { Background, Controls, ReactFlowProvider, Panel } from 'reactflow';
import 'reactflow/dist/style.css'; 
import FocusMode from './components/FocusMode';
import GlobalModal from './components/GlobalModal'; 
import useStore from './store/useStore';
import MindMapNode from './components/MindMapNode';
import TaskList from './components/TaskList'; 

const nodeTypes = { mindMap: MindMapNode };

function Flow() {
  const { fetchTree, nodes, edges, onNodesChange, onEdgesChange } = useStore();
  
  // Fetch tree data on mount. The store now handles the Dagre layout automatically.
  useEffect(() => { 
    fetchTree(); 
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      // Allow users to tweak the layout manually after auto-layout
      nodesDraggable={true} 
      // Prevent manual wiring since the structure is logic-based (parent/child)
      nodesConnectable={false} 
    >
      <Background color="#333" gap={20} />
      <Controls />
      
      {/* Helper Panel for the new Focus Feature */}
      <Panel position="top-left" className="bg-white/5 p-2 rounded text-xs text-gray-400 backdrop-blur-md border border-white/10">
        Click a node to Focus Branch
      </Panel>
    </ReactFlow>
  );
}

export default function App() {
  const [view, setView] = useState('map');
  const [showFocus, setShowFocus] = useState(false);

  return (
    <div className="relative w-screen h-screen bg-[#171717]">
      
      {/* Global Modal for Add/Edit/Delete actions */}
      <GlobalModal />

      {/* Focus Mode Overlay */}
      {showFocus && <FocusMode onClose={() => setShowFocus(false)} />}

      {/* Floating Dock Navigation */}
      <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl shadow-2xl transition-all hover:scale-105 hover:bg-white/10">

        <button
          onClick={() => setView('map')}
          className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            view === 'map'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Mind Map
        </button>

        <button
          onClick={() => setView('list')}
          className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
            view === 'list'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          Task List
        </button>

        <div className="mx-2 h-6 w-px bg-white/10"></div>

        <button
          onClick={() => setShowFocus(true)}
          className="group relative flex items-center gap-2 rounded-xl bg-gradient-to-tr from-emerald-500 to-green-400 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-emerald-500/20 transition-all hover:brightness-110"
        >
           <span>Focus Mode</span>
        </button>
      </div>

      <ReactFlowProvider>
        {view === 'map' ? <Flow /> : <div className="h-full overflow-y-auto pb-32"><TaskList /></div>}
      </ReactFlowProvider>
    </div>
  );
}
