'use client';

import { useAuth } from './AuthProvider';
import { useTheme } from './ThemeProvider';
import { LogOut, User, Moon, Sun } from 'lucide-react';
import ColorThemeSelector from './ColorThemeSelector';

export default function Header() {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();

  if (!user) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">XFunnel Article Editor</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <User className="w-4 h-4" />
            <span>{user.email}</span>
          </div>
          <ColorThemeSelector />
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-all duration-200 group"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-yellow-500 group-hover:text-yellow-600 transition-colors" />
            ) : (
              <Moon className="w-4 h-4 text-accent-600 group-hover:text-accent-700 transition-colors" />
            )}
          </button>
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}