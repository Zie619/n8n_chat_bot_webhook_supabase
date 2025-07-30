export default function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
        <p className="mt-4 text-gray-600">Loading authentication...</p>
      </div>
    </div>
  );
}