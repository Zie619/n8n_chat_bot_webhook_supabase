import React from 'react';

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/90 dark:bg-gray-950/90 backdrop-blur-sm text-gray-500 text-[10px] py-1 px-4 text-center z-40 border-t border-gray-800/50">
      <p>
        © 2025{' '}
        <a 
          href="https://github.com/Zie619" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-accent-400 hover:text-accent-300 transition-colors"
        >
          Eliad Shahar (Zie619)
        </a>
        {' '}- All Rights Reserved | Built with Next.js 😊 
      </p>
    </footer>
  );
}