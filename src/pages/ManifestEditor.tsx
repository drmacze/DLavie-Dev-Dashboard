import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  FileText,
  Save,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Package,
  FileCode,
} from 'lucide-react'
import { Layout } from '@/components/Layout'
import { Card, CardHeader } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Modal'
import { SkeletonBlock } from '@/components/Skeleton'
import { EmptyState } from '@/components/EmptyState'
import { fetchManifest, formatBytes } from '@/lib/api'
import type { Manifest } from '@/lib/api'

export default function ManifestEditor() {
  const { data: manifest, isLoading, refetch, isFetching } = useQuery<Manifest>({
    queryKey: ['manifest', 'editor'],
    queryFn: fetchManifest,
  })

  const [text, setText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [collapsed, setCollapsed] = useState<{ patches: boolean; files: boolean }>({
    patches: false,
    files: false,
  })
  const [sortKey, setSortKey] = useState<'type' | 'size' | 'name'>('type')
  const taRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)

  // Populate textarea once manifest loads
  useEffect(() => {
    if (manifest) {
      setText(JSON.stringify(manifest, null, 2))
      setParseError(null)
    }
  }, [manifest])

  function handleTextChange(value: string) {
    setText(value)
    setSaved(false)
    try {
      JSON.parse(value)
      setParseError(null)
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'JSON tidak valid')
    }
  }

  // Tab key inserts two spaces instead of moving focus.
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = e.currentTarget
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = text.slice(0, start) + '  ' + text.slice(end)
      handleTextChange(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2
      })
    }
  }

  function handleScroll() {
    if (taRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = taRef.current.scrollTop
    }
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 4000)
  }

  const lineCount = text.split('\n').length
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1),
    [lineCount],
  )

  const files = manifest?.files ?? []
  const patches = manifest?.patches ?? []

  // Merge files + patches for a unified, sortable view.
  type Row = {
    kind: 'file' | 'patch'
    name: string
    type: string
    size: number
    sha?: string
  }
  const rows: Row[] = useMemo(() => {
    const all: Row[] = [
      ...files.map((f) => ({
        kind: 'file' as const,
        name: f.path,
        type: f.type,
        size: f.size ?? 0,
        sha: f.sha256,
      })),
      ...patches.map((p) => ({
        kind: 'patch' as const,
        name: p.version,
        type: 'patch',
        size: p.size ?? 0,
        sha: p.sha256,
      })),
    ]
    all.sort((a, b) => {
      if (sortKey === 'size') return b.size - a.size
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      // type: patches first, then by type alpha
      if (a.kind !== b.kind) return a.kind === 'patch' ? -1 : 1
      return a.type.localeCompare(b.type)
    })
    return all
  }, [files, patches, sortKey])

  const isValid = !parseError && text.length > 0

  return (
    <Layout
      title="Manifest Editor"
      description="Edit manifest.json launcher DLavie"
      breadcrumb={['Dashboard', 'Manifest Editor']}
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      }
    >
      {isLoading ? (
        <div className="space-y-4">
          <SkeletonBlock className="h-24 rounded-card" />
          <SkeletonBlock className="h-96 rounded-card" />
        </div>
      ) : (
        <>
          {/* Manifest summary header */}
          <Card className="mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryItem label="Version" value={manifest?.version ?? '—'} mono />
              <SummaryItem label="Package" value={manifest?.package ?? '—'} mono />
              <SummaryItem label="Target Activity" value={(manifest?.targetActivity as string) ?? '—'} mono />
              <SummaryItem label="Total Entries" value={`${files.length + patches.length} entri`} />
            </div>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            {/* JSON editor with line numbers */}
            <Card className="xl:col-span-3">
              <CardHeader
                title="JSON Editor"
                subtitle="Edit manifest dalam format JSON"
                action={
                  parseError ? (
                    <Badge variant="red">
                      <AlertCircle className="h-3 w-3" />
                      Invalid
                    </Badge>
                  ) : saved ? (
                    <Badge variant="green">
                      <CheckCircle2 className="h-3 w-3" />
                      Saved
                    </Badge>
                  ) : (
                    <Badge variant="green">Valid</Badge>
                  )
                }
              />

              {parseError && (
                <div className="flex items-start gap-2 mb-3 p-3 rounded-input bg-danger/10 border border-danger/30 text-xs text-danger animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="font-mono break-all">{parseError}</span>
                </div>
              )}

              {/* Editor: line-number gutter + textarea, synced scroll */}
              <div className="relative flex rounded-input border border-border overflow-hidden bg-black focus-within:border-accent-cyan transition-colors">
                <div
                  ref={gutterRef}
                  className="select-none overflow-hidden py-3 px-2 text-right text-xs font-mono leading-relaxed text-text-dim bg-bg-card border-r border-border"
                  style={{ minWidth: 44 }}
                  aria-hidden="true"
                >
                  {lineNumbers.map((n) => (
                    <div key={n}>{n}</div>
                  ))}
                </div>
                <textarea
                  ref={taRef}
                  value={text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onScroll={handleScroll}
                  spellCheck={false}
                  className="flex-1 h-[480px] resize-none py-3 px-3 bg-transparent font-mono text-xs leading-relaxed text-text-primary focus:outline-none scrollbar-none"
                  placeholder="Loading manifest…"
                />
              </div>

              <div className="flex items-center justify-between mt-4 gap-2">
                <p className="text-xs text-text-dim font-mono">
                  {text.length.toLocaleString('id-ID')} karakter · {lineCount} baris
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => manifest && setText(JSON.stringify(manifest, null, 2))}
                    disabled={!manifest}
                  >
                    Reset
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={!isValid}>
                    <Save className="h-3.5 w-3.5" />
                    Simpan
                  </Button>
                </div>
              </div>

              {saved && (
                <div className="mt-3 flex items-start gap-2 p-3 rounded-input bg-accent-amber/10 border border-accent-amber/30 text-xs text-accent-amber animate-fade-in-up">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Manifest akan diupdate di Phase 2 (butuh GitHub token dengan write access ke{' '}
                    <code className="font-mono">DLavie-Launcher-Data</code>).
                  </span>
                </div>
              )}
            </Card>

            {/* Files table */}
            <Card className="xl:col-span-2">
              <CardHeader
                title="File dalam Manifest"
                subtitle={`${files.length} file · ${patches.length} patch`}
                action={
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] uppercase tracking-widest2 text-text-dim hidden sm:inline">Sort</span>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as 'type' | 'size' | 'name')}
                      className="bg-bg-hover border border-border rounded-btn text-xs text-text-secondary px-2 py-1 focus:outline-none focus:border-accent-cyan"
                    >
                      <option value="type">Type</option>
                      <option value="size">Size</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                }
              />

              {rows.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="Tidak ada file"
                  subtitle="Belum ada entri file maupun patch di manifest."
                />
              ) : (
                <div className="space-y-1 max-h-[520px] overflow-y-auto -mr-2 pr-1">
                  {/* Patches group */}
                  <SectionToggle
                    label="Patches"
                    count={patches.length}
                    icon={Package}
                    open={!collapsed.patches}
                    onToggle={() => setCollapsed((c) => ({ ...c, patches: !c.patches }))}
                  />
                  {!collapsed.patches &&
                    rows
                      .filter((r) => r.kind === 'patch')
                      .map((r, i) => <RowItem key={`p-${i}`} row={r} />)}

                  {/* Files group */}
                  <div className="mt-2" />
                  <SectionToggle
                    label="Files"
                    count={files.length}
                    icon={FileCode}
                    open={!collapsed.files}
                    onToggle={() => setCollapsed((c) => ({ ...c, files: !c.files }))}
                  />
                  {!collapsed.files &&
                    rows
                      .filter((r) => r.kind === 'file')
                      .map((r, i) => <RowItem key={`f-${i}`} row={r} />)}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </Layout>
  )
}

function SectionToggle({
  label,
  count,
  icon: Icon,
  open,
  onToggle,
}: {
  label: string
  count: number
  icon: typeof Package
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-btn text-left hover:bg-bg-hover transition-colors group"
    >
      {open ? (
        <ChevronDown className="h-3.5 w-3.5 text-text-dim" strokeWidth={2.5} />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-text-dim" strokeWidth={2.5} />
      )}
      <Icon className="h-3.5 w-3.5 text-text-muted" strokeWidth={2} />
      <span className="text-[11px] uppercase tracking-widest2 font-medium text-text-secondary">{label}</span>
      <span className="text-[10px] text-text-dim font-mono">{count}</span>
    </button>
  )
}

function RowItem({
  row,
}: {
  row: { kind: 'file' | 'patch'; name: string; type: string; size: number; sha?: string }
}) {
  return (
    <div className="flex items-center gap-2 p-2 pl-7 rounded-input hover:bg-bg-hover transition-colors animate-fade-in">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-mono text-text-primary truncate">{row.name}</p>
        {row.sha && (
          <p className="text-[10px] font-mono text-text-dim truncate">{row.sha.slice(0, 16)}…</p>
        )}
      </div>
      <Badge variant={row.kind === 'patch' ? 'cyan' : 'gray'}>{row.type}</Badge>
      <span className="text-xs font-mono text-text-muted w-16 text-right shrink-0">
        {formatBytes(row.size)}
      </span>
    </div>
  )
}

function SummaryItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest2 text-text-dim mb-1">{label}</p>
      <p className={`text-sm text-text-primary truncate ${mono ? 'font-mono text-xs' : 'font-semibold'}`}>
        {value}
      </p>
    </div>
  )
}
