/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Refined premium palette (Linear/Vercel/Stripe inspired)
        bg: {
          base: '#000000',
          card: '#0A0A0A',
          hover: '#111111',
          active: '#1A1A1A',
        },
        border: {
          DEFAULT: '#1F2937',
          subtle: '#161616',
          hover: '#374151',
          focus: '#22D3EE',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#E5E7EB',
          muted: '#9CA3AF',
          dim: '#6B7280',
        },
        accent: {
          cyan: '#22D3EE',
          'cyan-hover': '#06B6D4',
          violet: '#818CF8',
          'violet-hover': '#6366F1',
          green: '#34D399',
          red: '#F87171',
          amber: '#FBBF24',
        },
        danger: {
          DEFAULT: '#F87171',
          muted: '#7F1D1D',
        },
        success: {
          DEFAULT: '#34D399',
          muted: '#064E3B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.03em',
        tighter: '-0.02em',
        widest2: '0.05em',
      },
      borderRadius: {
        card: '16px',
        btn: '10px',
        input: '8px',
        pill: '999px',
        modal: '20px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.3)',
        modal: '0 20px 60px rgba(0,0,0,0.5)',
        dropdown: '0 10px 30px rgba(0,0,0,0.4)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      keyframes: {
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(24px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        'check-pop': {
          '0%': { opacity: '0', transform: 'scale(0)' },
          '60%': { opacity: '1', transform: 'scale(1.15)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'confetti-fall': {
          '0%': { opacity: '1', transform: 'translateY(0) rotate(0deg)' },
          '100%': { opacity: '0', transform: 'translateY(120px) rotate(360deg)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 400ms ease-out both',
        'fade-in': 'fade-in 300ms ease-out both',
        'scale-in': 'scale-in 300ms cubic-bezier(0.16,1,0.3,1) both',
        'slide-in-right': 'slide-in-right 300ms ease-out both',
        'slide-in-left': 'slide-in-left 200ms ease-out both',
        shimmer: 'shimmer 1.5s infinite',
        shake: 'shake 400ms ease-in-out',
        'check-pop': 'check-pop 500ms cubic-bezier(0.16,1,0.3,1) both',
        'confetti-fall': 'confetti-fall 1s ease-in forwards',
      },
    },
  },
  plugins: [],
}
