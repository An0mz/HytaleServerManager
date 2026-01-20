import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  dark: {
    name: 'Dark',
    bg: 'bg-gray-950',
    bgSecondary: 'bg-gray-900',
    bgTertiary: 'bg-gray-800',
    text: 'text-gray-100',
    textSecondary: 'text-gray-400',
    border: 'border-gray-700',
    accent: 'bg-blue-600 hover:bg-blue-700',
    accentText: 'text-blue-400',
    input: 'bg-gray-800 border border-gray-700 text-white',
    card: 'bg-gray-900 border border-gray-700 rounded-xl'
  },
  light: {
    name: 'Light',
    bg: 'bg-gray-50',
    bgSecondary: 'bg-white',
    bgTertiary: 'bg-gray-100',
    text: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    accent: 'bg-blue-600 hover:bg-blue-700',
    accentText: 'text-blue-600',
    input: 'bg-white border border-gray-200 text-gray-900',
    card: 'bg-white border border-gray-200 shadow-sm rounded-xl'
  },
  midnight: {
    name: 'Midnight',
    bg: 'bg-slate-950',
    bgSecondary: 'bg-slate-900',
    bgTertiary: 'bg-slate-800',
    text: 'text-slate-100',
    textSecondary: 'text-slate-400',
    border: 'border-indigo-900/40',
    accent: 'bg-indigo-600 hover:bg-indigo-500',
    accentText: 'text-indigo-400',
    input: 'bg-slate-900 border border-indigo-900/50 text-slate-100',
    card: 'bg-slate-900 border border-indigo-900/40 rounded-xl'
  },
  ocean: {
    name: 'Ocean',
    bg: 'bg-gradient-to-br from-blue-950 via-cyan-950 to-slate-950',
    bgSecondary: 'bg-cyan-950/50',
    bgTertiary: 'bg-cyan-900/30',
    text: 'text-cyan-50',
    textSecondary: 'text-cyan-300',
    border: 'border-cyan-800/40',
    accent: 'bg-cyan-600 hover:bg-cyan-500',
    accentText: 'text-cyan-400',
    input: 'bg-cyan-950/50 border border-cyan-800/40 text-cyan-50',
    card: 'bg-cyan-950/40 border border-cyan-800/40 rounded-xl backdrop-blur-sm'
  },
  forest: {
    name: 'Forest',
    bg: 'bg-gradient-to-br from-green-950 via-emerald-950 to-teal-950',
    bgSecondary: 'bg-emerald-950/50',
    bgTertiary: 'bg-emerald-900/30',
    text: 'text-emerald-50',
    textSecondary: 'text-emerald-300',
    border: 'border-emerald-800/40',
    accent: 'bg-emerald-600 hover:bg-emerald-500',
    accentText: 'text-emerald-400',
    input: 'bg-emerald-950/50 border border-emerald-800/40 text-emerald-50',
    card: 'bg-emerald-950/40 border border-emerald-800/40 rounded-xl backdrop-blur-sm'
  },
  sunset: {
    name: 'Sunset',
    bg: 'bg-gradient-to-br from-orange-950 via-red-950 to-pink-950',
    bgSecondary: 'bg-orange-950/50',
    bgTertiary: 'bg-orange-900/30',
    text: 'text-orange-50',
    textSecondary: 'text-orange-300',
    border: 'border-orange-800/40',
    accent: 'bg-orange-600 hover:bg-orange-500',
    accentText: 'text-orange-400',
    input: 'bg-orange-950/50 border border-orange-800/40 text-orange-50',
    card: 'bg-orange-950/40 border border-orange-800/40 rounded-xl backdrop-blur-sm'
  },
  purple: {
    name: 'Purple Haze',
    bg: 'bg-gradient-to-br from-purple-950 via-violet-950 to-fuchsia-950',
    bgSecondary: 'bg-purple-950/50',
    bgTertiary: 'bg-purple-900/30',
    text: 'text-purple-50',
    textSecondary: 'text-purple-300',
    border: 'border-purple-800/40',
    accent: 'bg-purple-600 hover:bg-purple-500',
    accentText: 'text-purple-400',
    input: 'bg-purple-950/50 border border-purple-800/40 text-purple-50',
    card: 'bg-purple-950/40 border border-purple-800/40 rounded-xl backdrop-blur-sm'
  },
  nord: {
    name: 'Nord',
    bg: 'bg-[#2e3440]',
    bgSecondary: 'bg-[#3b4252]',
    bgTertiary: 'bg-[#434c5e]',
    text: 'text-[#eceff4]',
    textSecondary: 'text-[#d8dee9]',
    border: 'border-[#4c566a]',
    accent: 'bg-[#88c0d0] hover:bg-[#8fbcbb]',
    accentText: 'text-[#88c0d0]',
    input: 'bg-[#3b4252] border border-[#4c566a] text-[#eceff4]',
    card: 'bg-[#3b4252] border border-[#4c566a] rounded-xl'
  }
};

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    // Check if the saved theme exists, otherwise default to 'dark'
    if (savedTheme && themes[savedTheme]) {
      setCurrentTheme(savedTheme);
    } else {
      // Invalid theme found, clear localStorage and use default
      console.log(`Invalid theme '${savedTheme}' found, resetting to 'dark'`);
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
