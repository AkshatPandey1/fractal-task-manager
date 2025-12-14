import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

export default function GlobalModal() {
  const { modalState, closeModal, addChild, renameNode, deleteNode } = useStore();
  const [inputValue, setInputValue] = useState('');

  // Sync input with store (pre-fill for renaming)
  useEffect(() => {
    if (modalState.initialValue) setInputValue(modalState.initialValue);
    else setInputValue('');
  }, [modalState]);

  if (!modalState.type) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalState.type === 'add') {
      await addChild(modalState.nodeId, inputValue);
    } else if (modalState.type === 'rename') {
      await renameNode(modalState.nodeId, inputValue);
    } else if (modalState.type === 'delete') {
      await deleteNode(modalState.nodeId);
    }
    closeModal();
  };

  // Configure UI based on action type
  const config = {
    add: { title: 'Add Sub-Task', action: 'Create', color: 'bg-blue-600' },
    rename: { title: 'Rename Task', action: 'Save', color: 'bg-emerald-600' },
    delete: { title: 'Delete Task?', action: 'Delete', color: 'bg-red-600' }
  }[modalState.type];

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
              <input
                autoFocus
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter task title..."
                className="w-full mb-6 rounded-lg bg-white/5 p-3 text-white outline-none focus:ring-2 focus:ring-blue-500 border border-white/10"
              />
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
