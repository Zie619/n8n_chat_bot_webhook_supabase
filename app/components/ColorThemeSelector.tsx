'use client';

import React, { useState } from 'react';
import { useTheme, AccentColor } from './ThemeProvider';
import { Check, Palette } from 'lucide-react';

const colorOptions: { color: AccentColor; hex: string; name: string }[] = [
  { color: 'blue', hex: '#3b82f6', name: 'Blue' },
  { color: 'purple', hex: '#a855f7', name: 'Purple' },
  { color: 'green', hex: '#22c55e', name: 'Green' },
  { color: 'red', hex: '#ef4444', name: 'Red' },
  { color: 'orange', hex: '#f97316', name: 'Orange' },
  { color: 'yellow', hex: '#f59e0b', name: 'Yellow' },
  { color: 'pink', hex: '#ec4899', name: 'Pink' },
  { color: 'teal', hex: '#14b8a6', name: 'Teal' },
];

export default function ColorThemeSelector() {
  const { accentColor, setAccentColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 group"
        title="Choose accent color"
      >
        <Palette className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
            <div className="flex items-center gap-2">
              {colorOptions.map(({ color, hex, name }) => (
                <button
                  key={color}
                  onClick={() => {
                    setAccentColor(color);
                    setIsOpen(false);
                  }}
                  className={`
                    relative w-8 h-8 rounded-full transition-all duration-200
                    hover:scale-110 hover:shadow-md
                    ${accentColor === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500' : ''}
                  `}
                  style={{ backgroundColor: hex }}
                  title={name}
                >
                  {accentColor === color && (
                    <Check className="w-4 h-4 text-white absolute inset-0 m-auto" strokeWidth={3} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}