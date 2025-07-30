'use client';

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
        <h2 className="text-xl font-bold text-red-600 mb-4">
          Login Error
        </h2>
        <p className="text-gray-600 mb-6">
          {error.message || 'Failed to authenticate'}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-accent-500 text-white rounded hover:bg-accent-600 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}