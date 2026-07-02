import type { LucideIcon } from 'lucide-react'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { AnimatedCounter } from '@/components/AnimatedCounter'

type Accent = 'cyan' | 'violet' | 'green' | 'amber'

type StatCardProps = {
  label: string
  /** Numeric value (preferred — enables count-up). Pass a string only for non-numeric displays. */
  value: number | string
  hint?: string
  icon: LucideIcon
  accent?: Accent
  loading?: boolean
  /** Optional trend. Positive renders green up-arrow, negative renders red down-arrow. */
  trend?: number
  /** Suffix appended to the counter (e.g. "%", "+"). */
  suffix?: string
  prefix?: string
  decimals?: number
}

const accentStyles: Record<Accent, { bar: string; iconBg: string; iconText: string; glow: string }> = {
  cyan: {
    bar: 'bg-accent-cyan',
    iconBg: 'bg-accent-cyan/10 border-accent-cyan/20',
    iconText: 'text-accent-cyan',
    glow: 'group-hover:shadow-[0_8px_24px_rgba(34,211,238,0.08)]',
  },
  violet: {
    bar: 'bg-accent-violet',
    iconBg: 'bg-accent-violet/10 border-accent-violet/20',
    iconText: 'text-accent-violet',
    glow: 'group-hover:shadow-[0_8px_24px_rgba(129,140,248,0.08)]',
  },
  green: {
    bar: 'bg-success',
    iconBg: 'bg-success/10 border-success/20',
    iconText: 'text-success',
    glow: 'group-hover:shadow-[0_8px_24px_rgba(52,211,153,0.08)]',
  },
  amber: {
    bar: 'bg-accent-amber',
    iconBg: 'bg-accent-amber/10 border-accent-amber/20',
    iconText: 'text-accent-amber',
    glow: 'group-hover:shadow-[0_8px_24px_rgba(251,191,36,0.08)]',
  },
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'cyan',
  loading = false,
  trend,
  suffix,
  prefix,
  decimals,
}: StatCardProps) {
  const a = accentStyles[accent]
  const numericValue = typeof value === 'number' ? value : Number(value)
  const isNumeric = typeof value === 'number' || (!Number.isNaN(numericValue) && value !== '')

  return (
    <div
      className={`group relative bg-bg-card border border-border rounded-card p-5 overflow-hidden stat-sheen transition-all duration-200 hover:border-border-hover hover:-translate-y-0.5 ${a.glow}`}
    >
      {/* Left accent bar */}
      <span
        className={`absolute left-0 top-0 bottom-0 w-[3px] ${a.bar} opacity-70 group-hover:opacity-100 transition-opacity`}
        aria-hidden="true"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-widest2 truncate">
            {label}
          </p>

          <div className="mt-2 text-[28px] leading-none font-bold tracking-tightest text-text-primary font-mono tabular-nums">
            {loading ? (
              <div className="h-8 w-24 rounded-input shimmer" />
            ) : isNumeric ? (
              <AnimatedCounter
                value={numericValue}
                suffix={suffix}
                prefix={prefix}
                decimals={decimals}
              />
            ) : (
              value
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {trend !== undefined && !loading && (
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                  trend >= 0 ? 'text-success' : 'text-danger'
                }`}
              >
                {trend >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
                )}
                {Math.abs(trend).toFixed(1)}%
              </span>
            )}
            {hint && <p className="text-xs text-text-dim truncate">{hint}</p>}
          </div>
        </div>

        <div
          className={`shrink-0 h-11 w-11 rounded-btn border flex items-center justify-center ${a.iconBg} ${a.iconText} transition-transform duration-200 group-hover:scale-105`}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
      </div>
    </div>
  )
}
