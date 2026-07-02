type BaseProps = {
  className?: string
}

/**
 * Skeleton primitive with shimmer sweep.
 * Use the convenience wrappers below for common shapes.
 */
function SkeletonBase({ className = '' }: BaseProps) {
  return <div className={`shimmer rounded-input ${className}`} aria-hidden="true" />
}

export function SkeletonLine({ className = '' }: BaseProps) {
  return <SkeletonBase className={`h-3.5 ${className}`} />
}

// More flexible block: pass explicit height + width via className.
export function SkeletonBlock({ className = '' }: BaseProps) {
  return <SkeletonBase className={className} />
}

export function SkeletonCircle({ className = '' }: BaseProps) {
  return <SkeletonBase className={`rounded-full ${className}`} />
}

/** A full stat-card skeleton matching StatCard layout. */
export function SkeletonCard() {
  return (
    <div className="bg-bg-card border border-border rounded-card p-5 overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <SkeletonBase className="h-3 w-20" />
          <SkeletonBase className="h-8 w-24" />
          <SkeletonBase className="h-3 w-16" />
        </div>
        <SkeletonBase className="h-10 w-10 rounded-btn shrink-0" />
      </div>
    </div>
  )
}

/** A list-row skeleton (used in activity timelines / tables). */
export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3">
      <SkeletonBase className="h-2 w-2 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBase className="h-3.5 w-1/3" />
        <SkeletonBase className="h-3 w-1/2" />
      </div>
      <SkeletonBase className="h-3 w-16 shrink-0" />
    </div>
  )
}

/** A feed-card skeleton. */
export function SkeletonFeedCard() {
  return (
    <div className="bg-bg-card border border-border rounded-card p-5 overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <SkeletonBase className="h-5 w-14 rounded-pill" />
        <SkeletonBase className="h-5 w-16 rounded-pill" />
        <SkeletonBase className="h-3 w-20" />
      </div>
      <SkeletonBase className="h-5 w-2/3 mb-2" />
      <SkeletonBase className="h-3.5 w-full mb-1.5" />
      <SkeletonBase className="h-3.5 w-4/5" />
    </div>
  )
}

/** A chart-area skeleton. */
export function SkeletonChart({ className = '' }: BaseProps) {
  return <SkeletonBase className={`h-64 w-full rounded-input ${className}`} />
}
