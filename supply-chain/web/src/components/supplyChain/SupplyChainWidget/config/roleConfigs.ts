/**
 * Role-based configurations for the Supply Chain Widget
 */

import { UserRole } from '../../../../lib/enums';
import type { RoleConfig, ColorScheme } from './types';

// =====================================================================================
// COLOR SCHEMES - CYBER SUPPLY CHAIN THEME
// =====================================================================================

export const colorSchemes: Record<string, ColorScheme> = {
  // 🌱 Producer - Bio-Tech Green (Natural + Tech)
  biotech: {
    name: 'biotech',
    background: 'bg-gradient-to-br from-emerald-50 to-teal-50',
    border: 'border-emerald-400',
    text: {
      primary: 'text-emerald-900',
      secondary: 'text-emerald-800',
      accent: 'text-teal-700',
    },
    badge: {
      background: 'bg-gradient-to-r from-emerald-100 to-teal-100 border border-emerald-300',
      text: 'text-emerald-800',
    },
  },
  // 🏭 Factory - Cyber Blue (Industrial + Digital)
  cyber: {
    name: 'cyber',
    background: 'bg-gradient-to-br from-cyan-50 to-blue-50',
    border: 'border-cyan-400',
    text: {
      primary: 'text-cyan-900',
      secondary: 'text-cyan-800',
      accent: 'text-blue-700',
    },
    badge: {
      background: 'bg-gradient-to-r from-cyan-100 to-blue-100 border border-cyan-300',
      text: 'text-cyan-800',
    },
  },
  // 🏪 Retailer - Electric Violet (Commerce + Energy)
  electric: {
    name: 'electric',
    background: 'bg-gradient-to-br from-violet-50 to-fuchsia-50',
    border: 'border-violet-400',
    text: {
      primary: 'text-violet-900',
      secondary: 'text-violet-800',
      accent: 'text-fuchsia-700',
    },
    badge: {
      background: 'bg-gradient-to-r from-violet-100 to-fuchsia-100 border border-violet-300',
      text: 'text-violet-800',
    },
  },
  // 👤 Consumer - Neon Orange (Human + Experience)
  neon: {
    name: 'neon',
    background: 'bg-gradient-to-br from-amber-50 to-orange-50',
    border: 'border-amber-400',
    text: {
      primary: 'text-amber-900',
      secondary: 'text-amber-800',
      accent: 'text-orange-700',
    },
    badge: {
      background: 'bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300',
      text: 'text-amber-800',
    },
  },
  // ⚙️ Admin - Matrix Dark (Control + Authority)
  matrix: {
    name: 'matrix',
    background: 'bg-gradient-to-br from-slate-50 to-zinc-50',
    border: 'border-slate-400',
    text: {
      primary: 'text-slate-900',
      secondary: 'text-slate-800',
      accent: 'text-zinc-700',
    },
    badge: {
      background: 'bg-gradient-to-r from-slate-100 to-zinc-100 border border-slate-300',
      text: 'text-slate-800',
    },
  },
} as const;

// =====================================================================================
// ROLE CONFIGURATIONS
// =====================================================================================

export const roleConfigs: Record<UserRole, RoleConfig> = {
  [UserRole.Producer]: {
    colorScheme: colorSchemes.biotech,
    title: 'BioTech Producer',
    metricsLayout: 'standard',
    contentSections: ['created-tokens', 'pending-transfers'],
    hasSpecialFeatures: false,
    maxDisplayItems: 5,
  },
  [UserRole.Factory]: {
    colorScheme: colorSchemes.cyber,
    title: 'Cyber Factory',
    metricsLayout: 'efficiency',
    contentSections: ['raw-materials', 'processed-products'],
    hasSpecialFeatures: true, // For efficiency calculator
    maxDisplayItems: 5,
  },
  [UserRole.Retailer]: {
    colorScheme: colorSchemes.electric,
    title: 'Electric Commerce',
    metricsLayout: 'inventory',
    contentSections: ['inventory', 'sales', 'suppliers'],
    hasSpecialFeatures: true, // For sales analytics
    maxDisplayItems: 6,
  },
  [UserRole.Consumer]: {
    colorScheme: colorSchemes.neon,
    title: 'Neon Experience',
    metricsLayout: 'purchases',
    contentSections: ['purchases', 'traceability'],
    hasSpecialFeatures: true, // For traceability tree
    maxDisplayItems: 4,
  },
  [UserRole.Admin]: {
    colorScheme: colorSchemes.matrix,
    title: 'Matrix Control',
    metricsLayout: 'system',
    contentSections: ['system-stats', 'user-activity', 'recent-activity'],
    hasSpecialFeatures: true, // For system analytics
    maxDisplayItems: 8,
  },
} as const;

// =====================================================================================
// ROLE ICONS - ORIGINAL ICONS
// =====================================================================================

export const roleIcons: Record<UserRole, string> = {
  [UserRole.Producer]: '🌾', // Producer - Agriculture/Raw materials
  [UserRole.Factory]: '🏭', // Factory - Industrial processing
  [UserRole.Retailer]: '🏪', // Retailer - Commerce/Store
  [UserRole.Consumer]: '👤', // Consumer - Person/Individual
  [UserRole.Admin]: '⚙️', // Admin - Management/Settings
} as const;

// =====================================================================================
// LAYOUT CONSTANTS
// =====================================================================================

export const layoutConstants = {
  maxHeight: '400px',
  maxWidth: '100%',
  dropdownPosition: 'right',
  animationDuration: 300,
  scrollThreshold: 350,
} as const;

// =====================================================================================
// HELPER FUNCTIONS
// =====================================================================================

export function getRoleConfig(role: UserRole): RoleConfig {
  return roleConfigs[role];
}

export function getColorScheme(schemeName: string): ColorScheme | null {
  return colorSchemes[schemeName] || null;
}

export function getRoleIcon(role: UserRole): string {
  return roleIcons[role];
}
