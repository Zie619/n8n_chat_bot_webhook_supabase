/**
 * Console banner for xFunnel application
 * Shows ASCII art and credits
 */

let bannerShown = false;

export function showConsoleBanner() {
  // Only show in browser environment
  if (typeof window === 'undefined') return;
  
  // Reset on each call for production
  bannerShown = false;
  
  // ASCII art for ZIE619
  const asciiArt = `
%c
███████╗██╗███████╗     ██████╗  ██╗ █████╗ 
╚══███╔╝██║██╔════╝    ██╔════╝ ███║██╔══██╗
  ███╔╝ ██║█████╗      ███████╗ ╚██║╚██████║
 ███╔╝  ██║██╔══╝      ██╔═══██╗ ██║ ╚═══██║
███████╗██║███████╗    ╚██████╔╝ ██║ █████╔╝
╚══════╝╚═╝╚══════╝     ╚═════╝  ╚═╝ ╚════╝ 
                                              
%c✨ Welcome to xFunnel - AI-Powered Article Editor ✨

%c© 2025 Eliad Shahar - All Rights Reserved
%cGitHub: https://github.com/Zie619

%cBuilt with 😊 using Next.js, TypeScript, and Claude AI
`;

  // Styles for different parts
  const styles = [
    'color: #6366f1; font-weight: bold; font-size: 14px; line-height: 1.2;', // ASCII art
    'color: #10b981; font-weight: bold; font-size: 16px; padding: 10px 0;', // Welcome message
    'color: #94a3b8; font-size: 12px;', // Copyright
    'color: #3b82f6; font-size: 12px; text-decoration: underline; cursor: pointer;', // GitHub link
    'color: #64748b; font-size: 11px; font-style: italic; padding-top: 10px;' // Built with
  ];

  // Show the banner
  console.log(asciiArt, ...styles);
  
  // Make GitHub link clickable
  console.log('%cClick here to visit my GitHub', 'color: #3b82f6; font-size: 12px; cursor: pointer;', 'https://github.com/Zie619');
  
  // Add clickable link handler
  if (process.env.NODE_ENV === 'development') {
    console.log('%c🔧 Development Mode - Verbose logging enabled', 'color: #f59e0b; font-weight: bold;');
  } else {
    console.log('%c🚀 Production Mode - Minimal logging', 'color: #10b981; font-weight: bold;');
  }
  
  // Banner will show on every page refresh
}

// Export a debug mode toggle
export function enableDebugMode() {
  localStorage.setItem('xfunnel_debug', 'true');
  console.log('%c🐛 Debug mode enabled - Refresh to see verbose logs', 'color: #f59e0b; font-weight: bold;');
}

export function disableDebugMode() {
  localStorage.removeItem('xfunnel_debug');
  console.log('%c🔕 Debug mode disabled - Refresh to hide verbose logs', 'color: #10b981; font-weight: bold;');
}

export function isDebugMode(): boolean {
  return localStorage.getItem('xfunnel_debug') === 'true';
}

// Auto-show banner when script loads in browser
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    showConsoleBanner();
  }, 100);
}