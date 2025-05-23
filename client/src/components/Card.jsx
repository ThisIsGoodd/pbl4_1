export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white shadow-md rounded-lg p-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={`text-sm text-gray-800 ${className}`}>
      {children}
    </div>
  );
}
