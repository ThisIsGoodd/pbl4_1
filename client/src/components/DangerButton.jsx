function DangerButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2 bg-red-100 text-red-700 font-semibold rounded-full hover:bg-red-200 transition text-sm"
    >
      {children}
    </button>
  );
}

export default DangerButton;
