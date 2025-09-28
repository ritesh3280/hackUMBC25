export default function FocusPill({ isFocused, className = "" }) {
  return (
    <div
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium focus-pill ${
        isFocused ? "focused" : "unfocused"
      } ${className}`}
    >
      <div
        className={`w-2 h-2 rounded-full mr-2 ${
          isFocused ? "bg-white" : "bg-white"
        }`}
      />
      {isFocused ? "Focused" : "Unfocused"}
    </div>
  );
}