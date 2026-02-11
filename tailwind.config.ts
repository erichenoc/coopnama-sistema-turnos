import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ============================================
      // GRADIENT MESH DARK DESIGN SYSTEM - COOPNAMA TURNOS
      // ============================================

      colors: {
        // Glass-morphism base colors (dark theme)
        'neu': {
          bg: '#0f172a',         // slate-950 - Background base
          dark: 'rgba(0,0,0,0.3)', // Sombra oscura
          light: 'rgba(255,255,255,0.06)', // Borde sutil claro
          surface: '#1e293b',    // slate-800 - Superficie de elementos
        },
        // Dark mode (same as base now)
        'neu-dark': {
          bg: '#0f172a',
          dark: 'rgba(0,0,0,0.4)',
          light: 'rgba(255,255,255,0.08)',
          surface: '#1e293b',
        },
        // COOPNAMA Brand Colors
        'coopnama': {
          primary: 'var(--coopnama-primary)',
          secondary: 'var(--coopnama-secondary)',
          accent: 'var(--coopnama-accent)',
          danger: 'var(--coopnama-danger)',
          warning: '#f97316',
          green: {
            DEFAULT: '#009e59',
            50: '#ecfdf5',
            100: '#d1fae5',
            200: '#a7f3d0',
            300: '#6ee7b7',
            400: '#34d399',
            500: '#009e59',
            600: '#008a4e',
            700: '#047857',
            800: '#065f46',
            900: '#064e3b',
          },
        },
        // Ticket Status Colors
        'status': {
          waiting: '#3b82f6',    // Azul - En espera
          called: '#f59e0b',     // Ambar - Llamado
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
      // GLASS-MORPHISM SHADOWS
      // ============================================
      boxShadow: {
        // === GLASS (Raised) ===
        'neu-xs': '0 1px 4px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.04)',
        'neu-sm': '0 2px 6px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
        'neu': '0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        'neu-md': '0 4px 12px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)',
        'neu-lg': '0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
        'neu-xl': '0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',

        // === INSET (Pressed) ===
        'neu-inset-xs': 'inset 0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)',
        'neu-inset-sm': 'inset 0 2px 4px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
        'neu-inset': 'inset 0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)',
        'neu-inset-md': 'inset 0 3px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'neu-inset-lg': 'inset 0 4px 12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',

        // === DARK MODE SHADOWS (same as base now) ===
        'neu-dark-xs': '0 1px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)',
        'neu-dark-sm': '0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
        'neu-dark': '0 2px 8px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06)',
        'neu-dark-md': '0 4px 12px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)',
        'neu-dark-lg': '0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)',

        'neu-dark-inset': 'inset 0 2px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
        'neu-dark-inset-md': 'inset 0 3px 8px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)',

        // === SPECIAL EFFECTS ===
        'neu-flat': '0 4px 12px rgba(0,0,0,0.3)',
        'neu-glow': '0 0 20px rgba(0, 158, 89, 0.4)',
        'neu-glow-green': '0 0 30px rgba(0, 158, 89, 0.3), 0 0 60px rgba(0, 158, 89, 0.1)',
        'neu-glow-blue': '0 0 20px rgba(30, 64, 175, 0.4)',
        'glass': '0 0 0 1px rgba(255,255,255,0.08), 0 2px 8px rgba(0,0,0,0.3)',
        'glass-lg': '0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.4)',
        'glass-green': '0 0 0 1px rgba(0, 158, 89, 0.2), 0 2px 8px rgba(0,0,0,0.3)',
      },

      // ============================================
      // BACKGROUND IMAGE (Gradients)
      // ============================================
      backgroundImage: {
        'gradient-green': 'linear-gradient(135deg, #009e59 0%, #00c96f 100%)',
        'gradient-green-dark': 'linear-gradient(135deg, #008a4e 0%, #009e59 100%)',
        'gradient-green-subtle': 'linear-gradient(135deg, rgba(0,158,89,0.15) 0%, rgba(0,201,111,0.05) 100%)',
        'gradient-brand': 'linear-gradient(135deg, #009e59 0%, #1e40af 100%)',
        'gradient-brand-reverse': 'linear-gradient(135deg, #1e40af 0%, #009e59 100%)',
        'gradient-mesh': 'radial-gradient(at 30% 20%, rgba(0,158,89,0.12) 0%, transparent 50%), radial-gradient(at 70% 80%, rgba(30,64,175,0.10) 0%, transparent 50%)',
      },

      // ============================================
      // BORDER RADIUS
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
        'pulse-green': 'pulseGreen 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-down': 'slideDown 0.3s ease-out forwards',
        'ticket-call': 'ticketCall 0.5s ease-out',
        'mesh-float': 'meshFloat 20s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        neuPress: {
          '0%': { boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)' },
          '100%': { boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)', transform: 'scale(0.98)' },
        },
        neuRelease: {
          '0%': { boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)', transform: 'scale(0.98)' },
          '100%': { boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)', transform: 'scale(1)' },
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
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 30px rgba(0, 158, 89, 0.4)' },
          '100%': { transform: 'scale(1)' },
        },
        meshFloat: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(30px, -20px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 15px) scale(0.95)' },
        },
        pulseGreen: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      // ============================================
      // SPACING
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
