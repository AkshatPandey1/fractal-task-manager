import React, { memo, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { CheckCircle2, Circle, Trash2, Edit3, Plus, ChevronDown } from 'lucide-react';
import useStore from '../store/useStore';
import confetti from 'canvas-confetti';

const MindMapNode = ({ data }) => {
  const { openModal, toggleTask, toggleFold, highlightPath, setHoistedNode } = useStore();
  
  const isRoot = !data.parentId;
  const isCompleted = data.isCompleted;
  const hasChildren = data.hasChildren;
  const isFolded = data.isFolded;
  const progress = data.progress || 0;
  const isFocused = data.isFocused;

  // --- SUPERNOVA EFFECT ---
  useEffect(() => {
    if (isCompleted && hasChildren) {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#10b981', '#ffffff']
        });
    }
  }, [isCompleted, hasChildren]);

  return (
    <div 
        className="relative group"
        onMouseEnter={() => highlightPath(data.id.toString())}
        onMouseLeave={() => highlightPath(null)}
        onDoubleClick={(e) => {
            e.stopPropagation();
            setHoistedNode(data.id);
        }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      {/* Main Node Card */}
      <div 
        className={`
          relative min-w-[240px] overflow-hidden rounded-2xl border 
          backdrop-blur-2xl transition-all duration-300
          ${isFocused ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-black' : ''}
          ${isCompleted 
            ? 'border-emerald-500/20 bg-emerald-950/20 opacity-60 grayscale-[0.5]' 
            : 'border-white/10 bg-[#1A1A1A]/80 shadow-2xl'
          }
        `}
      >
        {/* Liquid Progress Bar */}
        {!isCompleted && progress > 0 && (
            <div 
                className="liquid-wave" 
                style={{ 
                    top: `${100 - progress}%`,
                    transition: 'top 1s ease-in-out'
                }} 
            />
        )}

        {/* Top Gradient Bar */}
        {!isCompleted && <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-80" />}

        <div className="relative z-10 p-5">
            {/* Header: Priority + Actions */}
            <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${
                    isCompleted ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-gray-400'
                }`}>
                    {isCompleted ? 'Done' : `Priority ${data.priority || 0}`}
                </span>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        openModal('edit', data.id, data.label, data.priority); 
                      }} 
                      className="text-gray-500 hover:text-white"
                    >
                      <Edit3 size={14}/>
                    </button>

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

            {/* Body: Checkbox + Title */}
            <div className="flex items-start gap-4">
                {/* CHECKBOX: Hidden if incomplete, shows on hover */}
                <button 
                    onClick={(e) => { e.stopPropagation(); toggleTask(data.id, isCompleted); }}
                    className={`
                        mt-1 rounded-full p-1 transition-all duration-300
                        ${isCompleted 
                            ? 'text-emerald-500 opacity-100' 
                            : 'text-gray-600 opacity-0 group-hover:opacity-100 hover:text-blue-400'
                        }
                    `}
                >
                    {isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                </button>
                
                <div>
                    <div className={`text-base font-medium leading-relaxed ${isCompleted ? 'line-through text-gray-500' : 'text-gray-100'}`}>
                        {data.label}
                    </div>
                    {/* Progress Text */}
                    {!isCompleted && hasChildren && (
                        <div className="text-[10px] text-blue-400 mt-1">
                            {Math.round(progress)}% Complete
                        </div>
                    )}
                </div>
            </div>
            
            {/* Folder/Expander Button */}
            {hasChildren && (
                <button 
                    onClick={(e) => {
                        e.stopPropagation(); 
                        toggleFold(data.id);
                    }}
                    className="mt-3 flex w-full justify-center items-center py-1 rounded hover:bg-white/5 transition-colors group/btn cursor-pointer"
                >
                   {isFolded 
                        ? <ChevronDown size={20} className="text-gray-500 animate-bounce group-hover/btn:text-white" /> 
                        : <ChevronDown size={20} className="text-gray-700 rotate-180 group-hover/btn:text-gray-400" />
                   }
                </button>
            )}
        </div>
      </div>

      {/* Add Button */}
      <button 
        onClick={(e) => { 
          e.stopPropagation(); 
          openModal('add', data.id, '', 1); 
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
