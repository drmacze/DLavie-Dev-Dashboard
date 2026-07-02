import { useState } from 'react'
import { AlertTriangle, Copy, Check, RefreshCw, ExternalLink, Database } from 'lucide-react'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { copyToClipboard } from '@/lib/api'

type Props = {
  tableName: string
  sql: string
  onRetry?: () => void
  /** Optional explanation shown above the SQL block */
  description?: string
}

const SUPABASE_DASHBOARD_URL =
  'https://supabase.com/dashboard/project/dlbayuearegnpmgbxgcf/sql/new'

export function SetupRequired({ tableName, sql, onRetry, description }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await copyToClipboard(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card padding="none" className="overflow-hidden animate-fade-in-up">
      {/* Top warning band */}
      <div className="flex items-center gap-3 p-4 bg-amber-500/10 border-b border-amber-500/20">
        <div className="h-9 w-9 rounded-btn border border-amber-500/30 bg-amber-500/10 flex items-center justify-center shrink-0">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-400" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">
            Tabel <code className="font-mono text-amber-400">{tableName}</code> belum ada di database
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            Modul ini memerlukan tabel Supabase. Jalankan SQL di bawah di SQL Editor.
          </p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {description && (
          <p className="text-sm text-text-muted leading-relaxed">{description}</p>
        )}

        {/* Instructions */}
        <div className="flex items-start gap-2.5 text-xs text-text-muted">
          <Database className="h-4 w-4 shrink-0 mt-0.5 text-accent-cyan" />
          <p>
            Buka <span className="text-text-primary font-medium">Supabase Dashboard</span> →{' '}
            <span className="font-mono">SQL Editor</span> → New query → paste SQL → Run.
          </p>
        </div>

        {/* SQL code block */}
        <div className="relative">
          <div className="flex items-center justify-between px-3 py-2 bg-black border border-border rounded-t-input">
            <span className="text-[10px] uppercase tracking-widest2 text-text-dim font-mono">
              SQL
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium text-text-muted hover:text-accent-cyan hover:bg-accent-cyan/5 transition-colors"
              aria-label="Copy SQL"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-success" />
                  <span className="text-success">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy SQL
                </>
              )}
            </button>
          </div>
          <pre className="bg-black border border-t-0 border-border rounded-b-input p-3 overflow-x-auto text-xs font-mono text-text-secondary leading-relaxed max-h-80">
{sql}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          {onRetry && (
            <Button variant="outline" size="md" onClick={onRetry} className="flex-1">
              <RefreshCw className="h-3.5 w-3.5" />
              Coba Lagi
            </Button>
          )}
          <a
            href={SUPABASE_DASHBOARD_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-btn bg-accent-cyan text-black font-semibold text-sm hover:bg-accent-cyan-hover transition-colors flex-1"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka Supabase Dashboard
          </a>
        </div>
      </div>
    </Card>
  )
}

/**
 * Detect whether a Supabase error indicates a missing table (graceful degradation trigger).
 * Checks common PostgREST error signals: schema cache miss, relation does not exist, 404.
 */
export function isMissingTableError(error: unknown): boolean {
  if (!error) return false
  const e = error as { code?: string; message?: string; status?: number }
  const msg = (e.message ?? '').toLowerCase()
  return (
    e.code === 'PGRST205' || // schema cache miss
    e.code === '42P01' || // undefined_table
    e.status === 404 ||
    msg.includes('could not find the table') ||
    msg.includes('relation') && msg.includes('does not exist') ||
    msg.includes('schema cache')
  )
}
