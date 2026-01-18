import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  dark: {
    name: 'Dark',
    bg: 'bg-gray-900',
    bgSecondary: 'bg-gray-800',
    bgTertiary: 'bg-gray-700',
    text: 'text-gray-100',
    textSecondary: 'text-gray-300',
    border: 'border-gray-700',
    accent: 'bg-blue-600 hover:bg-blue-700',
    accentText: 'text-blue-400',
    input: 'bg-gray-700 border border-gray-600 text-white',
    card: 'bg-gray-800 border border-gray-700'
  },
  orange: {
    name: 'Orange',
    bg: 'bg-black',
    bgSecondary: 'bg-gray-900',
    bgTertiary: 'bg-gray-800',
    text: 'text-orange-100',
    textSecondary: 'text-orange-200',
    border: 'border-orange-900',
    accent: 'bg-orange-600 hover:bg-orange-700',
    accentText: 'text-orange-400',
    input: 'bg-gray-900 border border-orange-900 text-orange-100',
    card: 'bg-gray-900 border border-orange-900'
  },
  light: {
    name: 'Light',
    bg: 'bg-white',
    bgSecondary: 'bg-gray-50',
    bgTertiary: 'bg-gray-100',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    border: 'border-gray-300',
    accent: 'bg-blue-500 hover:bg-blue-600',
    accentText: 'text-blue-600',
    input: 'bg-white border border-gray-300 text-gray-900',
    card: 'bg-white border border-gray-300 shadow-sm'
  }
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setCurrentTheme(savedTheme);
  }, []);

  const changeTheme = (themeName) => {
    setCurrentTheme(themeName);
    localStorage.setItem('theme', themeName);
  };

  const theme = themes[currentTheme];

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
