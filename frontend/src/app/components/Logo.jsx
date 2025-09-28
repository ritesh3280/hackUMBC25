export default function Logo({ className = "" }) {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-white"
        >
          <path
            d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">FlowMate</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400">Brain-aware productivity</p>
      </div>
    </div>
  );
}
