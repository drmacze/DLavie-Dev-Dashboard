import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/Button'

type ModalProps = {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm?: () => void
  loading?: boolean
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = 'Batal',
  onConfirm,
  loading = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, loading])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => !loading && onClose()}
    >
      <div
        className="w-full max-w-md bg-bg-card border border-border rounded-card animate-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold tracking-tightest text-text-primary">{title}</h2>
            {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-text-dim hover:text-text-primary transition-colors disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
        {(onConfirm || confirmLabel) && (
          <div className="flex justify-end gap-2 p-5 border-t border-border">
            <Button variant="ghost" size="md" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </Button>
            {onConfirm && confirmLabel && (
              <Button variant="primary" size="md" onClick={onConfirm} loading={loading}>
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type BadgeProps = {
  children: ReactNode
  variant?: 'cyan' | 'violet' | 'gray' | 'green' | 'red' | 'amber'
}

export function Badge({ children, variant = 'gray' }: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    cyan: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/20',
    violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20',
    gray: 'bg-bg-hover text-text-muted border-border',
    green: 'bg-success/10 text-success border-success/20',
    red: 'bg-danger/10 text-danger border-danger/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest2 font-medium border ${styles[variant]}`}
    >
      {children}
    </span>
  )
}
