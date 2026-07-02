import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  accent?: 'cyan' | 'violet'
  loading?: boolean
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'cyan',
  loading = false,
}: StatCardProps) {
  const accentText = accent === 'cyan' ? 'text-accent-cyan' : 'text-accent-violet'
  const accentBg =
    accent === 'cyan' ? 'bg-accent-cyan/10 border-accent-cyan/20' : 'bg-accent-violet/10 border-accent-violet/20'

  return (
    <div className="bg-bg-card border border-border rounded-card p-5 transition-colors duration-200 hover:border-text-dim">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-muted uppercase tracking-widest2 truncate">
            {label}
          </p>
          <div className="mt-2 text-3xl font-bold tracking-tightest text-text-primary">
            {loading ? (
              <div className="h-9 w-20 rounded-input bg-bg-hover animate-pulse" />
            ) : (
              value
            )}
          </div>
          {hint && <p className="mt-1 text-xs text-text-dim">{hint}</p>}
        </div>
        <div
          className={`shrink-0 h-10 w-10 rounded-btn border flex items-center justify-center ${accentBg} ${accentText}`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
