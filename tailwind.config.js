/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Grok-inspired palette
        bg: {
          base: '#000000',
          card: '#0A0A0A',
          hover: '#111111',
        },
        border: {
          DEFAULT: '#1F2937',
          subtle: '#161616',
        },
        text: {
          primary: '#FFFFFF',
          muted: '#6B7280',
          dim: '#4B5563',
        },
        accent: {
          cyan: '#22D3EE',
          'cyan-hover': '#06B6D4',
          violet: '#818CF8',
          'violet-hover': '#6366F1',
        },
        danger: {
          DEFAULT: '#EF4444',
          muted: '#7F1D1D',
        },
        success: {
          DEFAULT: '#10B981',
          muted: '#064E3B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.02em',
        widest2: '0.05em',
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
        input: '6px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
    },
  },
  plugins: [],
}
