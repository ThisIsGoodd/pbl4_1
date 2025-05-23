export default function Input({ value, onChange, placeholder = '', type = 'text', className = '' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-blue-200 ${className}`}
    />
  );
}
