import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-xs text-text-dim">
        Menampilkan <span className="text-text-muted font-mono">{from}</span>–
        <span className="text-text-muted font-mono">{to}</span> dari{' '}
        <span className="text-text-muted font-mono">{total}</span> entri
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 w-8 inline-flex items-center justify-center rounded-btn text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageRange(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-2 text-text-dim text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={[
                'h-8 min-w-8 px-2 inline-flex items-center justify-center rounded-btn text-xs font-medium font-mono transition-colors',
                p === page
                  ? 'bg-accent-cyan text-black'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-hover',
              ].join(' ')}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-8 w-8 inline-flex items-center justify-center rounded-btn text-text-muted hover:text-text-primary hover:bg-bg-hover disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

/** Compact page range: 1 … 4 [5] 6 … 12 */
function getPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}
