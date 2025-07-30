'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type AccentColor = 'blue' | 'purple' | 'green' | 'red' | 'orange' | 'yellow' | 'pink' | 'teal';

interface AccentColorConfig {
  name: string;
  colors: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

const accentColors: Record<AccentColor, AccentColorConfig> = {
  blue: {
    name: 'Blue',
    colors: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    }
  },
  purple: {
    name: 'Purple',
    colors: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7c3aed',
      800: '#6b21a8',
      900: '#581c87',
    }
  },
  green: {
    name: 'Green',
    colors: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    }
  },
  red: {
    name: 'Red',
    colors: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    }
  },
  orange: {
    name: 'Orange',
    colors: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    }
  },
  yellow: {
    name: 'Yellow',
    colors: {
      50: '#fefce8',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    }
  },
  pink: {
    name: 'Pink',
    colors: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9d174d',
      900: '#831843',
    }
  },
  teal: {
    name: 'Teal',
    colors: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    }
  },
};

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  accentColorConfig: AccentColorConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [accentColor, setAccentColorState] = useState<AccentColor>('blue');

  useEffect(() => {
    // Load theme preferences from localStorage
    const savedTheme = localStorage.getItem('theme');
    const savedAccent = localStorage.getItem('accentColor') as AccentColor;
    
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    if (savedAccent && accentColors[savedAccent]) {
      setAccentColorState(savedAccent);
      applyAccentColor(savedAccent);
    } else {
      applyAccentColor('blue');
    }
  }, []);

  const applyAccentColor = (color: AccentColor) => {
    const colors = accentColors[color].colors;
    const root = document.documentElement;
    
    // Set CSS custom properties for the accent color
    Object.entries(colors).forEach(([shade, value]) => {
      root.style.setProperty(`--accent-${shade}`, value);
    });
    
    // Also set semantic color variables
    root.style.setProperty('--accent-primary', colors['500']);
    root.style.setProperty('--accent-primary-hover', colors['600']);
    root.style.setProperty('--accent-primary-active', colors['700']);
    root.style.setProperty('--accent-light', colors['100']);
    root.style.setProperty('--accent-light-hover', colors['200']);
    root.style.setProperty('--accent-dark', colors['800']);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem('accentColor', color);
    applyAccentColor(color);
  };

  return (
    <ThemeContext.Provider value={{ 
      isDarkMode, 
      toggleDarkMode, 
      accentColor, 
      setAccentColor,
      accentColorConfig: accentColors[accentColor]
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}