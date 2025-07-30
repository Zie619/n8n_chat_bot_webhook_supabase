export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-500"></div>
        <p className="mt-2 text-gray-600">Authenticating...</p>
      </div>
    </div>
  );
}