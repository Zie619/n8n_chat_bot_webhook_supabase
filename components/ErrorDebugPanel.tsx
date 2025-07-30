'use client';

import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle } from 'lucide-react';

interface ErrorLog {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  message: string;
  context?: any;
  stack?: string;
}

export function ErrorDebugPanel() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedError, setSelectedError] = useState<number | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Intercept console errors and warnings
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
      const errorLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '),
        stack: new Error().stack
      };
      
      setErrors(prev => [...prev.slice(-49), errorLog]); // Keep last 50 errors
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      const warnLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ')
      };
      
      setErrors(prev => [...prev.slice(-49), warnLog]);
      originalWarn.apply(console, args);
    };

    // Listen for unhandled errors
    const handleError = (event: ErrorEvent) => {
      const errorLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: event.message,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        stack: event.error?.stack
      };
      
      setErrors(prev => [...prev.slice(-49), errorLog]);
    };

    window.addEventListener('error', handleError);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
    };
  }, []);

  if (process.env.NODE_ENV !== 'development' || errors.length === 0) {
    return null;
  }

  const errorCount = errors.filter(e => e.level === 'error').length;
  const warnCount = errors.filter(e => e.level === 'warn').length;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-lg">
      {/* Toggle Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
        >
          <AlertTriangle className="w-4 h-4" />
          <span>{errorCount} errors, {warnCount} warnings</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Error Panel */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Error Debug Panel
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Development only - Recent console errors and warnings
            </p>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {errors.slice().reverse().map((error, index) => (
              <div
                key={index}
                className={`p-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedError === index ? 'bg-gray-100 dark:bg-gray-700' : ''
                }`}
                onClick={() => setSelectedError(selectedError === index ? null : index)}
              >
                <div className="flex items-start space-x-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    error.level === 'error' 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                  }`}>
                    {error.level.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {error.message.split('\n')[0]}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                
                {selectedError === index && (
                  <div className="mt-3 space-y-2">
                    <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                      {error.message}
                    </pre>
                    {error.stack && (
                      <details>
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                          Stack trace
                        </summary>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto mt-1">
                          {error.stack}
                        </pre>
                      </details>
                    )}
                    {error.context && (
                      <details>
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                          Context
                        </summary>
                        <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto mt-1">
                          {JSON.stringify(error.context, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setErrors([])}
              className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}