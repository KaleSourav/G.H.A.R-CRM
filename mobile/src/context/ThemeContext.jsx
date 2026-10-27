import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

// ── Dark Theme (default – Deep Navy + Rich Gold) ─────────────────────────────
export const DarkTheme = {
  isDark: true,
  // Brand Gold
  primary: '#E8A020',
  primaryDark: '#C8891A',
  primaryLight: 'rgba(232, 160, 32, 0.12)',
  primaryGlow: 'rgba(232, 160, 32, 0.25)',

  // Backgrounds
  bg: '#080E1A',
  surface: '#0D1526',
  surface2: '#162035',
  surface3: '#1E2D47',
  surfaceCard: '#0F1A2E',

  // Borders
  border: 'rgba(148, 163, 184, 0.10)',
  borderLight: 'rgba(148, 163, 184, 0.05)',
  borderAccent: 'rgba(232, 160, 32, 0.3)',

  // Text
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#5A6E8A',
  textInverse: '#080E1A',

  // Status
  success: '#22C55E',
  successDim: 'rgba(34, 197, 94, 0.12)',
  warning: '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.12)',
  error: '#EF4444',
  errorDim: 'rgba(239, 68, 68, 0.12)',
  info: '#3B82F6',
  infoDim: 'rgba(59, 130, 246, 0.12)',
  accent: '#4F6FE8',
  accentDim: 'rgba(79, 111, 232, 0.12)',
  purple: '#8B5CF6',
  purpleDim: 'rgba(139, 92, 246, 0.12)',
  pink: '#EC4899',

  // Brands
  whatsapp: '#25D366',
  whatsappDim: 'rgba(37, 211, 102, 0.12)',
  phoneCall: '#3B82F6',
  phoneCallDim: 'rgba(59, 130, 246, 0.12)',

  // Tab bar
  tabBar: '#0A101D',
  tabBarBorder: 'rgba(148, 163, 184, 0.08)',
  tabBarActive: '#E8A020',
  tabBarInactive: '#64748B',

  // Status bar
  statusBarStyle: 'light-content',
};

// ── Light Theme (Clean White + Rich Gold) ────────────────────────────────────
export const LightTheme = {
  isDark: false,
  // Brand Gold
  primary: '#C8850A',
  primaryDark: '#A06A08',
  primaryLight: 'rgba(200, 133, 10, 0.10)',
  primaryGlow: 'rgba(200, 133, 10, 0.20)',

  // Backgrounds
  bg: '#F4F6F9',
  surface: '#FFFFFF',
  surface2: '#F0F3F7',
  surface3: '#E4EAF2',
  surfaceCard: '#FAFBFD',

  // Borders
  border: 'rgba(15, 23, 42, 0.08)',
  borderLight: 'rgba(15, 23, 42, 0.04)',
  borderAccent: 'rgba(200, 133, 10, 0.3)',

  // Text
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textInverse: '#FFFFFF',

  // Status
  success: '#16A34A',
  successDim: 'rgba(22, 163, 74, 0.10)',
  warning: '#D97706',
  warningDim: 'rgba(217, 119, 6, 0.10)',
  error: '#DC2626',
  errorDim: 'rgba(220, 38, 38, 0.10)',
  info: '#2563EB',
  infoDim: 'rgba(37, 99, 235, 0.10)',
  accent: '#4F6FE8',
  accentDim: 'rgba(79, 111, 232, 0.10)',
  purple: '#7C3AED',
  purpleDim: 'rgba(124, 58, 237, 0.10)',
  pink: '#DB2777',

  // Brands
  whatsapp: '#16A34A',
  whatsappDim: 'rgba(22, 163, 74, 0.10)',
  phoneCall: '#2563EB',
  phoneCallDim: 'rgba(37, 99, 235, 0.10)',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: 'rgba(15, 23, 42, 0.08)',
  tabBarActive: '#C8850A',
  tabBarInactive: '#94A3B8',

  // Status bar
  statusBarStyle: 'dark-content',
};

const ThemeContext = createContext({ theme: DarkTheme, toggleTheme: () => {} });

const THEME_KEY = '@ghar_crm_theme';

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(val => { if (val !== null) setIsDark(val === 'dark'); })
      .catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  const theme = isDark ? DarkTheme : LightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
