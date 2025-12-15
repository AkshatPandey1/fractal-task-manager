import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

export default function GlobalModal() {
  const { modalState, closeModal, addChild, updateNode, deleteNode } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [priority, setPriority] = useState(1);

  useEffect(() => {
    if (modalState.initialValue) setInputValue(modalState.initialValue);
    else setInputValue('');

    if (modalState.initialPriority) setPriority(modalState.initialPriority);
    else setPriority(1);
  }, [modalState]);

  if (!modalState.type) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalState.type === 'add') {
      await addChild(modalState.nodeId, inputValue, priority);
    } else if (modalState.type === 'edit') {
      await updateNode(modalState.nodeId, inputValue, priority);
    } else if (modalState.type === 'delete') {
      await deleteNode(modalState.nodeId);
    }
    closeModal();
  };

  const config = {
    add: { title: 'Add Sub-Task', action: 'Create', color: 'bg-blue-600' },
    edit: { title: 'Edit Task', action: 'Save', color: 'bg-emerald-600' },
    delete: { title: 'Delete Task?', action: 'Delete', color: 'bg-red-600' }
  }[modalState.type] || config['add'];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl"
        >
          <h2 className="mb-4 text-xl font-bold text-white">{config.title}</h2>
          
          <form onSubmit={handleSubmit}>
            {modalState.type !== 'delete' ? (
              <div className="space-y-4 mb-6">
                <div>
                    <label className="text-xs text-gray-400 font-bold uppercase ml-1">Title</label>
                    <input
                        autoFocus
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Task title..."
                        className="w-full mt-1 rounded-lg bg-white/5 p-3 text-white outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                    />
                </div>
                
                <div className="flex gap-4">
                     <div className="flex-1">
                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Priority Score</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full mt-1 rounded-lg bg-white/5 p-3 text-white outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
                        />
                     </div>
                </div>
              </div>
            ) : (
               <p className="mb-6 text-gray-400">Are you sure? This will delete all sub-tasks recursively.</p>
            )}

            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                onClick={closeModal} 
                className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className={`rounded-lg px-6 py-2 text-sm font-bold text-white shadow-lg ${config.color} hover:brightness-110 transition-all`}
              >
                {config.action}
              </button>
            </div>
          </form>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
