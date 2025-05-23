// src/components/Button.jsx
export default function Button({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  className = '',
  type = 'button',
}) {
  const base =
    'rounded px-4 py-1 font-semibold focus:outline-none transition-colors duration-150';

  const variants = {
    default: 'bg-blue-500 text-white hover:bg-blue-600',
    ghost: 'bg-transparent border border-gray-400 text-gray-700 hover:bg-gray-100',
    destructive: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizes = {
    sm: 'text-sm py-1 px-2',
    md: 'text-base py-2 px-4',
    lg: 'text-lg py-3 px-5',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
