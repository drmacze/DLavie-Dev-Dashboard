import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  subtitle?: string
  /** Optional call-to-action rendered below the copy */
  action?: ReactNode
  /** Accent color for the icon ring. */
  accent?: 'cyan' | 'violet' | 'green' | 'amber'
  className?: string
}

const accentMap = {
  cyan: {
    ring: 'border-accent-cyan/20 bg-accent-cyan/5',
    icon: 'text-accent-cyan',
  },
  violet: {
    ring: 'border-accent-violet/20 bg-accent-violet/5',
    icon: 'text-accent-violet',
  },
  green: {
    ring: 'border-success/20 bg-success/5',
    icon: 'text-success',
  },
  amber: {
    ring: 'border-accent-amber/20 bg-accent-amber/5',
    icon: 'text-accent-amber',
  },
} as const

/**
 * Friendly empty-state with a large icon, title, subtitle and optional CTA.
 */
export function EmptyState({
  icon: Icon,
  title,
  subtitle,
  action,
  accent = 'cyan',
  className = '',
}: EmptyStateProps) {
  const a = accentMap[accent]
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-12 px-4 animate-fade-in-up ${className}`}
    >
      <div
        className={`h-16 w-16 rounded-card border flex items-center justify-center mb-4 ${a.ring}`}
      >
        <Icon className={`h-7 w-7 ${a.icon}`} strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold tracking-tighter text-text-primary mb-1.5">{title}</h3>
      {subtitle && (
        <p className="text-sm text-text-muted leading-relaxed max-w-sm mb-5">{subtitle}</p>
      )}
      {action && <div className="animate-fade-in" style={{ animationDelay: '120ms' }}>{action}</div>}
    </div>
  )
}
