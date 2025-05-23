function CenteredCard({ children }) {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded shadow-md w-full max-w-md text-center">
        {children}
      </div>
    </div>
  );
}

export default CenteredCard;
