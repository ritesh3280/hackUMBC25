'use client';

import { useState } from 'react';

export default function TaskList({ 
  tasks = [], 
  currentTaskId, 
  onAddTask, 
  onRemoveTask, 
  onSwitchTask 
}) {
  const [newTaskName, setNewTaskName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddTask = () => {
    if (newTaskName.trim()) {
      onAddTask(newTaskName.trim());
      setNewTaskName('');
      setIsAdding(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddTask();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewTaskName('');
    }
  };

  return (
    <div className="workspace-card p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <svg className="w-5 h-5 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Tasks
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="w-8 h-8 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg flex items-center justify-center transition-all duration-200"
          title="Add task (N)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add Task Input */}
      {isAdding && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter task name..."
            className="w-full bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-none outline-none text-sm"
            autoFocus
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => {
                setIsAdding(false);
                setNewTaskName('');
              }}
              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTask}
              className="btn-primary text-xs px-3 py-1"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="space-y-1">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="text-sm">No tasks yet</div>
            <div className="text-xs mt-1">Press N or click + to add a task</div>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer group ${
                task.id === currentTaskId
                  ? 'border-accent bg-accent/5'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              onClick={() => onSwitchTask(task.id)}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-200 ${
                    task.id === currentTaskId ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
                <span
                  className={`text-sm transition-colors ${
                    task.id === currentTaskId ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {task.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTask(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-error transition-all duration-200 p-1"
                title="Remove task"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Keyboard shortcuts hint */}
      {tasks.length > 0 && (
        <div className="mt-4 text-xs text-gray-400 dark:text-gray-500 text-center">
          ↑↓ to navigate • Space to start
        </div>
      )}
    </div>
  );
}