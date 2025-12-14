import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, Circle, Trash2, Edit3, Plus } from 'lucide-react';
import useStore from '../store/useStore';

const MindMapNode = ({ data }) => {
  // Destructure openModal
  const { openModal, toggleTask } = useStore();
  
  const isRoot = !data.parentId;
  const isCompleted = data.isCompleted;

  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div 
        className={`
          relative min-w-[240px] overflow-hidden rounded-2xl border 
          backdrop-blur-2xl transition-all duration-300
          ${isCompleted 
            ? 'border-emerald-500/20 bg-emerald-950/20 opacity-60 grayscale-[0.5]' 
            : 'border-white/10 bg-[#1A1A1A]/80 shadow-2xl hover:border-blue-500/50 hover:shadow-blue-500/10'
          }
        `}
      >
        {/* Decorative Top Gradient Line */}
        {!isCompleted && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80" />}

        <div className="p-5">
            {/* Header: Priority Badge & Actions */}
            <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${
                    isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-gray-400'
                }`}>
                    {isCompleted ? 'Done' : `Priority ${data.priority || 0}`}
                </span>
                
                {/* Actions (Only show on hover) */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* RENAME BUTTON */}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        openModal('rename', data.id, data.label); 
                      }} 
                      className="text-gray-500 hover:text-white"
                    >
                      <Edit3 size={14}/>
                    </button>

                    {/* DELETE BUTTON */}
                    {!isRoot && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          openModal('delete', data.id); 
                        }} 
                        className="text-gray-500 hover:text-red-400"
                      >
                        <Trash2 size={14}/>
                      </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex items-start gap-4">
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleTask(data.id, isCompleted); }}
                    className={`mt-1 rounded-full p-1 transition-colors ${isCompleted ? 'text-emerald-500' : 'text-gray-600 hover:text-blue-400'}`}
                >
                    {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                <div className={`text-base font-medium leading-relaxed ${isCompleted ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                    {data.label}
                </div>
            </div>
        </div>
      </div>

      {/* ADD CHILD BUTTON */}
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          openModal('add', data.id); 
        }}
        className="
            absolute -bottom-4 left-1/2 -translate-x-1/2 z-20 
            flex h-8 w-8 items-center justify-center rounded-full 
            bg-blue-600 text-white shadow-lg shadow-blue-600/40
            transition-all hover:scale-110 active:scale-95
            opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0
        "
      >
        <Plus size={16} strokeWidth={3} />
      </button>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};
export default memo(MindMapNode);
