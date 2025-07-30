'use client';

export default function DemoWarningBanner() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white py-3 px-4 text-center shadow-lg border-b-2 border-red-800">
      <p className="text-base font-bold">
        ⚠️ DEMO MODE - This is a view-only demo. Most features are disabled. ⚠️
      </p>
    </div>
  );
}