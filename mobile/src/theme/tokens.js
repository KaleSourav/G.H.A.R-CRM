// Design tokens for G.H.A.R CRM mobile
// Exact match to web design system (Deep Navy + Rich Gold)

export const Colors = {
  // Brand Gold
  primary: '#E8A020',
  primaryDark: '#C8891A',
  primaryLight: 'rgba(232, 160, 32, 0.12)',
  primaryGlow: 'rgba(232, 160, 32, 0.25)',

  // Deep Navy Backgrounds
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

  // Status & Accents
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

  // Quick Action Brands
  whatsapp: '#25D366',
  whatsappDim: 'rgba(37, 211, 102, 0.12)',
  phoneCall: '#3B82F6',
  phoneCallDim: 'rgba(59, 130, 246, 0.12)',

  // Tab bar
  tabBar: '#0A101D',
  tabBarBorder: 'rgba(148, 163, 184, 0.08)',
  tabBarActive: '#E8A020',
  tabBarInactive: '#64748B',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,

  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
  },
  gold: {
    shadowColor: '#E8A020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
};
