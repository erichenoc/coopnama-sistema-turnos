import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ============================================
      // NEUMORPHISM DESIGN SYSTEM - COOPNAMA TURNOS
      // ============================================

      colors: {
        // Neumorphism base colors
        'neu': {
          bg: '#e6e7ee',         // Background base (gris azulado)
          dark: '#b8b9be',       // Sombra oscura
          light: '#ffffff',      // Sombra clara
          surface: '#e6e7ee',    // Superficie de elementos
        },
        // Dark mode Neumorphism
        'neu-dark': {
          bg: '#2d2d2d',
          dark: '#1a1a1a',
          light: '#404040',
          surface: '#2d2d2d',
        },
        // COOPNAMA Brand Colors (CSS vars for dynamic theming)
        'coopnama': {
          primary: 'var(--coopnama-primary)',
          secondary: 'var(--coopnama-secondary)',
          accent: 'var(--coopnama-accent)',
          danger: 'var(--coopnama-danger)',
          warning: '#f97316',
        },
        // Ticket Status Colors
        'status': {
          waiting: '#3b82f6',    // Azul - En espera
          called: '#f59e0b',     // Ámbar - Llamado
          serving: '#10b981',    // Verde - Atendiendo
          completed: '#6b7280',  // Gris - Completado
          cancelled: '#ef4444', // Rojo - Cancelado
          noshow: '#dc2626',     // Rojo oscuro - No show
        },
        // Priority Colors
        'priority': {
          normal: '#6b7280',
          preferential: '#3b82f6',
          vip: '#f59e0b',
          urgent: '#ef4444',
        },
      },

      // ============================================
      // NEUMORPHISM SHADOWS
      // ============================================
      boxShadow: {
        // === RAISED (Elevado) ===
        'neu-xs': '3px 3px 6px #b8b9be, -3px -3px 6px #ffffff',
        'neu-sm': '4px 4px 8px #b8b9be, -4px -4px 8px #ffffff',
        'neu': '6px 6px 12px #b8b9be, -6px -6px 12px #ffffff',
        'neu-md': '8px 8px 16px #b8b9be, -8px -8px 16px #ffffff',
        'neu-lg': '12px 12px 24px #b8b9be, -12px -12px 24px #ffffff',
        'neu-xl': '20px 20px 40px #b8b9be, -20px -20px 40px #ffffff',

        // === INSET (Hundido/Presionado) ===
        'neu-inset-xs': 'inset 2px 2px 4px #b8b9be, inset -2px -2px 4px #ffffff',
        'neu-inset-sm': 'inset 3px 3px 6px #b8b9be, inset -3px -3px 6px #ffffff',
        'neu-inset': 'inset 4px 4px 8px #b8b9be, inset -4px -4px 8px #ffffff',
        'neu-inset-md': 'inset 6px 6px 12px #b8b9be, inset -6px -6px 12px #ffffff',
        'neu-inset-lg': 'inset 8px 8px 16px #b8b9be, inset -8px -8px 16px #ffffff',

        // === DARK MODE SHADOWS ===
        'neu-dark-xs': '3px 3px 6px #1a1a1a, -3px -3px 6px #404040',
        'neu-dark-sm': '4px 4px 8px #1a1a1a, -4px -4px 8px #404040',
        'neu-dark': '6px 6px 12px #1a1a1a, -6px -6px 12px #404040',
        'neu-dark-md': '8px 8px 16px #1a1a1a, -8px -8px 16px #404040',
        'neu-dark-lg': '12px 12px 24px #1a1a1a, -12px -12px 24px #404040',

        'neu-dark-inset': 'inset 4px 4px 8px #1a1a1a, inset -4px -4px 8px #404040',
        'neu-dark-inset-md': 'inset 6px 6px 12px #1a1a1a, inset -6px -6px 12px #404040',

        // === SPECIAL EFFECTS ===
        'neu-flat': '0 4px 12px #b8b9be',  // Solo sombra inferior
        'neu-glow': '0 0 20px rgba(30, 64, 175, 0.3)', // Glow COOPNAMA
      },

      // ============================================
      // BORDER RADIUS (Neumorphism usa bordes suaves)
      // ============================================
      borderRadius: {
        'neu': '16px',
        'neu-sm': '12px',
        'neu-lg': '24px',
        'neu-xl': '32px',
        'neu-full': '9999px',
      },

      // ============================================
      // TYPOGRAPHY
      // ============================================
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      // ============================================
      // ANIMATIONS
      // ============================================
      animation: {
        'neu-press': 'neuPress 0.15s ease-out forwards',
        'neu-release': 'neuRelease 0.15s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'ticket-call': 'ticketCall 0.5s ease-out',
      },
      keyframes: {
        neuPress: {
          '0%': { boxShadow: '6px 6px 12px #b8b9be, -6px -6px 12px #ffffff' },
          '100%': { boxShadow: 'inset 4px 4px 8px #b8b9be, inset -4px -4px 8px #ffffff' },
        },
        neuRelease: {
          '0%': { boxShadow: 'inset 4px 4px 8px #b8b9be, inset -4px -4px 8px #ffffff' },
          '100%': { boxShadow: '6px 6px 12px #b8b9be, -6px -6px 12px #ffffff' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ticketCall: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)', boxShadow: '0 0 30px rgba(245, 158, 11, 0.5)' },
          '100%': { transform: 'scale(1)' },
        },
      },

      // ============================================
      // SPACING (Para layouts consistentes)
      // ============================================
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // ============================================
      // Z-INDEX
      // ============================================
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
    },
  },
  plugins: [],
}

export default config
