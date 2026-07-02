import type { ReactNode } from 'react'

type PageTransitionProps = {
  children: ReactNode
  /** Animation delay in ms (useful for staggering after a header) */
  delay?: number
  className?: string
}

/**
 * Wrap page content with a fade + slide-up entrance.
 * Uses CSS keyframe `fadeInUp` (400ms ease-out) defined in index.css.
 * Re-mounts the animation whenever the `key` of the wrapper changes
 * (route changes supply a new key via App.tsx).
 */
export function PageTransition({ children, delay = 0, className = '' }: PageTransitionProps) {
  return (
    <div
      className={`page-enter ${className}`}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
