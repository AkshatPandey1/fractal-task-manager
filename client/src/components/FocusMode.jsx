import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';

export default function FocusMode({ onClose }) {
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState(null);
  const [error, setError] = useState(''); // New Error State

  const findTask = async () => {
    setLoading(true);
    setError(''); // Clear previous errors
    try {
     const baseUrl = `${window.location.protocol}//${window.location.hostname}:5000/api`;
     const res = await axios.post(`${baseUrl}/choose`); 
     
      if (!res.data) {
        setError("No actionable tasks found! Add some to the map first.");
        setLoading(false);
        return;
      }
      
      // Fake delay for "thinking" effect
      setTimeout(() => {
        setTask(res.data);
        setLoading(false);
      }, 600);
      
    } catch (e) {
      setError("Error calculating task. Check the server connection.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-8 shadow-2xl text-center"
      >
        {!task ? (
          <>
            <h2 className="mb-2 text-3xl font-bold text-white">🎯 Focus</h2>
            
            {/* Conditional Error Display */}
            {error ? (
              <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            ) : (
              <p className="mb-8 text-gray-400">
                Let the algorithm decide what is most important right now.
              </p>
            )}
            
            <div className="flex justify-center gap-4">
              <button onClick={onClose} className="px-4 py-2 text-gray-500 hover:text-white">
                Cancel
              </button>
              <button 
                onClick={findTask}
                disabled={loading}
                className="rounded-full bg-blue-600 px-8 py-3 font-bold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Spin the Wheel'}
              </button>
            </div>
          </>
        ) : (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-green-400">
              Optimal Task Found
            </div>
            
            <div className="mb-8 rounded-xl bg-white/5 p-6 border border-white/10">
              <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
              <div className="flex justify-center gap-3 text-sm">
                <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                  Priority {task.priority}
                </span>
                <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                  Score: {Math.round(task.score)}
                </span>
              </div>
            </div>

            <button onClick={onClose} className="w-full rounded-lg bg-white py-3 font-bold text-black hover:bg-gray-200">
              Start Working
            </button>
            <button onClick={findTask} className="mt-4 text-sm text-gray-500 hover:text-white">
              Skip & Pick Another
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
