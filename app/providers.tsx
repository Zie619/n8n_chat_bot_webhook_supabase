'use client';

import { AuthProvider } from './components/AuthProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { DebugErrorBoundary } from './debug-wrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorDebugPanel } from '@/components/ErrorDebugPanel';
import OfflineIndicator from '@/components/OfflineIndicator';
import { useEffect } from 'react';
import { initializeApp } from '@/lib/init';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize app on client side
    if (typeof window !== 'undefined') {
      initializeApp();
    }
  }, []);

  return (
    <ErrorBoundary>
      <DebugErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <OfflineIndicator />
            {process.env.NODE_ENV === 'development' && <ErrorDebugPanel />}
          </AuthProvider>
        </ThemeProvider>
      </DebugErrorBoundary>
    </ErrorBoundary>
  );
}