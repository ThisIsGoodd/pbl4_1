function TextInput({ value, onChange, placeholder = '', type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2 border rounded mb-6 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
    />
  );
}

export default TextInput;
