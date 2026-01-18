import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  dark: {
    name: 'Dark',
    bg: 'bg-gray-950',
    bgSecondary: 'bg-gray-900',
    bgTertiary: 'bg-gray-800',
    text: 'text-gray-100',
    textSecondary: 'text-gray-300',
    border: 'border-gray-700',
    accent: 'bg-blue-600 hover:bg-blue-700',
    accentText: 'text-blue-400',
    input: 'bg-gray-800 border border-gray-700 text-white',
    card: 'bg-gray-900 border border-gray-700 rounded-xl'
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
    card: 'bg-white border border-gray-300 shadow-sm rounded-xl'
  },
  midnight: {
    name: 'Midnight',
    bg: 'bg-slate-950',
    bgSecondary: 'bg-slate-900',
    bgTertiary: 'bg-slate-800',
    text: 'text-slate-100',
    textSecondary: 'text-slate-300',
    border: 'border-indigo-900/40',
    accent: 'bg-indigo-600 hover:bg-indigo-500',
    accentText: 'text-indigo-400',
    input: 'bg-slate-900 border border-indigo-900/50 text-slate-100',
    card: 'bg-slate-900 border border-indigo-900/40 rounded-xl'
  }
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    // Check if the saved theme exists, otherwise default to 'dark'
    if (themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    } else {
      setCurrentTheme('dark');
      localStorage.setItem('theme', 'dark');
    }
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
