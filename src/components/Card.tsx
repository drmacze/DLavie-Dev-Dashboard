import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingMap = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4 sm:p-6',
  lg: 'p-6 sm:p-8',
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div
      className={`bg-bg-card border border-border rounded-card ${paddingMap[padding]} ${className}`}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-base font-bold tracking-tightest text-text-primary">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
