import type { Config } from 'tailwindcss';

/**
 * Theme mapped 1:1 from DESIGN.md §2 (Foundations/tokens).
 * Colors reference CSS custom properties defined per-theme in src/index.css
 * so `.dark`/`.light` class toggling (no runtime restyle) drives every value.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        card: 'var(--color-card)',
        'card-2': 'var(--color-card-2)',
        border: {
          DEFAULT: 'var(--color-border)',
          strong: 'var(--color-border-strong)',
        },
        text: {
          DEFAULT: 'var(--color-text)',
          muted: 'var(--color-text-muted)',
          subtle: 'var(--color-text-subtle)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          ink: 'var(--color-accent-ink)',
          soft: 'var(--color-accent-soft)',
        },
        info: { DEFAULT: 'var(--color-info)', soft: 'var(--color-info-soft)' },
        teal: { DEFAULT: 'var(--color-teal)', soft: 'var(--color-teal-soft)' },
        success: { DEFAULT: 'var(--color-success)', soft: 'var(--color-success-soft)' },
        warning: { DEFAULT: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
        danger: { DEFAULT: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        full: '999px',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['34px', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '1.2', fontWeight: '600' }],
        h2: ['18px', { lineHeight: '1.2', fontWeight: '600' }],
        h3: ['15px', { lineHeight: '1.2', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.5', fontWeight: '500' }],
        overline: ['11px', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0.06em' }],
      },
      boxShadow: {
        e1: '0 1px 2px rgba(20,30,50,.06)',
        e2: '0 4px 16px rgba(20,30,50,.08)',
        e3: '0 12px 32px rgba(20,30,50,.12)',
        overlay: '0 8px 30px rgba(0,0,0,.45)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '260ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(.22,.61,.36,1)',
      },
      width: {
        sidebar: '240px',
        'sidebar-rail': '72px',
      },
    },
  },
  plugins: [],
} satisfies Config;
