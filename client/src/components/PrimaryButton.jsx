function PrimaryButton({ children, onClick, full = false }) {
  return (
    <button
      onClick={onClick}
      className={`${
        full ? 'w-full' : 'w-1/2'
      } py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition font-medium`}
    >
      {children}
    </button>
  );
}

export default PrimaryButton;
