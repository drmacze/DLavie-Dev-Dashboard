import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  loading?: boolean
  children: ReactNode
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-accent-cyan text-black hover:bg-accent-cyan-hover font-semibold',
  secondary:
    'bg-accent-violet/15 text-accent-violet border border-accent-violet/30 hover:bg-accent-violet/25',
  ghost: 'bg-transparent text-text-muted hover:text-text-primary hover:bg-bg-hover',
  danger: 'bg-danger text-white hover:bg-red-600 font-semibold',
  outline:
    'bg-transparent text-text-primary border border-border hover:border-accent-cyan hover:text-accent-cyan',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, children, className = '', ...rest },
  ref,
) {
  const cls = [
    'inline-flex items-center justify-center gap-2 rounded-btn transition-colors duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-black',
    'disabled:opacity-50 disabled:pointer-events-none',
    variantStyles[variant],
    sizeStyles[size],
    className,
  ].join(' ')

  return (
    <button ref={ref} disabled={disabled || loading} className={cls} {...rest}>
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
})
