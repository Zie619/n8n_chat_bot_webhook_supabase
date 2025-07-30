'use client';

import { useEffect } from 'react';
import { showConsoleBanner } from '@/lib/consoleBanner';

export default function ConsoleBanner() {
  useEffect(() => {
    // Show the banner when the app loads
    showConsoleBanner();
    
    // Also show on route changes
    const handleRouteChange = () => {
      showConsoleBanner();
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  // This component doesn't render anything
  return null;
}