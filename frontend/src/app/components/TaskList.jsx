'use client';

import { useState } from 'react';
import { useSessionStore } from '../store/sessionStore';

export default function TaskList() {
  const { tasks, currentTaskId, addTask, removeTask, switchTask } = useSessionStore();
  const [newTaskName, setNewTaskName] = useState('');

  const handleAddTask = () => {
    if (newTaskName.trim()) {
      addTask(newTaskName.trim());
      setNewTaskName('');
    }
  };

  const handleRemoveTask = (id) => {
    removeTask(id);
  };

  const handleSwitchTask = (id) => {
    switchTask(id);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-border p-6 h-full">
      <h2 className="text-lg font-semibold text-foreground mb-4">Focus Tasks</h2>
      
      {/* Add Task Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
          placeholder="What are you working on?"
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
        />
        <button
          onClick={handleAddTask}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Add
        </button>
      </div>
      
      {/* Task List */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div>No tasks yet</div>
            <div className="text-sm mt-1">Add tasks to track your focus</div>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                task.id === currentTaskId
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-border hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => handleSwitchTask(task.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  task.id === currentTaskId ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`} />
                <span className={`text-sm ${
                  task.id === currentTaskId ? 'text-blue-700 dark:text-blue-300 font-medium' : 'text-foreground'
                }`}>
                  {task.name}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveTask(task.id);
                }}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
