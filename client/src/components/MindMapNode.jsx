import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, Circle, Trash2, Edit3, Plus, AlertCircle } from 'lucide-react';
import useStore from '../store/useStore';

const MindMapNode = ({ data }) => {
  const { addChild, deleteNode, renameNode, toggleTask } = useStore();

  // If parentId is null, it's the Base Node (Root)
  const isRoot = !data.parentId;
  const isCompleted = data.isCompleted;

  // Dynamic Styles based on state
  const containerStyle = isCompleted
    ? 'border-emerald-500/50 bg-emerald-950/40 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]'
    : 'border-slate-700 bg-slate-900/90 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] hover:border-blue-500/50 hover:shadow-[0_0_25px_-5px_rgba(59,130,246,0.4)]';

  const titleStyle = isCompleted
    ? 'text-emerald-400/70 line-through decoration-emerald-500/50'
    : 'text-slate-100';

  return (
    <div className="relative group">
      
      {/* Incoming Handle (Hidden visually but functional) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-900 transition-colors hover:!bg-blue-500" 
      />

      {/* --- NODE CARD --- */}
      <div 
        className={`
          relative min-w-[200px] max-w-[300px] rounded-2xl border backdrop-blur-xl 
          p-4 transition-all duration-300 ease-out 
          ${containerStyle}
        `}
      >
        
        {/* TOP ROW: Priority & Actions */}
        <div className="flex items-start justify-between mb-3">
            
            {/* Priority / Status Badge */}
            <div 
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors
                ${isCompleted 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                }
              `}
            >
              {isCompleted ? (
                <> <CheckCircle2 size={12} /> <span>Done</span> </>
              ) : (
                <> <AlertCircle size={12} /> <span>Priority {data.priority || 'Low'}</span> </>
              )}
            </div>

            {/* ACTION BUTTONS (Reveal on Hover) */}
            <div className={`flex items-center gap-1 transition-all duration-200 ${isRoot ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0'}`}>
                {/* Rename */}
                <button 
                  onClick={(e) => { e.stopPropagation(); renameNode(data.id, data.label); }}
                  className="p-1.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                  title="Rename"
                >
                  <Edit3 size={14} />
                </button>

                {/* Delete (Hidden for Root) */}
                {!isRoot && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNode(data.id); }}
                    className="p-1.5 rounded-md text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
            </div>
        </div>

        {/* MAIN CONTENT: Checkbox & Label */}
        <div className="flex items-start gap-3">
           <button
             onClick={(e) => {
                e.stopPropagation();
                toggleTask(data.id, isCompleted);
             }}
             className={`
                mt-0.5 flex-shrink-0 transition-transform active:scale-90
                ${isCompleted ? 'text-emerald-500' : 'text-slate-500 hover:text-blue-500'}
             `}
           >
              {isCompleted ? <CheckCircle2 size={22} className="fill-emerald-500/20" /> : <Circle size={22} />}
           </button>

           <div className={`text-sm font-medium leading-tight break-words transition-colors duration-300 ${titleStyle}`}>
              {data.label}
           </div>
        </div>
      </div>

      {/* --- ADD CHILD BUTTON (Floating at bottom) --- */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-10 overflow-hidden pt-2"> 
        <button 
          onClick={(e) => {
            e.stopPropagation();
            addChild(data.id);
          }}
          className="
            flex items-center justify-center w-8 h-8 rounded-full 
            bg-slate-800 border border-slate-700 text-slate-400 
            shadow-lg shadow-black/50
            transition-all duration-200 
            translate-y-8 opacity-0 group-hover:translate-y-0 group-hover:opacity-100
            hover:bg-blue-600 hover:border-blue-500 hover:text-white hover:scale-110
          "
          title="Add Subtask"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Outgoing Handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-900 transition-colors hover:!bg-blue-500" 
      />
    </div>
  );
};

export default memo(MindMapNode);
