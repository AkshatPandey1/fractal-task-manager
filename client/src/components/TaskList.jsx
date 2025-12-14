import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useStore from '../store/useStore';

export default function TaskList() {
  const { leaves, fetchLeaves, toggleTask } = useStore();

  useEffect(() => {
    fetchLeaves();
  }, []);

  // Logic: Group leaves by their parent ID
  const groups = leaves.reduce((acc, task) => {
    const parentId = task.parent_id || 'root';
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(task);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-8 text-3xl font-bold text-white">Action Items</h1>

      {Object.keys(groups).map((parentId) => (
        <div key={parentId} className="mb-8">
            {/* Find the parent name from the first task's parent data (simplified) */}
            {/* In a real app we'd fetch parent names, for now we use ID or generic */}
            <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-gray-500">
                Group #{parentId}
            </h2>

            <div className="space-y-3">
                <AnimatePresence>
                {groups[parentId].map((task) => (
                    <motion.div
                        key={task.id}
                        layout // Enables smooth sliding when items are removed
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4 backdrop-blur-sm transition-colors hover:border-blue-500/30"
                    >
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => toggleTask(task.id, task.is_completed)}
                                className="flex h-6 w-6 items-center justify-center rounded border border-gray-600 transition-colors hover:border-green-500 hover:bg-green-500/20"
                            >
                                <div className="h-3 w-3 rounded-sm bg-transparent" />
                            </button>
                            
                            <div>
                                <p className="font-medium text-gray-200">{task.title}</p>
                                <div className="mt-1 flex gap-2">
                                    <span className="text-[10px] text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                                        Priority {task.priority}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
                </AnimatePresence>
            </div>
        </div>
      ))}
      
      {leaves.length === 0 && (
        <div className="text-center text-gray-500 mt-20">
            <p>No actionable tasks found.</p>
            <p className="text-sm">Go to the Map and add sub-tasks!</p>
        </div>
      )}
    </div>
  );
}
