/**
 * 세종페이 · Design System v0.2
 * Tailwind preset — drop into your project root and extend from it.
 *
 * Usage (in your app's tailwind.config.js):
 *   const sejong = require('./tailwind.config.js');
 *   module.exports = { presets: [sejong], content: [...] };
 *
 * Conventions:
 *   - All tokens are exposed BOTH as Tailwind classes (e.g. bg-primary-500)
 *     and as CSS variables (e.g. var(--color-primary-500)) via tokens.css,
 *     so designers can theme at runtime (light/dark).
 *   - Spacing is on a 4px base. Radius scale matches container sizes.
 *   - Motion durations are named after intent, not duration.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // toggle dark theme by adding `.dark` to <html>

  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      // ─────────────────────────── COLORS ───────────────────────────
      colors: {
        // Primary — softened crimson (Korea University inspired, dialed back)
        primary: {
          50:  '#FCF2F4',
          100: '#F8E1E6',
          200: '#EFBAC4',
          300: '#E08294',
          400: '#C84E68',
          500: '#A91D3A', // ★ base / CTA
          600: '#8B0029', // hover / active
          700: '#6E0020',
          800: '#530018',
          900: '#3A0010',
        },

        // Secondary — warm beige (campus warmth)
        beige: {
          50:  '#FBF7F0',
          100: '#F5EDDF',
          200: '#EBDDC2',
          300: '#DDC79A',
          400: '#C9AC73',
          500: '#B08F54',
          600: '#8A6E3F',
          700: '#65512E',
          800: '#43361E',
          900: '#231C10',
        },

        // Accent — cashback green (DO NOT reuse for generic "success")
        cash: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },

        // Status — semantic only
        success: { DEFAULT: '#10B981', bg: '#ECFDF5', fg: '#047857' },
        warning: { DEFAULT: '#F59E0B', bg: '#FFFBEB', fg: '#B45309' },
        error:   { DEFAULT: '#EF4444', bg: '#FEF2F2', fg: '#B91C1C' },
        info:    { DEFAULT: '#3B82F6', bg: '#EFF6FF', fg: '#1D4ED8' },

        // Ink — 6-step neutral
        ink: {
          50:  '#F7F7F8',
          100: '#EFEFF2',
          300: '#D1D2D8',
          500: '#8B8C95',
          700: '#4A4B53',
          900: '#1A1B20',
        },

        // Semantic surface tokens — reference these in components.
        // They re-map automatically in dark mode via tokens.css.
        surface: {
          page:    'var(--surface-page)',
          card:    'var(--surface-card)',
          sunken:  'var(--surface-sunken)',
          raised:  'var(--surface-raised)',
          inverse: 'var(--surface-inverse)',
        },
        content: {
          primary:   'var(--content-primary)',
          secondary: 'var(--content-secondary)',
          muted:     'var(--content-muted)',
          inverse:   'var(--content-inverse)',
          brand:     'var(--content-brand)',
        },
        border: {
          subtle:  'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong:  'var(--border-strong)',
        },
      },

      // ─────────────────────────── SPACING ───────────────────────────
      // 4px base scale. Named tokens piggyback on numeric ones.
      spacing: {
        0.5: '2px',
        1:   '4px',
        1.5: '6px',
        2:   '8px',
        3:   '12px',
        4:   '16px',
        5:   '20px',
        6:   '24px',
        7:   '28px',
        8:   '32px',
        10:  '40px',
        12:  '48px',
        14:  '56px',
        16:  '64px',
        20:  '80px',
        24:  '96px',
        // semantic
        'gutter':       '20px', // mobile screen edge gutter
        'gutter-lg':    '24px',
        'control-sm':   '36px',
        'control-md':   '44px', // ← min touch target
        'control-lg':   '56px',
      },

      // ─────────────────────────── RADIUS ───────────────────────────
      borderRadius: {
        none: '0',
        xs:  '4px',
        sm:  '6px',
        md:  '10px',  // input / sm button
        lg:  '12px',  // md button / chip
        xl:  '14px',  // lg button
        '2xl': '16px',
        '3xl': '20px', // card
        '4xl': '24px', // bottom sheet
        pill: '999px',
      },

      // ─────────────────────────── SHADOWS ───────────────────────────
      boxShadow: {
        card:  '0 1px 2px rgba(26,27,32,0.04), 0 6px 18px -8px rgba(26,27,32,0.10)',
        sheet: '0 -8px 32px -8px rgba(26,27,32,0.18)',
        pop:   '0 12px 36px -12px rgba(139,0,41,0.35)',
        focus: '0 0 0 4px rgba(169,29,58,0.20)',
        'focus-error': '0 0 0 4px rgba(239,68,68,0.20)',
      },

      // ─────────────────────────── TYPE ───────────────────────────
      fontSize: {
        // [size, { lineHeight, letterSpacing, fontWeight }]
        display:  ['44px', { lineHeight: '1.1',  letterSpacing: '-0.02em',  fontWeight: 700 }],
        h1:       ['32px', { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: 700 }],
        h2:       ['24px', { lineHeight: '1.3',  letterSpacing: '-0.01em',  fontWeight: 600 }],
        h3:       ['20px', { lineHeight: '1.35', fontWeight: 600 }],
        'body-l': ['17px', { lineHeight: '1.55', fontWeight: 500 }],
        body:     ['15px', { lineHeight: '1.55', fontWeight: 400 }],
        caption:  ['12px', { lineHeight: '1.4',  fontWeight: 500 }],
        // Money: paired with `tabular-nums` utility
        money:    ['52px', { lineHeight: '1',    letterSpacing: '-0.03em',  fontWeight: 700 }],
      },

      // ─────────────────────────── MOTION ───────────────────────────
      transitionDuration: {
        instant: '80ms',
        fast:    '140ms', // micro-interactions (hover, focus)
        base:    '200ms', // default UI transitions
        slow:    '320ms', // bottom sheets, dialogs
        slower:  '480ms', // celebratory (cashback confirm)
      },
      transitionTimingFunction: {
        // Named by intent
        'out-soft':  'cubic-bezier(0.22, 1, 0.36, 1)',     // ease-out, decelerate
        'in-soft':   'cubic-bezier(0.64, 0, 0.78, 0)',     // ease-in, accelerate
        'in-out':    'cubic-bezier(0.65, 0, 0.35, 1)',     // standard
        'spring':    'cubic-bezier(0.34, 1.56, 0.64, 1)',  // playful overshoot — celebratory only
      },
      keyframes: {
        'sheet-in':   { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        'fade-in':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-pop':  { '0%': { transform: 'scale(0.6)', opacity: '0' }, '60%': { transform: 'scale(1.08)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        'check-draw': { '0%': { strokeDashoffset: '40' }, '100%': { strokeDashoffset: '0' } },
        'ring-pulse': { '0%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.45)' }, '100%': { boxShadow: '0 0 0 24px rgba(16,185,129,0)' } },
        'coin-rise':  { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        'sheet-in':   'sheet-in 320ms cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':    'fade-in 200ms cubic-bezier(0.22,1,0.36,1) both',
        'scale-pop':  'scale-pop 480ms cubic-bezier(0.34,1.56,0.64,1) both',
        'check-draw': 'check-draw 320ms cubic-bezier(0.65,0,0.35,1) 200ms both',
        'ring-pulse': 'ring-pulse 800ms cubic-bezier(0.22,1,0.36,1) 200ms both',
        'coin-rise':  'coin-rise 320ms cubic-bezier(0.22,1,0.36,1) 480ms both',
      },
    },
  },

  plugins: [],
};
